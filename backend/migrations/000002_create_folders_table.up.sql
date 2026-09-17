CREATE TABLE IF NOT EXISTS folders (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    vault_id          TEXT NOT NULL,
    parent_id         TEXT,

    deleted           INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,

    FOREIGN KEY (vault_id)
        REFERENCES vaults(id),

    FOREIGN KEY (parent_id)
        REFERENCES folders(id)
);
