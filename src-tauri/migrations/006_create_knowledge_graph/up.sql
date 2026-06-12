CREATE TABLE knowledge_nodes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    node_type  TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE knowledge_edges (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    from_node_id  INTEGER NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    to_node_id    INTEGER NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    relation      TEXT NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
