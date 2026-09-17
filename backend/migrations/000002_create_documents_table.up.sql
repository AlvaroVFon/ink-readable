CREATE TABLE IF NOT EXISTS documents (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    vault_id    TEXT NOT NULL,
    path        TEXT NOT NULL,
    content     TEXT NOT NULL DEFAULT '',

    deleted     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,

    FOREIGN KEY (vault_id)
        REFERENCES vaults(id)
);
