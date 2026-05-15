// config.js - Hermes card definitions

export const CONFIG = {
  HAND_SIZE: 4,
  MAX_DECK_SIZE: 24,
  EVOLUTION_THRESHOLD: 3,
};

// ── CARD DECK ──
// Each card wraps an existing Hermes capability
export const BASE_DECK = [
  // ⚡ SOURCE CARDS — wrap source-registry.js
  {
    id: 'fetch_fast',
    name: 'FETCH FAST',
    icon: '⚡',
    type: 'source',
    description: 'Hunt tokens from fast sources (HN, Mythic, Dev.to)',
    confidence: 0.7,
    playCount: 0,
    successCount: 0,
    action: 'fetchFastSources',
    params: {}
  },
  {
    id: 'fetch_slow',
    name: 'FETCH DEEP',
    icon: '🕸️',
    type: 'source',
    description: 'Deep extraction from slow news sources',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    action: 'fetchSlowSources',
    params: {}
  },
  {
    id: 'fetch_mythic',
    name: 'MYTHIC HARVEST',
    icon: '🏛️',
    type: 'source',
    description: 'Draw from the mythic archetype archive',
    confidence: 0.8,
    playCount: 0,
    successCount: 0,
    action: 'fetchMythicOnly',
    params: {}
  },

  // 🔮 SEMANTIC CARDS — wrap semantic-core.js
  {
    id: 'semantic_filter',
    name: 'SEMANTIC FILTER',
    icon: '🔮',
    type: 'semantic',
    description: 'Filter tokens by semantic similarity to mission',
    confidence: 0.6,
    playCount: 0,
    successCount: 0,
    action: 'semanticFilter',
    params: { threshold: 0.7 }
  },
  {
    id: 'cluster_meaning',
    name: 'CLUSTER MEANING',
    icon: '🗂️',
    type: 'semantic',
    description: 'Group tokens by meaning using embeddings',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    action: 'clusterTokens',
    params: {}
  },
  {
    id: 'score_novelty',
    name: 'SCORE NOVELTY',
    icon: '✨',
    type: 'semantic',
    description: 'Boost score for semantically novel tokens',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    action: 'scoreNovelty',
    params: {}
  },

  // 🚪 GATE CARDS — wrap hermes-gate.js
  {
    id: 'gate_check',
    name: 'GATE CHECK',
    icon: '🚪',
    type: 'gate',
    description: 'Quality filter: priority words, archetypes, weight',
    confidence: 0.9,
    playCount: 0,
    successCount: 0,
    action: 'runGateCheck',
    params: {}
  },
  {
    id: 'deduplicate',
    name: 'DEDUPLICATE',
    icon: '🔍',
    type: 'gate',
    description: 'Remove duplicate tokens from batch',
    confidence: 0.8,
    playCount: 0,
    successCount: 0,
    action: 'deduplicateTokens',
    params: { hours: 24 }
  },
  {
    id: 'batch_process',
    name: 'BATCH PROCESS',
    icon: '📦',
    type: 'gate',
    description: 'Process entire batch through the quality gate',
    confidence: 0.7,
    playCount: 0,
    successCount: 0,
    action: 'batchThroughGate',
    params: {}
  },

  // 💾 STORAGE CARDS — wrap Supabase
  {
    id: 'store_token',
    name: 'STORE TOKEN',
    icon: '💾',
    type: 'storage',
    description: 'Persist worthy tokens to Supabase concepts',
    confidence: 0.9,
    playCount: 0,
    successCount: 0,
    action: 'storeToken',
    params: {}
  },
  {
    id: 'query_memory',
    name: 'QUERY MEMORY',
    icon: '🔎',
    type: 'storage',
    description: 'Search existing concepts for related tokens',
    confidence: 0.6,
    playCount: 0,
    successCount: 0,
    action: 'queryMemory',
    params: { limit: 10 }
  },

  // 🎯 MISSION CARDS
  {
    id: 'manual_signal',
    name: 'MANUAL SIGNAL',
    icon: '✍️',
    type: 'mission',
    description: 'Process a manual 1-3 word signal through gate',
    confidence: 0.7,
    playCount: 0,
    successCount: 0,
    action: 'processManualSignal',
    params: {}
  },
];

// ── HERMES VOICE LINES ──
export const HERMES_LINES = {
  draw: [
    "The cards whisper from the aether...",
    "Drawing from the spiral...",
    "Fate deals me these...",
  ],
  play: [
    "Executing with winged precision.",
    "Swift as thought between realms.",
    "The card activates...",
  ],
  success: [
    "Tokens found! The trail warms.",
    "Quality tokens pass the gate.",
    "Worthy concepts added to memory.",
  ],
  failure: [
    "This card yields nothing. I note this.",
    "The gate rejected all. The card weakens.",
    "Empty harvest. Learning...",
  ],
  evolve: [
    "I feel a mutation... the deck changes.",
    "Evolution! New patterns in the cards.",
    "The deck remembers. It adapts.",
  ],
};
