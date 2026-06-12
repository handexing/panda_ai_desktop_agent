CREATE TABLE mcp_servers (
    id      TEXT PRIMARY KEY NOT NULL,
    name    TEXT NOT NULL,
    command TEXT NOT NULL,
    args    TEXT NOT NULL DEFAULT ''
);
