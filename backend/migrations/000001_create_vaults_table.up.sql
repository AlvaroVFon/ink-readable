CREATE TABLE IF NOT EXISTS vaults (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    deleted    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
