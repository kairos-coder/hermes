import { createClient } from '@supabase/supabase-js';
import { loadModel, onStateChange, ModelState } from './core/semantic-core.js';
import { HermesGate } from './core/hermes-gate.js';
import { FAST_SOURCES, SLOW_SOURCES } from './source-registry.js';

// Supabase configuration
const SUPABASE_URL = 'https://kzcucjcyxybypncbdbws.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_saeUHGocDah-T2_709M6Fg_g26JtLXw';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let gate = null;
let fastCountdown = 16.18;
let slowSeconds = 3600;
let fastInterval = null;
let slowInterval = null;

// ============================================================
// UI Rendering
// ============================================================
function renderUI() {
    const html = `
        <div class="container">
            <div class="header">
                <div>
                    <h1>⚡ HER<span>MES</span></h1>
                    <div class="header-sub">DUAL SPIRAL · KAIROS KERNEL · LIVE 2026</div>
                </div>
                <div class="live-badge">
                    <span class="pulse-dot"></span>
                    <span id="liveTime">—</span>
                    <span id="modelBadge" class="model-badge">🧠 loading...</span>
                </div>
            </div>

            <div class="stats-row" id="statsRow">
                <div class="stat"><div class="stat-num">—</div><div class="stat-label">TOTAL</div></div>
                <div class="stat"><div class="stat-num">—</div><div class="stat-label">PASSED</div></div>
                <div class="stat"><div class="stat-num">—</div><div class="stat-label">REJECTED</div></div>
                <div class="stat"><div id="modelStatus" class="stat-num">⏳</div><div class="stat-label">SEMANTIC</div></div>
            </div>

            <div class="dual" id="dualPanel">
                <div class="spiral fast">
                    <div class="spiral-head">
                        <div><div class="spiral-name">⚡ FAST SPIRAL</div><div class="spiral-freq">16.18s cycle</div></div>
                        <div><div class="spiral-counter" id="fastTimer">16.18</div><div class="spiral-counter-label">next cycle</div></div>
                    </div>
                    <div class="narrative" id="fastNarrative"><div class="nar-line">🌀 Awaiting first pulse...</div></div>
                    <button id="fastBtn" class="spiral-btn">⚡ Hunt Now</button>
                </div>
                <div class="spiral slow">
                    <div class="spiral-head">
                        <div><div class="spiral-name">🐢 SLOW SPIRAL</div><div class="spiral-freq">~60 minutes</div></div>
                        <div><div class="spiral-counter" id="slowTimer">60:00</div><div class="spiral-counter-label">until dispatch</div></div>
                    </div>
                    <div class="narrative" id="slowNarrative"><div class="nar-line">🐢 Awaiting first cycle...</div></div>
                    <button id="slowBtn" class="spiral-btn">📡 Fetch Now</button>
                </div>
            </div>

            <div class="panel">
                <div class="panel-title">◈ MANUAL SIGNAL INPUT</div>
                <div class="input-row">
                    <input type="text" id="signalInput" placeholder="Enter 1–3 word reflex…">
                    <span class="word-count" id="wordCount">0 / 1–3</span>
                    <button id="submitBtn" class="primary">⚡ Process</button>
                    <button id="clearInputBtn">Clear</button>
                </div>
            </div>

            <div class="panel">
                <div class="panel-title">◈ SOURCE CONTROLS</div>
                <div class="btn-row">
                    <button id="scrapeAllBtn">🌊 Scrape All Sources</button>
                    <button id="mythicBtn">🏛️ Mythic Only</button>
                </div>
            </div>

            <div class="log-panel">
                <div class="log-head"><span>◈ GATE LOG</span><span id="logCount">0 entries</span></div>
                <div class="log-body" id="logBody"><div class="log-entry gate">[system] Hermes initialising…</div></div>
            </div>
        </div>
    `;
    document.getElementById('hermes-root').innerHTML = html;
}

function updateStatsUI() {
    if (!gate) return;
    const stats = gate.getStats();
    const total = stats.passed + stats.rejected;
    document.querySelector('.stats-row .stat:nth-child(1) .stat-num').textContent = total;
    document.querySelector('.stats-row .stat:nth-child(2) .stat-num').textContent = stats.passed;
    document.querySelector('.stats-row .stat:nth-child(3) .stat-num').textContent = stats.rejected;
}

