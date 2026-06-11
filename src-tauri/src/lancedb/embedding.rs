use anyhow::Result;

/// Generate embedding vector for a single text string.
/// Uses OpenAI-compatible `/v1/embeddings` endpoint.
pub async fn generate_embedding(
    base_url: &str,
    api_key: &str,
    model: &str,
    text: &str,
) -> Result<Vec<f32>> {
    let url = format!("{}/v1/embeddings", base_url.trim_end_matches('/'));
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "model": model,
        "input": text,
    });

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await?;

    let status = response.status();
    if !status.is_success() {
        let err = response.text().await.unwrap_or_default();
        anyhow::bail!("Embedding API error ({}): {}", status, err);
    }

    #[derive(serde::Deserialize)]
    struct EmbeddingResponse {
        data: Vec<EmbeddingData>,
    }
    #[derive(serde::Deserialize)]
    struct EmbeddingData {
        embedding: Vec<f32>,
    }

    let result: EmbeddingResponse = response.json().await?;
    result.data
        .first()
        .map(|d| d.embedding.clone())
        .ok_or_else(|| anyhow::anyhow!("No embedding data returned"))
}

/// Generate embeddings for multiple texts in batch.
pub async fn generate_embeddings(
    base_url: &str,
    api_key: &str,
    model: &str,
    texts: &[&str],
) -> Result<Vec<Vec<f32>>> {
    let url = format!("{}/v1/embeddings", base_url.trim_end_matches('/'));
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "model": model,
        "input": texts,
    });

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await?;

    let status = response.status();
    if !status.is_success() {
        let err = response.text().await.unwrap_or_default();
        anyhow::bail!("Embedding API error ({}): {}", status, err);
    }

    #[derive(serde::Deserialize)]
    struct BatchEmbeddingResponse {
        data: Vec<BatchEmbeddingData>,
    }
    #[derive(serde::Deserialize)]
    struct BatchEmbeddingData {
        index: usize,
        embedding: Vec<f32>,
    }

    let mut result: BatchEmbeddingResponse = response.json().await?;
    result.data.sort_by_key(|d| d.index);
    Ok(result.data.into_iter().map(|d| d.embedding).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_generate_embedding() {
        let base_url = "https://api.openai.com";
        let _url = format!("{}/v1/embeddings", base_url.trim_end_matches('/'));
        assert_eq!(_url, "https://api.openai.com/v1/embeddings");
    }
}
