use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::Duration;

/// Compute the RMS energy of a frame of audio samples.
pub fn frame_energy(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum_sq: f32 = samples.iter().map(|&s| s * s).sum();
    (sum_sq / samples.len() as f32).sqrt()
}

/// Compute an adaptive energy threshold from collected noise-floor samples.
///
/// The threshold is set to twice the maximum noise energy, with a floor of
/// 0.01 to avoid false triggering on near-silent noise.
pub fn adapt_threshold(noise_samples: &[f32]) -> f32 {
    if noise_samples.is_empty() {
        return 0.01;
    }
    let max_noise = noise_samples.iter().copied().fold(0.0_f32, f32::max);
    (max_noise * 2.0).max(0.01)
}

/// Encode raw i16 PCM samples into a WAV file (RIFF/WAVE, mono, 16-bit).
///
/// This function is kept from the original implementation.
pub fn encode_wav(samples: &[i16], sample_rate: u32) -> Vec<u8> {
    let channels: u16 = 1;
    let bits_per_sample: u16 = 16;
    let bytes_per_sample = bits_per_sample / 8;
    let byte_rate = sample_rate * channels as u32 * bytes_per_sample as u32;
    let block_align = channels * bytes_per_sample;
    let data_size = samples.len() as u32 * bytes_per_sample as u32;
    let file_size = 44 + data_size;

    let mut buf = Vec::with_capacity(file_size as usize);

    buf.extend_from_slice(b"RIFF");
    buf.extend_from_slice(&(file_size - 8).to_le_bytes());
    buf.extend_from_slice(b"WAVE");

    buf.extend_from_slice(b"fmt ");
    buf.extend_from_slice(&16u32.to_le_bytes());
    buf.extend_from_slice(&1u16.to_le_bytes()); // PCM
    buf.extend_from_slice(&channels.to_le_bytes());
    buf.extend_from_slice(&sample_rate.to_le_bytes());
    buf.extend_from_slice(&byte_rate.to_le_bytes());
    buf.extend_from_slice(&block_align.to_le_bytes());
    buf.extend_from_slice(&bits_per_sample.to_le_bytes());

    buf.extend_from_slice(b"data");
    buf.extend_from_slice(&data_size.to_le_bytes());

    for &sample in samples {
        buf.extend_from_slice(&sample.to_le_bytes());
    }

    buf
}

/// VoiceEngine provides energy-based VAD (Voice Activity Detection) and
/// continuous recording from the default input device.
///
/// Call `record_until_silence` to capture audio until the speaker pauses
/// for a configurable silence timeout.  The returned PCM data is in i16
/// format ready for WAV encoding or STT API submission.
pub struct VoiceEngine {
    #[allow(dead_code)]
    sample_rate: u32,
    #[allow(dead_code)]
    channels: u16,
    #[allow(dead_code)]
    interrupt: Arc<AtomicBool>,
}

