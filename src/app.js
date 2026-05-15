// ═══════════════════════════════════════════
// HERMES v3 · Card-Playing Browser Agent
// ═══════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import { loadModel, onStateChange, isReady } from './semantic-core.js';
import { HermesGate } from './hermes-gate.js';
import { FAST_SOURCES, SLOW_SOURCES } from './source-registry.js';
import { BASE_DECK, CONFIG, HERMES_LINES } from './config.js';

// ── Supabase ──
const SUPABASE_URL = 'https://kzcucjcyxybypncbdbws.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_saeUHGocDah-T2_709M6Fg_g26JtLXw';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── State ──
let gate = null;
let deck = { cards: [], hand: [], discard: [], history: [] };
let tokens = [];
let mission = { objective: 'find_tokens', target: 5, found: 0 };
let isPlaying = false;

// ── Initialize Deck ──
function initDeck() {
  deck.cards = JSON.parse(JSON.stringify(BASE_DECK));
  deck.hand = [];
  deck.discard = [];
  deck.history = [];
  shuffleDeck();
}

function shuffleDeck() {
  for (let i = deck.cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
  }
}

function drawHand() {
  // Reshuffle discard if needed
  if (deck.cards.length < CONFIG.HAND_SIZE) {
    deck.cards.push(...deck.discard);
    deck.discard = [];
    shuffleDeck();
  }
  
  // Return any remaining hand to discard
  if (deck.hand.length > 0) {
    deck.discard.push(...deck.hand);
  }
  
  deck.hand = deck.cards.splice(0, CONFIG.HAND_SIZE);
  renderAll();
  log('🃏 ' + pickLine(HERMES_LINES.draw), 'card');
  log(`Drew: ${deck.hand.map(c => c.icon + ' ' + c.name).join(', ')}`, 'system');
}

// ── Play Sequence ──
async function playSequence() {
  if (isPlaying || deck.hand.length === 0) return;
  isPlaying = true;
  
  const cards = [...deck.hand];
  log('▶ ' + pickLine(HERMES_LINES.play), 'play');
  
  for (const card of cards) {
    const index = deck.hand.findIndex(c => c.id === card.id);
    if (index === -1) continue;
    
    const playedCard = deck.hand.splice(index, 1)[0];
    playedCard.playCount++;
    
    log(`🃏 ${playedCard.icon} ${playedCard.name}...`, 'play');
    highlightCard(playedCard.id);
    
    try {
      const result = await executeCard(playedCard);
      
      if (result.success) {
        log(`✅ ${pickLine(HERMES_LINES.success)}`, 'ok');
        log(`   ${result.data || result.count + ' items'}`, 'ok');
        playedCard.successCount++;
        playedCard.confidence = Math.min(1, playedCard.confidence * 1.1);
        
        // Check tokens
        if (result.tokens) {
          tokens.push(...result.tokens.filter(t => !tokens.includes(t)));
          mission.found = tokens.length;
          if (mission.found >= mission.target) {
            log(`🎯 MISSION COMPLETE! ${mission.found} tokens found!`, 'ok');
          }
        }
      } else {
        log(`❌ ${pickLine(HERMES_LINES.failure)}`, 'error');
        log(`   ${result.error || 'No result'}`, 'error');
        playedCard.confidence = Math.max(0.1, playedCard.confidence * 0.95);
      }
    } catch (err) {
      log(`❌ ${playedCard.name} errored: ${err.message}`, 'error');
      playedCard.confidence = Math.max(0.1, playedCard.confidence * 0.9);
    }
    
    deck.discard.push(playedCard);
    deck.history.push({ card: playedCard.id, success: playedCard.confidence > 0.5, time: Date.now() });
    
    await sleep(400);
    renderAll();
  }
  
  // Discard any remaining hand
  if (deck.hand.length > 0) {
    deck.discard.push(...deck.hand);
    deck.hand = [];
  }
  
  isPlaying = false;
  renderAll();
  
  // Auto-evolve periodically
  if (deck.history.length % CONFIG.EVOLUTION_THRESHOLD === 0) {
    evolveDeck();
  }
}

