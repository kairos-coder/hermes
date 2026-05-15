// config.js - Cards, missions, and constants

export const CONFIG = {
  HAND_SIZE: 5,
  MAX_DECK_SIZE: 30,
  EVOLUTION_THRESHOLD: 3, // Plays before evolution triggers
  CONFIDENCE_DECAY: 0.95, // Confidence multiplier per failed play
  CONFIDENCE_GROWTH: 1.1, // Confidence multiplier per successful play
};

// ── The Deck: Browser Action Cards ──
export const BASE_DECK = [
  {
    id: 'navigate',
    name: 'NAVIGATE',
    icon: '🧭',
    type: 'movement',
    description: 'Travel to a URL',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    action: 'navigateTo',
    params: { url: '' }
  },
  {
    id: 'extract_text',
    name: 'EXTRACT TEXT',
    icon: '📄',
    type: 'extraction',
    description: 'Pull text from the page',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    action: 'extractText',
    params: { selector: 'body' }
  },
  {
    id: 'extract_links',
    name: 'EXTRACT LINKS',
    icon: '🔗',
    type: 'extraction',
    description: 'Find all links on the page',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    action: 'extractLinks',
    params: {}
  },
  {
    id: 'search_dom',
    name: 'SEARCH DOM',
    icon: '🔍',
    type: 'search',
    description: 'Search page for specific text',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    action: 'searchDOM',
    params: { query: '' }
  },
  {
    id: 'click_element',
    name: 'CLICK ELEMENT',
    icon: '👆',
    type: 'interaction',
    description: 'Click on a page element',
    confidence: 0.4,
    playCount: 0,
    successCount: 0,
    action: 'clickElement',
    params: { selector: '' }
  },
  {
    id: 'wait_for',
    name: 'WAIT FOR',
    icon: '⏳',
    type: 'control',
    description: 'Wait for element or time',
    confidence: 0.6,
    playCount: 0,
    successCount: 0,
    action: 'waitFor',
    params: { ms: 1000 }
  },
  {
    id: 'scroll_into',
    name: 'SCROLL INTO VIEW',
    icon: '📜',
    type: 'movement',
    description: 'Scroll element into view',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    action: 'scrollIntoView',
    params: { selector: '' }
  },
  {
    id: 'filter_results',
    name: 'FILTER RESULTS',
    icon: '🪮',
    type: 'processing',
    description: 'Filter extracted data by pattern',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    action: 'filterResults',
    params: { pattern: '' }
  },
  {
    id: 'store_token',
    name: 'STORE TOKEN',
    icon: '💾',
    type: 'storage',
    description: 'Save found token to collection',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    action: 'storeToken',
    params: {}
  },
  {
    id: 'evaluate_js',
    name: 'EVALUATE JS',
    icon: '⚡',
    type: 'execution',
    description: 'Run JavaScript on the page',
    confidence: 0.3,
    playCount: 0,
    successCount: 0,
    action: 'evaluateJS',
    params: { code: '' }
  },
  {
    id: 'screenshot',
    name: 'SCREENSHOT',
    icon: '📸',
    type: 'observation',
    description: 'Capture the current page view',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    action: 'takeScreenshot',
    params: {}
  },
  {
    id: 'parse_json',
    name: 'PARSE JSON',
    icon: '📊',
    type: 'processing',
    description: 'Parse JSON from extracted text',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    action: 'parseJSON',
    params: {}
  },
];

// ── Missions ──
export const MISSIONS = [
  {
    id: 'find_tokens',
    name: 'Find Hidden Tokens',
    description: 'Search the page for hidden token patterns',
    objective: 'find_tokens',
    target: 3,
    reward: 'New card added to deck'
  },
  {
    id: 'extract_emails',
    name: 'Harvest Email Addresses',
    description: 'Find all email addresses on the page',
    objective: 'extract_pattern',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    target: 5,
    reward: 'EXTRACT card gains +0.2 confidence'
  },
  {
    id: 'map_links',
    name: 'Map the Link Structure',
    description: 'Extract and categorize all links',
    objective: 'extract_links',
    target: 10,
    reward: 'NAVIGATE card gains +0.2 confidence'
  },
];

// ── Token Patterns (what Hermes hunts) ──
export const TOKEN_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g,
  url: /https?:\/\/[^\s"'<>]+/g,
  hashtag: /#[a-zA-Z0-9_]+/g,
  mention: /@[a-zA-Z0-9_]+/g,
  currency: /\$\d{1,3}(,\d{3})*(\.\d{2})?/g,
  date: /\d{1,2}\/\d{1,2}\/\d{2,4}/g,
};

// ── Hermes Voice Lines ──
export const HERMES_LINES = {
  draw: [
    "The cards whisper to me...",
    "Let's see what fate deals us.",
    "Drawing from the aether...",
    "These will do nicely.",
  ],
  play: [
    "Watch this...",
    "Executing with precision.",
    "Like a messenger through the digital realm.",
    "Swift as winged sandals.",
  ],
  success: [
    "Found something! The trail is warm.",
    "A token reveals itself!",
    "I knew that card would work.",
    "The path becomes clearer.",
  ],
  failure: [
    "Hmm, nothing here. The card needs refinement.",
    "This sequence failed. I'll remember this.",
    "Not all paths lead to tokens. Learning...",
    "The page guards its secrets well.",
  ],
  evolve: [
    "I feel... different. The deck is changing.",
    "Evolution! New patterns emerging.",
    "The cards are learning. So am I.",
    "Mutation complete. I am more than I was.",
  ],
  idle: [
    "Waiting for a mission...",
    "The digital winds are calm.",
    "Ready when you are.",
    "Tokens won't find themselves.",
  ],
};
