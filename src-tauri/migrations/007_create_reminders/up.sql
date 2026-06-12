CREATE TABLE reminders (
    id          TEXT PRIMARY KEY NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    remind_at   DATETIME,
    is_done     BOOLEAN NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