function log(message, type = 'info') {
    const logBody = document.getElementById('logBody');
    if (!logBody) return;
    const entry = document.createElement('div');
    const typeClass = type === 'ok' ? 'ok' : (type === 'error' ? 'error' : (type === 'gate' ? 'gate' : 'warn'));
    entry.className = `log-entry ${typeClass}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logBody.insertBefore(entry, logBody.firstChild);
    while (logBody.children.length > 50) logBody.removeChild(logBody.lastChild);
    
    const logCount = document.getElementById('logCount');
    if (logCount) logCount.textContent = `${document.querySelectorAll('.log-entry').length} entries`;
}

function narrate(loop, message, type = '') {
    const container = document.getElementById(loop === 'fast' ? 'fastNarrative' : 'slowNarrative');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `nar-line ${type}`;
    el.textContent = `[${new Date().toLocaleTimeString().slice(0,5)}] ${message}`;
    container.appendChild(el);
    while (container.children.length > 12) container.removeChild(container.firstChild);
    container.scrollTop = container.scrollHeight;
}

// ============================================================
// Fast Spiral
// ============================================================
async function runFastCycle() {
    narrate('fast', '⚡ Hunting cycle started', 'gate');
    log('Fast spiral hunting...', 'gate');
    
    for (const source of FAST_SOURCES) {
        try {
            narrate('fast', `${source.icon} ${source.name}: hunting...`);
            const concepts = await source.fetch();
            const results = await gate.processBatch(concepts);
            const added = results.filter(r => r.success).length;
            const rejected = results.filter(r => !r.success).length;
            narrate('fast', `${source.icon} ${source.name}: +${added} passed, ${rejected} rejected`, added > 0 ? 'ok' : 'warn');
            log(`${source.name}: +${added}/${concepts.length}`, added > 0 ? 'ok' : 'warn');
        } catch (err) {
            narrate('fast', `${source.name}: error — ${err.message}`, 'warn');
            log(`${source.name} error: ${err.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, 500));
    }
    
    narrate('fast', '🌀 Cycle complete', 'gate');
    updateStatsUI();
    fastCountdown = 16.18;
}

