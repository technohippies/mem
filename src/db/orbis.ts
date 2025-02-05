import { OrbisDB } from "@useorbis/db-sdk";

// Load environment variables
const CERAMIC_NODE_URL = import.meta.env.VITE_CERAMIC_NODE_URL || 'https://ceramic-orbisdb-mainnet-direct.hirenodes.io/';
const ORBIS_NODE_URL = import.meta.env.VITE_ORBIS_NODE_URL || 'https://studio.useorbis.com/';
const ORBIS_ENVIRONMENT_ID = import.meta.env.VITE_ORBIS_ENVIRONMENT_ID || 'did:pkh:eip155:1:0x25b4048c3b3c58973571db2dbbf87103f7406966';
const ORBIS_CONTEXT_ID = import.meta.env.VITE_ORBIS_CONTEXT_ID || 'kjzl6kcym7w8y6v8xczuys0vm27mcatj3acgc1zjk0stqp9ac457uwzm2lbrzwm';
const ORBIS_DECK_MODEL_ID = import.meta.env.VITE_ORBIS_DECK_MODEL_ID || 'kjzl6hvfrbw6c9ksaldax42ewyk307vzy8vjnm8wdhlm5d2vnoy66xbptb0tqr4';
const ORBIS_FLASHCARD_MODEL_ID = import.meta.env.VITE_ORBIS_FLASHCARD_MODEL_ID || 'kjzl6hvfrbw6c9s4bl3dcow5y87johzugtlevmlcqko8s7ymdxg0zo8ncrucpzk';
const ORBIS_PROGRESS_MODEL_ID = import.meta.env.VITE_ORBIS_USER_PROGRESS || 'kjzl6hvfrbw6c7mg7px3dvurfz3m0wslwo2noo2wz8kkg84sm9dmwov3kepbqjy';

console.log('Initializing OrbisDB...');
export const db = new OrbisDB({
    ceramic: {
        gateway: CERAMIC_NODE_URL
    },
    nodes: [
        {
            gateway: ORBIS_NODE_URL,
            env: ORBIS_ENVIRONMENT_ID
        }
    ]
});

console.log('OrbisDB initialized:', db);

// Export constants for use in other files
export const CONTEXT_ID = ORBIS_CONTEXT_ID;
export const DECK_MODEL = ORBIS_DECK_MODEL_ID;
export const FLASHCARD_MODEL = ORBIS_FLASHCARD_MODEL_ID;
export const PROGRESS_MODEL = ORBIS_PROGRESS_MODEL_ID;

// Type definitions for Orbis models
export interface OrbisDeck {
    stream_id: string;
    controller: string;
    name: string;
    price: number;
    category: string;
    language: string;
    image_cid?: string;
    is_public: boolean;
    description?: string;
    forked_from?: string;
    _metadata_context: string;
    plugins_data?: any;
    indexed_at: string;
}

export interface OrbisFlashcard {
    stream_id: string;
    controller: string;
    deck_id: string;
    language: string;
    back_text: string;
    front_text: string;
    sort_order: number;
    audio_tts_cid?: string;
    back_image_cid?: string;
    front_image_cid?: string;
    _metadata_context: string;
    plugins_data?: any;
    indexed_at: string;
}

// Helper functions to convert between Orbis and app models
export function orbisToAppDeck(orbisDeck: OrbisDeck) {
    return {
        id: orbisDeck.stream_id,
        name: orbisDeck.name,
        description: orbisDeck.description,
        slug: orbisDeck.stream_id, // Using stream_id as slug for now
        image_hash: orbisDeck.image_cid,
        tags: JSON.stringify([orbisDeck.category, orbisDeck.language]),
        is_admin: orbisDeck.controller === ORBIS_ENVIRONMENT_ID,
        created_at: orbisDeck.indexed_at,
        updated_at: orbisDeck.indexed_at,
        category: orbisDeck.category,
        language: orbisDeck.language,
        price: orbisDeck.price,
        is_public: orbisDeck.is_public,
        forked_from: orbisDeck.forked_from
    };
}

export function orbisToAppFlashcard(orbisCard: OrbisFlashcard) {
    return {
        id: orbisCard.stream_id,
        deck_id: orbisCard.deck_id,
        front: orbisCard.front_text,
        back: orbisCard.back_text,
        sort_order: orbisCard.sort_order,
        created_at: orbisCard.indexed_at,
        updated_at: orbisCard.indexed_at,
        language: orbisCard.language,
        audio_tts_cid: orbisCard.audio_tts_cid,
        back_image_cid: orbisCard.back_image_cid,
        front_image_cid: orbisCard.front_image_cid
    };
} 