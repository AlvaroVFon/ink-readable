CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position > 0),
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    FOREIGN KEY (project_id) REFERENCES projects(id)
);
