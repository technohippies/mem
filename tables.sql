-- Initialize SQLite database for v0 prototype
-- Later this will be migrated to Ceramic

-- Core tables for flashcard content
CREATE TABLE decks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    creator_id TEXT NOT NULL,  -- References users.id
    is_public BOOLEAN DEFAULT false,
    tags TEXT[], -- Store as JSON array
    image_hash TEXT, -- IPFS CID for deck cover image
    forked_from TEXT REFERENCES decks(id),
    version INTEGER DEFAULT 1
);

CREATE TABLE flashcards (
    id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL REFERENCES decks(id),
    front TEXT NOT NULL,
    front_image_hash TEXT, -- IPFS CID for front image
    back TEXT NOT NULL,
    back_image_hash TEXT, -- IPFS CID for back image
    sort_order INTEGER -- Optional: for manual card ordering within deck
);

-- User study progress/FSRS data
CREATE TABLE user_flashcards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,      -- References users.id
    flashcard_id TEXT NOT NULL REFERENCES flashcards(id),
    -- FSRS algorithm data
    difficulty REAL DEFAULT 0,
    stability REAL DEFAULT 0,
    retrievability REAL DEFAULT 0,
    reps INTEGER DEFAULT 0,
    lapses INTEGER DEFAULT 0,
    last_review TIMESTAMP,
    next_review TIMESTAMP,
    -- Additional stats
    correct_reps INTEGER DEFAULT 0,
    last_interval REAL,
    UNIQUE(user_id, flashcard_id)
);

-- Track deck modifications
CREATE TABLE deck_versions (
    id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL REFERENCES decks(id),
    version INTEGER NOT NULL,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by TEXT NOT NULL, -- References users.id
    change_type TEXT NOT NULL, -- 'card_added', 'card_removed', 'card_modified'
    change_description TEXT
);

-- Study session tracking
CREATE TABLE study_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,     -- References users.id
    deck_id TEXT NOT NULL REFERENCES decks(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    cards_studied INTEGER DEFAULT 0,
    correct_cards INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_flashcards_deck ON flashcards(deck_id);
CREATE INDEX idx_user_flashcards_user ON user_flashcards(user_id);
CREATE INDEX idx_user_flashcards_next_review ON user_flashcards(user_id, next_review);
CREATE INDEX idx_deck_versions_deck ON deck_versions(deck_id);
CREATE INDEX idx_study_sessions_user ON study_sessions(user_id);

-- View for calculating deck card counts
CREATE VIEW deck_card_counts AS
SELECT deck_id, COUNT(*) as card_count
FROM flashcards
GROUP BY deck_id;
