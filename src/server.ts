import { db, CONTEXT_ID, DECK_MODEL, FLASHCARD_MODEL, orbisToAppDeck, orbisToAppFlashcard, type OrbisDeck, type OrbisFlashcard } from './db/orbis';

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
        const { rows } = await db
          .select()
          .from(DECK_MODEL)
          .where({ is_public: true })
          .context(CONTEXT_ID)
          .run();

        const decks = rows.map(row => orbisToAppDeck(row as OrbisDeck));
        console.log(`Found ${decks.length} decks`);
        return new Response(JSON.stringify(decks), { headers });
      }

      // GET /api/decks/:slug - Get deck by slug
      if (url.pathname.match(/^\/api\/decks\/[\w-]+$/)) {
        const slug = url.pathname.split('/').pop();
        console.log(`Fetching deck with slug: ${slug}`);
        const { rows } = await db
          .select()
          .from(DECK_MODEL)
          .where({ stream_id: slug })
          .context(CONTEXT_ID)
          .run();

        if (rows.length === 0) {
          console.log(`No deck found with slug: ${slug}`);
          return new Response(JSON.stringify({ error: 'Deck not found' }), { 
            status: 404,
            headers 
          });
        }

        const deck = orbisToAppDeck(rows[0] as OrbisDeck);
        console.log('Found deck:', deck.name);
        return new Response(JSON.stringify(deck), { headers });
      }

      // GET /api/decks/:slug/cards - Get cards for a deck
      if (url.pathname.match(/^\/api\/decks\/[\w-]+\/cards$/)) {
        const slug = url.pathname.split('/')[3];
        console.log(`Fetching cards for deck with slug: ${slug}`);
        
        // First get the deck to verify it exists
        const { rows: deckRows } = await db
          .select()
          .from(DECK_MODEL)
          .where({ stream_id: slug })
          .context(CONTEXT_ID)
          .run();

        if (deckRows.length === 0) {
          console.log(`No deck found with slug: ${slug}`);
          return new Response(JSON.stringify({ error: 'Deck not found' }), {
            status: 404,
            headers
          });
        }

        // Then get all cards for this deck
        const { rows: cardRows } = await db
          .select()
          .from(FLASHCARD_MODEL)
          .where({ deck_id: slug })
          .orderBy(['sort_order', 'asc'])
          .context(CONTEXT_ID)
          .run();

        const cards = cardRows.map(row => orbisToAppFlashcard(row as OrbisFlashcard));
        console.log(`Found ${cards.length} cards for deck ${slug}`);
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