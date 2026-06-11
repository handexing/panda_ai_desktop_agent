/// A recursive character text splitter inspired by LangChain's.
/// Splits text recursively on separators to produce chunks of target size.
pub struct TextSplitter {
    pub chunk_size: usize,
    pub chunk_overlap: usize,
    pub separators: Vec<String>,
}

impl Default for TextSplitter {
    fn default() -> Self {
        Self {
            chunk_size: 500,
            chunk_overlap: 50,
            separators: vec![
                "\n\n".into(),
                "\n".into(),
                "。".into(),
                ". ".into(),
                " ".into(),
                "".into(),
            ],
        }
    }
}

impl TextSplitter {
    pub fn new(chunk_size: usize, chunk_overlap: usize) -> Self {
        Self {
            chunk_size,
            chunk_overlap,
            ..Default::default()
        }
    }

    /// Split text into chunks.
    pub fn split(&self, text: &str) -> Vec<String> {
        if text.len() <= self.chunk_size {
            return vec![text.to_string()];
        }
        self.split_text(text, &self.separators)
    }

    fn split_text(&self, text: &str, separators: &[String]) -> Vec<String> {
        if separators.is_empty() {
            return vec![text.to_string()];
        }

        let separator = &separators[0];
        let mut chunks = Vec::new();

        if separator.is_empty() {
            // Character-level split (respects char boundaries)
            let mut current = String::new();
            for c in text.chars() {
                if current.len() + c.len_utf8() > self.chunk_size && !current.is_empty() {
                    chunks.push(current);
                    current = String::new();
                }
                current.push(c);
            }
            if !current.is_empty() {
                chunks.push(current);
            }
            return chunks;
        }

        let parts: Vec<&str> = text.split(separator).collect();

        // If splitting didn't produce multiple parts, try next separator
        if parts.len() == 1 {
            return self.split_text(text, &separators[1..]);
        }

        // Build chunks from parts
        let mut current = String::new();
        for part in parts {
            if current.len() + separator.len() + part.len() > self.chunk_size && !current.is_empty() {
                chunks.push(current.trim().to_string());
                // Keep overlap: take last chunk_overlap chars (respecting char boundaries)
                let char_count = current.chars().count();
                let keep = char_count.saturating_sub(self.chunk_overlap);
                let overlap_start = current.char_indices().nth(keep).map(|(i, _)| i).unwrap_or(0);
                current = current[overlap_start..].to_string();
                current.push_str(separator);
                current.push_str(part);
            } else {
                if !current.is_empty() {
                    current.push_str(separator);
                }
                current.push_str(part);
            }
        }
        if !current.is_empty() {
            chunks.push(current.trim().to_string());
        }

        chunks
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_split() {
        let splitter = TextSplitter::new(100, 10);
        let text = "A".repeat(250);
        let chunks = splitter.split(&text);
        assert!(chunks.len() >= 2);
        for chunk in &chunks {
            assert!(chunk.len() <= 100);
        }
    }

    #[test]
    fn test_short_text() {
        let splitter = TextSplitter::new(500, 50);
        let chunks = splitter.split("Hello world");
        assert_eq!(chunks.len(), 1);
    }

    #[test]
    fn test_chinese_split() {
        let splitter = TextSplitter::new(50, 5);
        let text = "今天天气很好。我们去公园散步。然后回家做饭。晚上看电影。";
        let chunks = splitter.split(text);
        assert!(chunks.len() >= 2);
    }
}
