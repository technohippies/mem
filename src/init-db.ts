import { db, dbRun } from './db';
import { nanoid } from 'nanoid';

async function initDb() {
  console.log('Initializing database...');

  // Create users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      fid TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create decks table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      slug TEXT UNIQUE NOT NULL,
      image_hash TEXT,
      tags TEXT,
      is_admin BOOLEAN NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create flashcards table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    )
  `);

  // Create user_decks table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS user_decks (
      user_id TEXT NOT NULL,
      deck_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, deck_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    )
  `);

  // Create user_card_progress table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS user_card_progress (
      user_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      difficulty REAL NOT NULL,
      stability REAL NOT NULL,
      retrievability REAL NOT NULL,
      reps INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      last_interval INTEGER NOT NULL DEFAULT 0,
      next_review TEXT NOT NULL,
      review_date TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, card_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (card_id) REFERENCES flashcards(id) ON DELETE CASCADE
    )
  `);

  console.log('Tables created successfully');

  // Insert sample decks
  const decks = [
    {
      id: nanoid(),
      name: 'Spanish Essentials',
      description: 'Essential Spanish vocabulary and phrases for beginners',
      slug: 'spanish-essentials',
      image_hash: 'https://placekitten.com/200/200',
      tags: JSON.stringify(['language', 'spanish', 'beginner']),
      is_admin: true
    },
    {
      id: nanoid(),
      name: 'JavaScript Fundamentals',
      description: 'Core JavaScript concepts every developer should know',
      slug: 'javascript-fundamentals',
      image_hash: 'https://placekitten.com/201/201',
      tags: JSON.stringify(['programming', 'javascript', 'web']),
      is_admin: true
    },
    {
      id: nanoid(),
      name: 'Web3 Concepts',
      description: 'Essential concepts for Web3 development',
      slug: 'web3-concepts',
      image_hash: 'https://placekitten.com/202/202',
      tags: JSON.stringify(['blockchain', 'web3', 'crypto']),
      is_admin: true
    }
  ];

  for (const deck of decks) {
    await dbRun(
      'INSERT INTO decks (id, name, description, slug, image_hash, tags, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [deck.id, deck.name, deck.description, deck.slug, deck.image_hash, deck.tags, deck.is_admin]
    );
  }

  console.log('Sample decks created');

  // Sample cards for Spanish Essentials
  const spanishCards = [
    { front: 'Hello', back: 'Hola' },
    { front: 'Goodbye', back: 'Adiós' },
    { front: 'Please', back: 'Por favor' },
    { front: 'Thank you', back: 'Gracias' },
    { front: 'You\'re welcome', back: 'De nada' },
    { front: 'Good morning', back: 'Buenos días' },
    { front: 'Good afternoon', back: 'Buenas tardes' },
    { front: 'Good night', back: 'Buenas noches' },
    { front: 'How are you?', back: '¿Cómo estás?' },
    { front: 'I\'m fine', back: 'Estoy bien' },
    { front: 'What\'s your name?', back: '¿Cómo te llamas?' },
    { front: 'My name is...', back: 'Me llamo...' },
    { front: 'Nice to meet you', back: 'Mucho gusto' },
    { front: 'Where are you from?', back: '¿De dónde eres?' },
    { front: 'I am from...', back: 'Soy de...' },
    { front: 'Do you speak English?', back: '¿Hablas inglés?' },
    { front: 'I don\'t understand', back: 'No entiendo' },
    { front: 'Can you help me?', back: '¿Me puedes ayudar?' },
    { front: 'Where is...?', back: '¿Dónde está...?' },
    { front: 'How much?', back: '¿Cuánto cuesta?' },
    { front: 'Water', back: 'Agua' },
    { front: 'Food', back: 'Comida' },
    { front: 'Restaurant', back: 'Restaurante' },
    { front: 'Hotel', back: 'Hotel' },
    { front: 'Airport', back: 'Aeropuerto' },
    { front: 'Train station', back: 'Estación de tren' },
    { front: 'Bus station', back: 'Estación de autobús' },
    { front: 'Hospital', back: 'Hospital' },
    { front: 'Pharmacy', back: 'Farmacia' },
    { front: 'Bank', back: 'Banco' }
  ];

  // Sample cards for JavaScript Fundamentals
  const jsCards = [
    { front: 'What is a variable?', back: 'A container for storing data values' },
    { front: 'What is const?', back: 'A keyword for declaring constants that cannot be reassigned' },
    { front: 'What is let?', back: 'A block-scoped variable declaration' },
    { front: 'What is an array?', back: 'An ordered collection of values' },
    { front: 'What is an object?', back: 'A collection of key-value pairs' },
    { front: 'What is a function?', back: 'A reusable block of code that performs a specific task' },
    { front: 'What is closure?', back: 'A function that has access to variables in its outer scope' },
    { front: 'What is hoisting?', back: 'The behavior of moving declarations to the top of their scope' },
    { front: 'What is the event loop?', back: 'The mechanism that handles asynchronous callbacks in JavaScript' },
    { front: 'What is a Promise?', back: 'An object representing the eventual completion of an asynchronous operation' },
    { front: 'What is async/await?', back: 'Syntax for handling promises in a more synchronous way' },
    { front: 'What is destructuring?', back: 'A way to extract values from objects or arrays into distinct variables' },
    { front: 'What is the spread operator?', back: 'Syntax for expanding elements using ...' },
    { front: 'What is a Map?', back: 'A collection of key-value pairs where both keys and values can be of any type' },
    { front: 'What is a Set?', back: 'A collection of unique values' },
    { front: 'What is the this keyword?', back: 'A reference to the current execution context' },
    { front: 'What is prototypal inheritance?', back: 'Objects inheriting properties and methods from other objects' },
    { front: 'What is a callback?', back: 'A function passed as an argument to another function' },
    { front: 'What is the DOM?', back: 'Document Object Model - the programming interface for HTML documents' },
    { front: 'What is event bubbling?', back: 'The propagation of events through the DOM tree' },
    { front: 'What is a pure function?', back: 'A function that always returns the same output for the same input' },
    { front: 'What is immutability?', back: 'The concept that data cannot be changed once created' },
    { front: 'What is currying?', back: 'The technique of converting a function with multiple arguments into a sequence of functions' },
    { front: 'What is a generator?', back: 'A function that can be paused and resumed using yield' },
    { front: 'What is TypeScript?', back: 'A typed superset of JavaScript that compiles to plain JavaScript' },
    { front: 'What is ESM?', back: 'ECMAScript Modules - the official standard format for packaging JavaScript' },
    { front: 'What is CommonJS?', back: 'A module format that uses require() and module.exports' },
    { front: 'What is webpack?', back: 'A static module bundler for modern JavaScript applications' },
    { front: 'What is Babel?', back: 'A JavaScript compiler that converts modern JavaScript into backwards compatible versions' },
    { front: 'What is npm?', back: 'Node Package Manager - the default package manager for Node.js' }
  ];

  // Sample cards for Web3 Concepts
  const web3Cards = [
    { front: 'What is Web3?', back: 'The decentralized version of the internet built on blockchain technology' },
    { front: 'What is a blockchain?', back: 'A distributed, immutable ledger that records transactions across a network' },
    { front: 'What is a smart contract?', back: 'Self-executing contracts with the terms directly written into code' },
    { front: 'What is Ethereum?', back: 'A decentralized platform that runs smart contracts' },
    { front: 'What is gas?', back: 'The fee required to perform a transaction on the Ethereum network' },
    { front: 'What is a wallet?', back: 'Software that stores private keys and manages cryptocurrency' },
    { front: 'What is MetaMask?', back: 'A browser extension wallet for accessing Ethereum dApps' },
    { front: 'What is a dApp?', back: 'A decentralized application that runs on a blockchain' },
    { front: 'What is DeFi?', back: 'Decentralized Finance - financial services using smart contracts' },
    { front: 'What is an NFT?', back: 'Non-Fungible Token - a unique digital asset on the blockchain' },
    { front: 'What is mining?', back: 'The process of validating transactions and adding them to the blockchain' },
    { front: 'What is proof of work?', back: 'A consensus mechanism that requires computational work to validate blocks' },
    { front: 'What is proof of stake?', back: 'A consensus mechanism where validators stake tokens to validate blocks' },
    { front: 'What is a token?', back: 'A digital asset created and managed by smart contracts' },
    { front: 'What is ERC-20?', back: 'A standard interface for fungible tokens on Ethereum' },
    { front: 'What is ERC-721?', back: 'A standard interface for non-fungible tokens on Ethereum' },
    { front: 'What is a DAO?', back: 'Decentralized Autonomous Organization - an organization governed by smart contracts' },
    { front: 'What is IPFS?', back: 'InterPlanetary File System - a protocol for storing and sharing data' },
    { front: 'What is a hash?', back: 'A fixed-size string of characters representing data' },
    { front: 'What is a private key?', back: 'A secret number that allows you to spend cryptocurrency' },
    { front: 'What is a public key?', back: 'A cryptographic key derived from the private key used as an address' },
    { front: 'What is a seed phrase?', back: 'A series of words that can recover a wallet' },
    { front: 'What is a block?', back: 'A collection of transactions that are bundled together' },
    { front: 'What is a node?', back: 'A computer that participates in a blockchain network' },
    { front: 'What is consensus?', back: 'The process of reaching agreement on the state of the network' },
    { front: 'What is a fork?', back: 'A change in protocol causing two different versions of a blockchain' },
    { front: 'What is Layer 2?', back: 'Scaling solutions that process transactions off the main chain' },
    { front: 'What is a rollup?', back: 'A Layer 2 solution that bundles multiple transactions into one' },
    { front: 'What is a sidechain?', back: 'A separate blockchain that runs parallel to the main chain' },
    { front: 'What is an oracle?', back: 'A service that connects smart contracts with external data' }
  ];

  // Insert cards for each deck
  const cardSets = [
    { deckId: decks[0].id, cards: spanishCards },
    { deckId: decks[1].id, cards: jsCards },
    { deckId: decks[2].id, cards: web3Cards }
  ];

  for (const { deckId, cards } of cardSets) {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      await dbRun(
        'INSERT INTO flashcards (id, deck_id, front, back, sort_order) VALUES (?, ?, ?, ?, ?)',
        [nanoid(), deckId, card.front, card.back, i]
      );
    }
  }

  console.log('Database initialized with sample data!');
  console.log(`Created ${decks.length} decks with ${spanishCards.length + jsCards.length + web3Cards.length} total cards`);
}

initDb().catch(console.error); 