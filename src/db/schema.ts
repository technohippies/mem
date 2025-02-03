import { sql } from "drizzle-orm";
import { text, integer, real, boolean, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";

export const decks = sqliteTable('decks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  creatorId: text('creator_id').notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  tags: text('tags'), // JSON array stored as text
  imageHash: text('image_hash'),
  forkedFrom: text('forked_from').references(() => decks.id),
  version: integer('version').default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const flashcards = sqliteTable('flashcards', {
  id: text('id').primaryKey(),
  deckId: text('deck_id').notNull().references(() => decks.id),
  front: text('front').notNull(),
  frontImageHash: text('front_image_hash'),
  back: text('back').notNull(),
  backImageHash: text('back_image_hash'),
  sortOrder: integer('sort_order'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const userFlashcards = sqliteTable('user_flashcards', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  flashcardId: text('flashcard_id').notNull().references(() => flashcards.id),
  difficulty: real('difficulty').default(0),
  stability: real('stability').default(0),
  retrievability: real('retrievability').default(0),
  reps: integer('reps').default(0),
  lapses: integer('lapses').default(0),
  lastReview: integer('last_review', { mode: 'timestamp' }),
  nextReview: integer('next_review', { mode: 'timestamp' }),
  correctReps: integer('correct_reps').default(0),
  lastInterval: real('last_interval'),
}, (table) => ({
  userCardIdx: uniqueIndex('user_card_idx').on(table.userId, table.flashcardId),
}));

export const deckVersions = sqliteTable('deck_versions', {
  id: text('id').primaryKey(),
  deckId: text('deck_id').notNull().references(() => decks.id),
  version: integer('version').notNull(),
  modifiedAt: integer('modified_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  modifiedBy: text('modified_by').notNull(),
  changeType: text('change_type').notNull(),
  changeDescription: text('change_description'),
});

export const studySessions = sqliteTable('study_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  deckId: text('deck_id').notNull().references(() => decks.id),
  startedAt: integer('started_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  cardsStudied: integer('cards_studied').default(0),
  correctCards: integer('correct_cards').default(0),
}); 