impl VoiceEngine {
    pub fn new() -> Self {
        VoiceEngine {
            sample_rate: 44100,
            channels: 1,
            interrupt: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Record from the default microphone until silence is detected (or an
    /// external cancel/interrupt signal is received).
    ///
    /// # Algorithm
    ///
    /// 1. Open the default cpal input device and start a capture stream.
    /// 2. Collect ~500 ms of noise-floor energy samples.
    /// 3. Compute an adaptive energy threshold
    ///    (`max_noise * 2.0`, minimum `0.01`).
    /// 4. After speech is first detected, count consecutive silent frames.
    /// 5. When `silence_timeout_ms` of continuous silence has elapsed, or
    ///    `max_duration_secs` of total audio has been captured, recording
    ///    stops.
    /// 6. Convert f32 samples to i16 and return `(samples, sample_rate)`.
    ///
    /// # Errors
    ///
    /// Returns an error if no input device is available, the audio stream
    /// cannot be started, or no speech is detected before the max duration
    /// is reached.
    pub fn record_until_silence(
        &self,
        interrupt: Arc<AtomicBool>,
        silence_timeout_ms: u64,
        max_duration_secs: u64,
    ) -> Result<(Vec<i16>, u32), String> {
        // ── 1. Default input device ───────────────────────────────────
        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or_else(|| "没有找到麦克风设备".to_string())?;
        eprintln!(
            "VoiceEngine: using device {}",
            device.name().unwrap_or_else(|_| "<unknown>".into())
        );

        let config = device
            .default_input_config()
            .map_err(|e| format!("获取默认音频配置失败: {}", e))?;
        let sample_rate = config.sample_rate().0;
        eprintln!(
            "VoiceEngine: {} Hz, {} channels",
            sample_rate,
            config.channels()
        );

        // ── 2. Shared buffer & stream ─────────────────────────────────
        let all_samples: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
        let stream_samples = all_samples.clone();

        let stream = device
            .build_input_stream(
                &config.config(),
                move |data: &[f32], _: &_| {
                    if let Ok(mut buf) = stream_samples.lock() {
                        buf.extend_from_slice(data);
                    }
                },
                |err| eprintln!("VoiceEngine: stream error: {}", err),
                None,
            )
            .map_err(|e| format!("创建音频流失败: {}", e))?;

        stream
            .play()
            .map_err(|e| format!("启动音频流失败: {}", e))?;

        // ── 3. VAD dimensions ─────────────────────────────────────────
        let frame_size = (sample_rate as f32 * 0.03) as usize; // 30 ms
        let noise_collect_frames = (500.0 / 30.0) as usize; // ~500 ms
        let silence_timeout_frames =
            (silence_timeout_ms as f32 / 30.0).ceil() as usize;
        let max_frames = (max_duration_secs as f32 / 0.03) as usize;

        eprintln!(
            "VoiceEngine: frame={} noise_frames={} silence_frames={} max_frames={}",
            frame_size, noise_collect_frames, silence_timeout_frames, max_frames,
        );

        // ── 4. VAD loop ───────────────────────────────────────────────
        let mut noise_floor: Vec<f32> = Vec::with_capacity(noise_collect_frames);
        let mut noise_frames_collected = 0;
        let mut threshold: f32 = 0.0;
        let mut speech_detected = false;
        let mut continuous_silence_frames = 0;
        let mut total_frames = 0;

        // Accumulated f32 samples (includes noise-floor region for context)
        let mut collected_f32: Vec<f32> = Vec::new();

        loop {
            // External cancellation
            if interrupt.load(Ordering::Relaxed) {
                eprintln!("VoiceEngine: interrupted by caller");
                break;
            }

            // Max duration guard
            if total_frames >= max_frames {
                eprintln!("VoiceEngine: max duration ({} sec)", max_duration_secs);
                break;
            }

            // Block until at least one frame is available
            let frame: Vec<f32> = {
                let mut guard = all_samples
                    .lock()
                    .map_err(|e| format!("锁定音频缓冲区失败: {}", e))?;
                if guard.len() < frame_size {
                    drop(guard);
                    std::thread::sleep(Duration::from_millis(10));
                    continue;
                }
                guard.drain(0..frame_size).collect()
            };

            collected_f32.extend_from_slice(&frame);
            total_frames += 1;

            let energy = frame_energy(&frame);

            // ── Noise floor (first ~500 ms) ───────────────────────────
            if noise_frames_collected < noise_collect_frames {
                noise_floor.push(energy);
                noise_frames_collected += 1;
                if noise_frames_collected >= noise_collect_frames {
                    threshold = adapt_threshold(&noise_floor);
                    eprintln!("VoiceEngine: threshold={:.6}", threshold);
                }
                continue;
            }

            // ── Speech / silence decision ─────────────────────────────
            if energy > threshold {
                if !speech_detected {
                    eprintln!("VoiceEngine: speech detected");
                }
                speech_detected = true;
                continuous_silence_frames = 0;
            } else if speech_detected {
                continuous_silence_frames += 1;
                if continuous_silence_frames >= silence_timeout_frames {
                    eprintln!(
                        "VoiceEngine: silence timeout ({} frames of silence)",
                        continuous_silence_frames,
                    );
                    break;
                }
            }
        }

        // ── 5. Stop the stream before touching data ───────────────────
        drop(stream);

        if !speech_detected {
            return Err("未检测到语音输入".into());
        }

        eprintln!(
            "VoiceEngine: done, {} frames (~{} ms)",
            total_frames,
            total_frames * 30,
        );

        // ── 6. f32 → i16 conversion ───────────────────────────────────
        let result: Vec<i16> = collected_f32
            .iter()
            .map(|&s| (s * i16::MAX as f32).clamp(-32768.0, 32767.0) as i16)
            .collect();

        Ok((result, sample_rate))
    }
}
