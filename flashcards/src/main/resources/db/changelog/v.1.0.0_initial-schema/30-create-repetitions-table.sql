CREATE TABLE repetitions
(
    id                   SERIAL PRIMARY KEY,
    card_id              BIGINT    NOT NULL,
    user_id              BIGINT    NOT NULL,
    repetition_date      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    interval             INT       NOT NULL, -- интервал в днях до следующего повторения
    easiness_factor      FLOAT     NOT NULL, -- коэффициент легкости
    grade                INT       NOT NULL, -- оценка пользователя (от 0 до 5)
    next_repetition_date TIMESTAMP NOT NULL, -- дата следующего повторения
    CONSTRAINT fk_repetitions_card FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE,
    CONSTRAINT fk_repetitions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
