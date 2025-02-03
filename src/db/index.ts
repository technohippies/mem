import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

// Initialize SQLite database
const db = new sqlite3.Database('anki.db');

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Promisify database operations
const runAsync = promisify(db.run.bind(db));
const allAsync = promisify(db.all.bind(db));
const getAsync = promisify(db.get.bind(db));

// Helper function to initialize the database
export async function initializeDatabase() {
  // Create tables if they don't exist
  const createTableStatements = [
    `CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      creator_id TEXT NOT NULL,
      is_public INTEGER DEFAULT 0,
      tags TEXT,
      image_hash TEXT,
      forked_from TEXT REFERENCES decks(id),
      version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL REFERENCES decks(id),
      front TEXT NOT NULL,
      front_image_hash TEXT,
      back TEXT NOT NULL,
      back_image_hash TEXT,
      sort_order INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS user_flashcards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      flashcard_id TEXT NOT NULL REFERENCES flashcards(id),
      difficulty REAL DEFAULT 0,
      stability REAL DEFAULT 0,
      retrievability REAL DEFAULT 0,
      reps INTEGER DEFAULT 0,
      lapses INTEGER DEFAULT 0,
      last_review TIMESTAMP,
      next_review TIMESTAMP,
      correct_reps INTEGER DEFAULT 0,
      last_interval REAL,
      UNIQUE(user_id, flashcard_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS deck_versions (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL REFERENCES decks(id),
      version INTEGER NOT NULL,
      modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      modified_by TEXT NOT NULL,
      change_type TEXT NOT NULL,
      change_description TEXT
    )`,
    
    `CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      deck_id TEXT NOT NULL REFERENCES decks(id),
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ended_at TIMESTAMP,
      cards_studied INTEGER DEFAULT 0,
      correct_cards INTEGER DEFAULT 0
    )`
  ];

  const createIndexStatements = [
    'CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON flashcards(deck_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_flashcards_user ON user_flashcards(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_flashcards_next_review ON user_flashcards(user_id, next_review)',
    'CREATE INDEX IF NOT EXISTS idx_deck_versions_deck ON deck_versions(deck_id)',
    'CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id)'
  ];

  // Create tables sequentially
  for (const statement of createTableStatements) {
    await runAsync(statement);
  }

  // Create indexes
  for (const statement of createIndexStatements) {
    await runAsync(statement);
  }
}

// Export database instance and helper functions
export { db, runAsync, allAsync, getAsync };

// Export types for use in the application
export type Deck = typeof schema.decks.$inferSelect;
export type NewDeck = typeof schema.decks.$inferInsert;

export type Flashcard = typeof schema.flashcards.$inferSelect;
export type NewFlashcard = typeof schema.flashcards.$inferInsert;

export type UserFlashcard = typeof schema.userFlashcards.$inferSelect;
export type NewUserFlashcard = typeof schema.userFlashcards.$inferInsert;

export type DeckVersion = typeof schema.deckVersions.$inferSelect;
export type NewDeckVersion = typeof schema.deckVersions.$inferInsert;

export type StudySession = typeof schema.studySessions.$inferSelect;
export type NewStudySession = typeof schema.studySessions.$inferInsert; 