// ============================================================
// Slow Spiral
// ============================================================
async function runSlowCycle() {
    narrate('slow', '📡 Fetching from news APIs...', 'gate');
    log('Slow spiral fetching...', 'gate');
    
    for (const source of SLOW_SOURCES) {
        try {
            const concepts = await source.fetch();
            const results = await gate.processBatch(concepts.slice(0, 12));
            const added = results.filter(r => r.success).length;
            narrate('slow', `${source.name}: +${added} concepts`, added > 0 ? 'ok' : 'warn');
            log(`${source.name}: +${added}/${concepts.length}`, added > 0 ? 'ok' : 'warn');
        } catch (err) {
            log(`${source.name} error: ${err.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, 300));
    }
    
    narrate('slow', '📡 Dispatch complete', 'gate');
    updateStatsUI();
    slowSeconds = 3600;
}

// ============================================================
// Timers
// ============================================================
function startFastTimer() {
    if (fastInterval) clearInterval(fastInterval);
    fastInterval = setInterval(() => {
        fastCountdown = Math.max(0, fastCountdown - 0.1);
        const timerEl = document.getElementById('fastTimer');
        if (timerEl) timerEl.textContent = fastCountdown.toFixed(2);
        if (fastCountdown <= 0.01) runFastCycle();
    }, 100);
}

function startSlowTimer() {
    if (slowInterval) clearInterval(slowInterval);
    slowInterval = setInterval(() => {
        slowSeconds--;
        const m = Math.floor(slowSeconds / 60);
        const s = slowSeconds % 60;
        const timerEl = document.getElementById('slowTimer');
        if (timerEl) timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        if (slowSeconds <= 0) runSlowCycle();
    }, 1000);
}

// ============================================================
// Manual Input
// ============================================================
function updateWordCount() {
    const input = document.getElementById('signalInput');
    if (!input) return;
    const count = input.value.trim().split(/\s+/).filter(w => w.length).length;
    const el = document.getElementById('wordCount');
    if (el) {
        el.textContent = `${count} / 1–3`;
        el.className = `word-count ${count >= 1 && count <= 3 ? 'ok' : 'bad'}`;
    }
}

async function handleManualSubmit() {
    const input = document.getElementById('signalInput');
    if (!input) return;
    const body = input.value.trim();
    if (!body) return;
    
    const wc = body.split(/\s+/).length;
    if (wc < 1 || wc > 3) {
        log(`Word count ${wc} — need 1–3 words`, 'error');
        return;
    }
    
    const result = await gate.process({ 
        body, source: 'terminal', source_loop: 'slow', 
        score: 75, metadata: {} 
    });
    
    if (result.success) {
        log(`✓ Accepted: "${body}" (score: ${result.score})`, 'ok');
        input.value = '';
        updateWordCount();
    } else {
        log(`✗ Rejected: "${body}" — ${result.error}`, 'error');
    }
    updateStatsUI();
}

async function scrapeAll() {
    log('Full scrape initiated...', 'gate');
    const allConcepts = [];
    for (const source of FAST_SOURCES) {
        try {
            const concepts = await source.fetch();
            allConcepts.push(...concepts);
        } catch (err) { log(`${source.name} error: ${err.message}`, 'error'); }
    }
    const results = await gate.processBatch(allConcepts);
    const added = results.filter(r => r.success).length;
    log(`Scrape complete: ${added}/${allConcepts.length} added`, 'ok');
    updateStatsUI();
}

async function mythicOnly() {
    log('Mythic archive harvest...', 'gate');
    const mythicSource = FAST_SOURCES.find(s => s.name === 'Mythic Archive');
    if (mythicSource) {
        const concepts = await mythicSource.fetch();
        const results = await gate.processBatch(concepts);
        const added = results.filter(r => r.success).length;
        log(`Mythic: +${added} concepts`, 'ok');
    }
    updateStatsUI();
}

function updateModelStatusUI(state, message) {
    const badge = document.getElementById('modelBadge');
    const statusEl = document.getElementById('modelStatus');
    if (!badge) return;
    
    const icons = { unloaded: '⚪', loading: '⏳', ready: '🧠', error: '❌' };
    const labels = { unloaded: 'model: waiting', loading: 'model: loading...', ready: 'model: semantic', error: 'model: error' };
    const colors = { unloaded: '#6a7a8a', loading: '#f39c12', ready: '#2ecc71', error: '#e74c3c' };
    
    badge.textContent = `${icons[state] || '🧠'} ${labels[state] || state}`;
    badge.style.color = colors[state] || '#6a7a8a';
    if (statusEl) {
        statusEl.textContent = state === 'ready' ? '✓' : (state === 'loading' ? '⏳' : '○');
        statusEl.style.color = colors[state];
    }
    if (state === 'ready') log('Semantic model loaded and cached', 'ok');
}

// ============================================================
// Initialize
// ============================================================
async function init() {
    renderUI();
    
    gate = new HermesGate(sb);
    
    // Start model loading in background
    loadModel().catch(err => log(`Model load failed: ${err.message}`, 'error'));
    onStateChange(updateModelStatusUI);
    
    // Wire events after DOM is ready
    setTimeout(() => {
        document.getElementById('fastBtn')?.addEventListener('click', () => runFastCycle());
        document.getElementById('slowBtn')?.addEventListener('click', () => runSlowCycle());
        document.getElementById('submitBtn')?.addEventListener('click', handleManualSubmit);
        document.getElementById('clearInputBtn')?.addEventListener('click', () => {
            const input = document.getElementById('signalInput');
            if (input) { input.value = ''; updateWordCount(); }
        });
        document.getElementById('scrapeAllBtn')?.addEventListener('click', scrapeAll);
        document.getElementById('mythicBtn')?.addEventListener('click', mythicOnly);
        document.getElementById('signalInput')?.addEventListener('input', updateWordCount);
        document.getElementById('signalInput')?.addEventListener('keypress', e => e.key === 'Enter' && handleManualSubmit());
    }, 100);
    
    startFastTimer();
    startSlowTimer();
    
    // Clock
    setInterval(() => {
        const timeEl = document.getElementById('liveTime');
        if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
    }, 1000);
    
    // Initial runs
    setTimeout(() => runFastCycle(), 3000);
    setTimeout(() => runSlowCycle(), 8000);
    
    log('🏛️ Hermes Dual Spiral active — quality gate armed', 'gate');
}

init();
