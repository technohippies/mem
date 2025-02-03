import sqlite3 from 'sqlite3';
import path from 'path';
import { promisify } from 'util';

// Initialize database connection
const db = new sqlite3.Database(path.join(process.cwd(), 'flashcards.db'));

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Promisify database operations
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbExec = promisify(db.exec.bind(db));

// Export database instance and helper functions
export { db, dbRun, dbGet, dbAll, dbExec };

// Types for the application
export interface Deck {
  id: string;
  name: string;
  slug: string;  // URL-friendly version of the name
  description: string | null;
  creator_id: string;
  is_public: boolean;
  tags: string | null;
  image_hash: string | null;
  forked_from: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  front_image_hash: string | null;
  back: string;
  back_image_hash: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserFlashcard {
  id: string;
  user_id: string;
  flashcard_id: string;
  difficulty: number;
  stability: number;
  retrievability: number;
  reps: number;
  lapses: number;
  last_review: string | null;
  next_review: string | null;
  correct_reps: number;
  last_interval: number | null;
}

export interface DeckVersion {
  id: string;
  deck_id: string;
  version: number;
  modified_at: string;
  modified_by: string;
  change_type: string;
  change_description: string | null;
}

export interface StudySession {
  id: string;
  user_id: string;
  deck_id: string;
  started_at: string;
  ended_at: string | null;
  cards_studied: number;
  correct_cards: number;
}

export default db; 