// ── Execute Card ──
async function executeCard(card) {
  switch (card.action) {
    // ── SOURCE CARDS ──
    case 'fetchFastSources': {
      const all = [];
      for (const src of FAST_SOURCES) {
        try {
          const concepts = await src.fetch();
          all.push(...concepts);
        } catch(e) { console.warn(src.name, e); }
      }
      return { success: all.length > 0, data: `${all.length} concepts`, count: all.length, tokens: all.map(c => c.body).filter(Boolean) };
    }
    
    case 'fetchSlowSources': {
      const all = [];
      for (const src of SLOW_SOURCES) {
        try {
          const concepts = await src.fetch();
          all.push(...concepts.slice(0, 12));
        } catch(e) { console.warn(src.name, e); }
      }
      return { success: all.length > 0, data: `${all.length} concepts`, count: all.length, tokens: all.map(c => c.body).filter(Boolean) };
    }
    
    case 'fetchMythicOnly': {
      const src = FAST_SOURCES.find(s => s.name === 'Mythic Archive');
      if (!src) return { success: false, error: 'Mythic source not found' };
      const concepts = await src.fetch();
      return { success: concepts.length > 0, count: concepts.length, tokens: concepts.map(c => c.body) };
    }
    
    // ── GATE CARDS ──
    case 'runGateCheck': {
      if (!gate) return { success: false, error: 'Gate not ready' };
      const testBodies = tokens.length > 0 ? tokens.slice(-10) : ['hermes', 'ai', 'neural', 'quantum'];
      let passed = 0;
      for (const body of testBodies) {
        const result = await gate.process({ body, source: 'card_deck', source_loop: 'fast', score: 60, metadata: {} });
        if (result.success) passed++;
      }
      return { success: passed > 0, count: passed, data: `${passed}/${testBodies.length} passed gate` };
    }
    
    case 'deduplicateTokens': {
      const before = tokens.length;
      tokens = [...new Set(tokens)];
      return { success: true, data: `Removed ${before - tokens.length} duplicates`, count: tokens.length };
    }
    
    // ── STORAGE CARDS ──
    case 'storeToken': {
      if (!gate) return { success: false, error: 'Gate not ready' };
      const toStore = tokens.slice(0, 5);
      let stored = 0;
      for (const body of toStore) {
        const result = await gate.process({ body, source: 'hermes_card', source_loop: 'fast', score: 70, metadata: {} });
        if (result.success) stored++;
      }
      return { success: stored > 0, stored, total: toStore.length };
    }
    
    case 'queryMemory': {
      const { data, error } = await sb.from('concepts').select('*').order('created_at', { ascending: false }).limit(10);
      if (error) return { success: false, error: error.message };
      return { success: true, data: `${data.length} memories`, count: data.length, tokens: data.map(d => d.body) };
    }
    
    // ── SEMANTIC CARDS ──
    case 'semanticFilter': {
      if (!isReady()) return { success: false, error: 'Semantic model not loaded' };
      return { success: true, data: 'Semantic filter applied', count: tokens.length };
    }
    
    case 'clusterTokens': {
      const clusters = { tech: [], mythos: [], general: [] };
      for (const t of tokens) {
        if (t.match(/ai|tech|code|data|cloud|neural/i)) clusters.tech.push(t);
        else if (t.match(/myth|god|titan|ancient|phoenix|ouroboros/i)) clusters.mythos.push(t);
        else clusters.general.push(t);
      }
      return { success: true, data: `T:${clusters.tech.length} M:${clusters.mythos.length} G:${clusters.general.length}`, count: tokens.length };
    }
    
    // ── EVOLUTION CARD ──
    case 'evolveDeck': {
      evolveDeck();
      return { success: true, data: 'Deck evolved' };
    }
    
    default:
      return { success: false, error: `Unknown action: ${card.action}` };
  }
}

// ── Evolve Deck ──
function evolveDeck() {
  // Mutate low-confidence cards
  deck.cards = deck.cards.map(card => {
    if (card.confidence < 0.3 && card.playCount > 5) {
      const evolved = {
        ...card,
        id: card.id + '_' + Date.now(),
        name: card.name + ' ✧',
        confidence: 0.5,
        playCount: 0,
        successCount: 0,
        description: card.description + ' Evolved.',
        generation: (card.generation || 0) + 1,
      };
      return evolved;
    }
    return card;
  });

  // Remove very low confidence discard
  deck.discard = deck.discard.filter(c => c.confidence > 0.15 || c.playCount < 10);

  log('🔄 ' + pickLine(HERMES_LINES.evolve), 'evolve');
  renderAll();
}

