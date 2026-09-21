CREATE TABLE IF NOT EXISTS editor_config (
  id TEXT PRIMARY KEY,
  dark_theme INTEGER NOT NULL DEFAULT 1,
  vim_motion INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT
);

INSERT OR IGNORE INTO editor_config (id, dark_theme, vim_motion, updated_at)
VALUES ('default', 1, 1, datetime('now'))
