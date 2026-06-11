use anyhow::Result;
use futures::TryStreamExt;
use lancedb::{connect, Connection, Table};
use lancedb::query::{ExecutableQuery, QueryBase};
use arrow_array::{Array, RecordBatch, Float32Array, FixedSizeListArray, StringArray, Int32Array, ArrayRef, RecordBatchIterator};
use arrow_schema::{Schema, Field, DataType, SchemaRef};
use std::sync::Arc;

/// A knowledge chunk stored in LanceDB.
#[derive(Debug, Clone)]
pub struct Chunk {
    pub file_name: String,
    pub chunk_index: i32,
    pub text: String,
    pub embedding: Vec<f32>,
}

/// Knowledge store backed by LanceDB.
pub struct KnowledgeStore {
    conn: Connection,
}

impl KnowledgeStore {
    /// Open (or create) the LanceDB database at `db_path`.
    pub async fn open(db_path: &str) -> Result<Self> {
        let conn = connect(db_path).execute().await?;
        Ok(Self { conn })
    }

    /// Get or create the chunks table with vector index.
    async fn get_or_create_table(&self) -> Result<Table> {
        let table_names = self.conn.table_names().execute().await?;
        if table_names.iter().any(|n| n == "chunks") {
            return Ok(self.conn.open_table("chunks").execute().await?);
        }

        let schema: SchemaRef = Arc::new(Schema::new(vec![
            Field::new("file_name", DataType::Utf8, false),
            Field::new("chunk_index", DataType::Int32, false),
            Field::new("text", DataType::Utf8, false),
            Field::new("embedding", DataType::FixedSizeList(
                Arc::new(Field::new("item", DataType::Float32, true)),
                1536,
            ), false),
        ]));

        let table = self.conn.create_empty_table("chunks", schema).execute().await?;
        Ok(table)
    }

    /// Insert chunks into the store.
    pub async fn insert_chunks(&self, chunks: &[Chunk]) -> Result<()> {
        if chunks.is_empty() {
            return Ok(());
        }
        let table = self.get_or_create_table().await?;
        let embedding_dim = chunks[0].embedding.len();

        let file_names: Vec<&str> = chunks.iter().map(|c| c.file_name.as_str()).collect();
        let chunk_indices: Vec<i32> = chunks.iter().map(|c| c.chunk_index).collect();
        let texts: Vec<&str> = chunks.iter().map(|c| c.text.as_str()).collect();
        let flat_embeddings: Vec<f32> = chunks.iter().flat_map(|c| c.embedding.clone()).collect();

        let embedding_values = Float32Array::from(flat_embeddings);
        let item_field = Arc::new(Field::new("item", DataType::Float32, true));
        let embedding_array = Arc::new(
            FixedSizeListArray::new(
                item_field.clone(),
                embedding_dim as i32,
                Arc::new(embedding_values),
                None,
            )
        ) as ArrayRef;

        let schema = Arc::new(Schema::new(vec![
            Field::new("file_name", DataType::Utf8, false),
            Field::new("chunk_index", DataType::Int32, false),
            Field::new("text", DataType::Utf8, false),
            Field::new("embedding", DataType::FixedSizeList(
                Arc::new(Field::new("item", DataType::Float32, true)),
                embedding_dim as i32,
            ), false),
        ]));

        let batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(StringArray::from(file_names)),
                Arc::new(Int32Array::from(chunk_indices)),
                Arc::new(StringArray::from(texts)),
                embedding_array,
            ],
        )?;

        let iter = RecordBatchIterator::new(vec![Ok(batch)], schema);
        table.add(iter).execute().await?;
        Ok(())
    }

    /// Search for top-k chunks by vector similarity.
    pub async fn search(&self, query_embedding: &[f32], top_k: usize) -> Result<Vec<Chunk>> {
        let table = self.get_or_create_table().await?;
        let results: Vec<RecordBatch> = table
            .vector_search(query_embedding)?
            .limit(top_k)
            .execute()
            .await?
            .try_collect()
            .await?;

        let mut chunks = Vec::new();
        for batch in results {
            let file_name_col = batch
                .column_by_name("file_name")
                .ok_or_else(|| anyhow::anyhow!("Missing file_name column"))?
                .as_any()
                .downcast_ref::<StringArray>()
                .ok_or_else(|| anyhow::anyhow!("file_name not StringArray"))?;
            let chunk_index_col = batch
                .column_by_name("chunk_index")
                .ok_or_else(|| anyhow::anyhow!("Missing chunk_index column"))?
                .as_any()
                .downcast_ref::<Int32Array>()
                .ok_or_else(|| anyhow::anyhow!("chunk_index not Int32Array"))?;
            let text_col = batch
                .column_by_name("text")
                .ok_or_else(|| anyhow::anyhow!("Missing text column"))?
                .as_any()
                .downcast_ref::<StringArray>()
                .ok_or_else(|| anyhow::anyhow!("text not StringArray"))?;

            for i in 0..batch.num_rows() {
                chunks.push(Chunk {
                    file_name: file_name_col.value(i).to_string(),
                    chunk_index: chunk_index_col.value(i),
                    text: text_col.value(i).to_string(),
                    embedding: Vec::new(),
                });
            }
        }
        Ok(chunks)
    }

    /// Delete all chunks for a given file.
    pub async fn delete_file(&self, file_name: &str) -> Result<()> {
        let table = self.get_or_create_table().await?;
        let safe_name = file_name.replace('\'', "''");
        table.delete(&format!("file_name = '{}'", safe_name)).await?;
        Ok(())
    }

    /// List all unique file names in the store.
    pub async fn list_files(&self) -> Result<Vec<String>> {
        let table = self.get_or_create_table().await?;
        let data: Vec<RecordBatch> = table
            .query()
            .execute()
            .await?
            .try_collect()
            .await?;
        let mut files: Vec<String> = Vec::new();
        for batch in data {
            if let Some(col) = batch.column_by_name("file_name") {
                if let Some(arr) = col.as_any().downcast_ref::<StringArray>() {
                    for i in 0..arr.len() {
                        let name = arr.value(i).to_string();
                        if !files.contains(&name) {
                            files.push(name);
                        }
                    }
                }
            }
        }
        files.sort();
        Ok(files)
    }
}
