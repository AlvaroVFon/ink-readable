CREATE TABLE document_links (
    document_a_id TEXT NOT NULL,
    document_b_id TEXT NOT NULL,

    PRIMARY KEY (document_a_id, document_b_id),

    FOREIGN KEY (document_a_id)
        REFERENCES documents(id),

    FOREIGN KEY (document_b_id)
        REFERENCES documents(id),

    CHECK (document_a_id < document_b_id)
);
