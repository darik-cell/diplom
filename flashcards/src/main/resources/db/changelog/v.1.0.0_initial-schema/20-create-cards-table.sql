CREATE TABLE cards
(
    id            SERIAL PRIMARY KEY,
    text          TEXT      NOT NULL,
    collection_id BIGINT    NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- поля SRS с дефолтами, как в Anki
    type          INTEGER   NOT NULL DEFAULT 0,    -- 0=new
    queue         INTEGER   NOT NULL DEFAULT 0,    -- 0=new
    due           INTEGER   NOT NULL DEFAULT 0,    -- для new = 0
    ivl           INTEGER   NOT NULL DEFAULT 0,    -- в днях
    factor        INTEGER   NOT NULL DEFAULT 2500, -- ease-factor = 2.5
    reps          INTEGER   NOT NULL DEFAULT 0,
    lapses        INTEGER   NOT NULL DEFAULT 0,
    steps_left    INTEGER   NOT NULL DEFAULT 2     -- default learning steps = 2
);
