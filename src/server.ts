import { db, dbAll, dbGet } from './db';

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    // Enable CORS for development
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    const url = new URL(req.url);
    console.log(`[${req.method}] ${url.pathname}`); // Log incoming requests

    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/json',
    };

    try {
      // GET /api/decks - List all decks
      if (url.pathname === '/api/decks') {
        console.log('Fetching all decks...');
        const decks = await dbAll('SELECT * FROM decks ORDER BY created_at DESC');
        console.log(`Found ${decks.length} decks`);
        return new Response(JSON.stringify(decks), { headers });
      }

      // GET /api/decks/:slug - Get deck by slug
      if (url.pathname.match(/^\/api\/decks\/[\w-]+$/)) {
        const slug = url.pathname.split('/').pop();
        console.log(`Fetching deck with slug: ${slug}`);
        const deck = await dbGet('SELECT * FROM decks WHERE slug = ?', [slug]);
        
        if (!deck) {
          console.log(`No deck found with slug: ${slug}`);
          return new Response(JSON.stringify({ error: 'Deck not found' }), { 
            status: 404,
            headers 
          });
        }
        
        console.log('Found deck:', deck.name);
        return new Response(JSON.stringify(deck), { headers });
      }

      // GET /api/decks/:id/cards - Get cards for a deck
      if (url.pathname.match(/^\/api\/decks\/[\w-]+\/cards$/)) {
        const deckId = url.pathname.split('/')[3];
        console.log(`Fetching cards for deck: ${deckId}`);
        const cards = await dbAll(
          'SELECT * FROM flashcards WHERE deck_id = ? ORDER BY sort_order, created_at',
          [deckId]
        );
        console.log(`Found ${cards.length} cards`);
        return new Response(JSON.stringify(cards), { headers });
      }

      // 404 for unmatched routes
      console.log('Route not found:', url.pathname);
      return new Response(JSON.stringify({ error: 'Not found' }), { 
        status: 404,
        headers 
      });

    } catch (error) {
      console.error('API Error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }), 
        { status: 500, headers }
      );
    }
  },
});

console.log(`API server listening on http://localhost:${server.port}`); 