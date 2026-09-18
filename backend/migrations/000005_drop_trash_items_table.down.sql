CREATE TABLE IF NOT EXISTS trash_items (
    id            TEXT PRIMARY KEY,
    vault_id      TEXT NOT NULL,
    resource_id   TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    path          TEXT NOT NULL,
    parent_id     TEXT,
    deleted_at    TEXT NOT NULL,
    FOREIGN KEY (vault_id) REFERENCES vaults(id)
);