// ── Helpers ──
function pickLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let highlightedCard = null;
function highlightCard(cardId) {
  highlightedCard = cardId;
  setTimeout(() => { highlightedCard = null; renderAll(); }, 1500);
}

// ── Log ──
function log(message, type = 'info') {
  const logBody = document.getElementById('logBody');
  if (!logBody) return;
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logBody.insertBefore(entry, logBody.firstChild);
  while (logBody.children.length > 50) logBody.removeChild(logBody.lastChild);
  console.log(`[${type}] ${message}`);
}

// ── UI Rendering ──
function renderAll() {
  const root = document.getElementById('hermes-root');
  if (!root) return;
  
  const deckStats = getDeckStats();
  
  root.innerHTML = `
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div>
          <h1>🪶 HER<span>MES</span></h1>
          <div class="header-sub">CARD-PLAYING AGENT · TOKEN HUNTER</div>
        </div>
        <div class="live-badge">
          <span class="pulse-dot"></span>
          <span id="liveTime">${new Date().toLocaleTimeString()}</span>
          <span class="model-badge" id="modelBadge">🧠 ${isReady() ? 'SEMANTIC READY' : 'loading...'}</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat">
          <div class="stat-num">${tokens.length}</div>
          <div class="stat-label">TOKENS</div>
        </div>
        <div class="stat">
          <div class="stat-num">${deckStats.deckSize}</div>
          <div class="stat-label">DECK</div>
        </div>
        <div class="stat">
          <div class="stat-num">${deckStats.totalPlays}</div>
          <div class="stat-label">PLAYS</div>
        </div>
        <div class="stat">
          <div class="stat-num">${Math.round(deckStats.avgConfidence * 100)}%</div>
          <div class="stat-label">CONFIDENCE</div>
        </div>
      </div>

      <!-- Mission -->
      <div class="panel">
        <div class="panel-title">🎯 MISSION</div>
        <div style="display:flex;align-items:center;gap:0.8rem;">
          <div style="flex:1;">
            <div style="font-size:0.7rem;color:var(--text);">Find tokens in the wild</div>
            <div style="font-size:0.5rem;color:var(--text-dim);">Target: ${mission.target} tokens</div>
          </div>
          <div class="stat" style="min-width:60px;">
            <div class="stat-num" style="color:${mission.found >= mission.target ? 'var(--ok)' : 'var(--gold)'}">${mission.found}/${mission.target}</div>
          </div>
        </div>
        ${mission.found >= mission.target ? '<div style="margin-top:0.5rem;padding:0.4rem;background:var(--ok-dim);border-radius:4px;font-family:var(--font-mono);font-size:0.5rem;color:var(--ok);">🎉 MISSION COMPLETE! Draw new hand to continue hunting.</div>' : ''}
      </div>

      <!-- Card Hand -->
      <div class="card-panel">
        <div class="card-panel-header">
          <span class="panel-title">🃏 HAND</span>
          <div class="card-stats">
            <span>🃏 ${deckStats.deckSize}</span> deck ·
            <span>🗑️ ${deckStats.discardSize}</span> discard
          </div>
        </div>
        <div class="hand-row">
          ${deck.hand.length === 0 ? '' : deck.hand.map(card => `
            <div class="card-item type-${card.type}${highlightedCard === card.id ? ' token-found' : ''}" 
                 style="opacity:${0.5 + card.confidence * 0.5}">
              <div class="card-icon">${card.icon}</div>
              <div class="card-name">${card.name}</div>
              <div class="card-desc">${card.description}</div>
              <div class="card-confidence">${Math.round(card.confidence * 100)}%</div>
              <div class="card-plays">${card.playCount} plays</div>
            </div>
          `).join('')}
        </div>
        <div class="card-actions-row">
          <button class="card-btn primary" onclick="window.hermesPlay()" ${isPlaying || deck.hand.length === 0 ? 'disabled' : ''}>
            ▶ PLAY SEQUENCE
          </button>
          <button class="card-btn" onclick="window.hermesDraw()" ${isPlaying ? 'disabled' : ''}>
            🃏 DRAW HAND
          </button>
          <button class="card-btn" onclick="window.hermesEvolve()" ${isPlaying ? 'disabled' : ''}>
            🔄 EVOLVE
          </button>
        </div>
        <div class="deck-info">
          <span>Top card:</span> ${deckStats.topCard ? deckStats.topCard.icon + ' ' + deckStats.topCard.name + ' (' + Math.round(deckStats.topCard.confidence * 100) + '%)' : 'none'}
          <span style="margin-left:auto;">Plays: ${deckStats.totalPlays}</span>
        </div>
      </div>

      <!-- Manual Input -->
      <div class="panel">
        <div class="panel-title">✍️ MANUAL SIGNAL</div>
        <div class="input-row">
          <input type="text" id="signalInput" placeholder="Enter 1–3 word token..." 
                 onkeydown="if(event.key==='Enter'){window.hermesSignal(document.getElementById('signalInput').value);document.getElementById('signalInput').value='';}">
          <button class="primary" onclick="const i=document.getElementById('signalInput');window.hermesSignal(i.value);i.value='';">SEND</button>
        </div>
      </div>

      <!-- Token Display -->
      <div class="panel">
        <div class="panel-title">🎯 FOUND TOKENS (${tokens.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.3rem;font-family:var(--font-mono);font-size:0.5rem;">
          ${tokens.length === 0 ? '<span style="color:var(--text-dim);">No tokens yet. Play cards to hunt.</span>' : 
            tokens.slice(-20).reverse().map(t => 
              `<span style="padding:0.15rem 0.4rem;background:var(--surface);border-radius:10px;border:1px solid var(--border);">${t}</span>`
            ).join('')}
        </div>
      </div>

      <!-- Log -->
      <div class="log-panel">
        <div class="log-head">
          <span>📜 HERMES SPEAKS</span>
          <span>${document.querySelectorAll('.log-entry')?.length || 0} entries</span>
        </div>
        <div class="log-body" id="logBody">
          <div class="log-entry gate">[system] Hermes v3 ready — draw cards to begin</div>
        </div>
      </div>
    </div>
  `;
  
  // Update time
  setInterval(() => {
    const el = document.getElementById('liveTime');
    if (el) el.textContent = new Date().toLocaleTimeString();
  }, 1000);
}

