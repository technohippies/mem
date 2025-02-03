import { db, dbRun, dbExec } from './db';

// Create tables
const createTables = async () => {
  await dbExec(`
    -- Core tables for flashcard content
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      creator_id TEXT NOT NULL,
      is_public BOOLEAN DEFAULT false,
      tags TEXT,
      image_hash TEXT,
      forked_from TEXT,
      version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL,
      front TEXT NOT NULL,
      front_image_hash TEXT,
      back TEXT NOT NULL,
      back_image_hash TEXT,
      sort_order INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deck_id) REFERENCES decks(id)
    );
  `);
};

// Sample data
const sampleDecks = [
  {
    id: 'deck_1',
    name: 'JavaScript Fundamentals',
    description: 'Core concepts of JavaScript programming language',
    creator_id: 'admin',
    is_public: true,
    tags: JSON.stringify(['programming', 'javascript', 'basics']),
  },
  {
    id: 'deck_2',
    name: 'React Hooks',
    description: 'Understanding React Hooks and their use cases',
    creator_id: 'admin',
    is_public: true,
    tags: JSON.stringify(['programming', 'react', 'hooks']),
  },
  {
    id: 'deck_3',
    name: 'Web3 Concepts',
    description: 'Basic concepts of Web3 and blockchain technology',
    creator_id: 'admin',
    is_public: true,
    tags: JSON.stringify(['blockchain', 'web3', 'crypto']),
  },
];

const sampleCards = [
  // JavaScript Fundamentals deck
  {
    id: 'card_1_1',
    deck_id: 'deck_1',
    front: 'What is hoisting in JavaScript?',
    back: 'Hoisting is JavaScript\'s default behavior of moving declarations to the top of their scope before code execution. This means that regardless of where variables and functions are declared, they are moved to the top of their scope.',
  },
  {
    id: 'card_1_2',
    deck_id: 'deck_1',
    front: 'Explain the difference between let, const, and var.',
    back: 'var: function-scoped, can be redeclared and updated\nlet: block-scoped, can be updated but not redeclared\nconst: block-scoped, cannot be updated or redeclared',
  },
  // React Hooks deck
  {
    id: 'card_2_1',
    deck_id: 'deck_2',
    front: 'What is the useState hook used for?',
    back: 'useState is a React Hook that allows you to add state to functional components. It returns an array with two elements: the current state value and a function to update it.',
  },
  {
    id: 'card_2_2',
    deck_id: 'deck_2',
    front: 'Explain the useEffect hook.',
    back: 'useEffect is a hook that lets you perform side effects in function components. It serves the same purpose as componentDidMount, componentDidUpdate, and componentWillUnmount in React classes.',
  },
  // Web3 Concepts deck
  {
    id: 'card_3_1',
    deck_id: 'deck_3',
    front: 'What is a smart contract?',
    back: 'A smart contract is a self-executing contract with the terms of the agreement directly written into code. It runs on the blockchain, automatically enforcing and executing the terms when predetermined conditions are met.',
  },
  {
    id: 'card_3_2',
    deck_id: 'deck_3',
    front: 'What is a blockchain?',
    back: 'A blockchain is a distributed, decentralized, public ledger that records transactions across a network of computers. Each block contains a cryptographic hash of the previous block, transaction data, and a timestamp.',
  },
];

// Insert sample data
const insertSampleData = async () => {
  for (const deck of sampleDecks) {
    await dbRun(
      'INSERT OR IGNORE INTO decks (id, name, description, creator_id, is_public, tags) VALUES (?, ?, ?, ?, ?, ?)',
      [deck.id, deck.name, deck.description, deck.creator_id, deck.is_public ? 1 : 0, deck.tags]
    );
  }

  for (const card of sampleCards) {
    await dbRun(
      'INSERT OR IGNORE INTO flashcards (id, deck_id, front, back) VALUES (?, ?, ?, ?)',
      [card.id, card.deck_id, card.front, card.back]
    );
  }
};

// Initialize database
const initDb = async () => {
  try {
    await createTables();
    await insertSampleData();
    console.log('Database initialized successfully with sample data');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

// Run initialization
initDb(); 