function getDeckStats() {
  const allCards = [...deck.cards, ...deck.hand, ...deck.discard];
  return {
    deckSize: deck.cards.length,
    discardSize: deck.discard.length,
    totalPlays: allCards.reduce((s, c) => s + c.playCount, 0),
    avgConfidence: allCards.length > 0 ? allCards.reduce((s, c) => s + c.confidence, 0) / allCards.length : 0,
    topCard: allCards.sort((a, b) => b.confidence - a.confidence)[0],
  };
}

// ── Signal Handler ──
async function handleSignal(body) {
  if (!body || !gate) return;
  const words = body.trim().split(/\s+/).filter(w => w.length);
  if (words.length < 1 || words.length > 3) {
    log('Signal must be 1–3 words', 'error');
    return;
  }
  
  const result = await gate.process({ body, source: 'terminal', source_loop: 'slow', score: 75, metadata: {} });
  if (result.success) {
    tokens.push(body.toLowerCase().trim());
    mission.found = tokens.length;
    log(`✓ Accepted: "${body}"`, 'ok');
    renderAll();
  } else {
    log(`✗ Rejected: "${body}" — ${result.error}`, 'error');
  }
}

// ── Global API ──
window.hermesDraw = drawHand;
window.hermesPlay = playSequence;
window.hermesEvolve = evolveDeck;
window.hermesSignal = handleSignal;

// ── Init ──
async function init() {
  // Initialize gate
  gate = new HermesGate(sb);
  
  // Initialize deck
  initDeck();
  
  // Start model loading
  loadModel().catch(err => console.warn('Model load:', err));
  onStateChange((state, msg) => {
    const badge = document.getElementById('modelBadge');
    if (badge) {
      badge.textContent = state === 'ready' ? '🧠 SEMANTIC READY' : `🧠 ${state}`;
    }
    if (state === 'ready') log('Semantic model cached and ready', 'ok');
  });
  
  // Render
  renderAll();
  
  // Auto-draw first hand
  setTimeout(() => drawHand(), 500);
  
  // Clock
  setInterval(() => {
    const el = document.getElementById('liveTime');
    if (el) el.textContent = new Date().toLocaleTimeString();
  }, 1000);
  
  log('🪶 Hermes v3 online. Card-playing agent ready.', 'gate');
  console.log('🪶 Hermes v3 — Card-Playing Browser Agent');
  console.log('🃏 Draw hand · ▶ Play sequence · 🔄 Evolve deck');
}

init();
