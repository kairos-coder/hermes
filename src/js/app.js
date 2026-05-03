import { createClient } from '@supabase/supabase-js';
import { loadModel, onStateChange, isReady, ModelState } from './core/semantic-core.js';
import { HermesGate } from './core/hermes-gate.js';
import { FAST_SOURCES, SLOW_SOURCES } from './spirals/source-registry.js';

// Supabase config
const SUPABASE_URL = 'https://kzcucjcyxybypncbdbws.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_saeUHGocDah-T2_709M6Fg_g26JtLXw';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let gate = null;
let fastInterval = null;
let slowInterval = null;
let fastCountdown = 16.18;
let slowSeconds = 3600;

// ============================================================
// UI Rendering (simplified - can be moved to separate module)
// ============================================================
const html = `
    <div class="header">
        <div><h1>⚡ HER<span>MES</span></h1>
        <div class="header-sub">DUAL SPIRAL · KAIROS KERNEL</div></div>
        <div class="live-badge"><span class="pulse-dot"></span><span id="liveTime">—</span>
        <span id="modelBadge" style="margin-left:12px;font-size:0.6rem;">🧠 loading...</span></div>
    </div>
    <div class="stats-row" id="statsRow"></div>
    <div class="dual" id="dualPanel"></div>
    <div class="panel"><div class="input-row">
        <input type="text" id="signalInput" placeholder="Enter 1–3 word reflex...">
        <button id="submitBtn" class="primary">⚡ Process</button>
    </div></div>
    <div class="log-panel"><div class="log-head">◈ GATE LOG</div>
    <div class="log-body" id="logBody"></div></div>
`;

function renderUI() {
    document.getElementById('hermes-root').innerHTML = html;
}

function updateStatsUI(passed, rejected, total) {
    const statsHtml = `
        <div class="stat"><div class="stat-num">${total}</div><div class="stat-label">TOTAL</div></div>
        <div class="stat"><div class="stat-num">${passed}</div><div class="stat-label">PASSED</div></div>
        <div class="stat"><div class="stat-num">${rejected}</div><div class="stat-label">REJECTED</div></div>
        <div class="stat"><div id="modelStatus" class="stat-num">⏳</div><div class="stat-label">SEMANTIC</div></div>
    `;
    document.getElementById('statsRow').innerHTML = statsHtml;
}

function renderDualPanel() {
    const dualHtml = `
        <div class="spiral fast"><div class="spiral-head">
            <div><div class="spiral-name">⚡ FAST SPIRAL</div></div>
            <div><div class="spiral-counter" id="fastTimer">16.18</div></div>
        </div><div class="narrative" id="fastNarrative"></div>
        <button id="fastBtn" class="spiral-btn">⚡ Hunt Now</button></div>
        <div class="spiral slow"><div class="spiral-head">
            <div><div class="spiral-name">🐢 SLOW SPIRAL</div></div>
            <div><div class="spiral-counter" id="slowTimer">60:00</div></div>
        </div><div class="narrative" id="slowNarrative"></div>
        <button id="slowBtn" class="spiral-btn">📡 Fetch Now</button></div>
    `;
    document.getElementById('dualPanel').innerHTML = dualHtml;
}

function log(message, type = 'info') {
    const logBody = document.getElementById('logBody');
    if (!logBody) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logBody.insertBefore(entry, logBody.firstChild);
    while (logBody.children.length > 50) logBody.removeChild(logBody.lastChild);
}

// ============================================================
// Fast Spiral
// ============================================================
async function runFastCycle() {
    log('⚡ Fast spiral hunting...', 'gate');
    for (const source of FAST_SOURCES) {
        try {
            const concepts = await source.fetch();
            const results = await gate.processBatch(concepts);
            const added = results.filter(r => r.success).length;
            log(`${source.icon} ${source.name}: +${added}/${concepts.length}`, added ? 'ok' : 'warn');
        } catch (err) {
            log(`${source.name} error: ${err.message}`, 'error');
        }
    }
    updateStatsUI(gate.stats.passed, gate.stats.rejected, gate.stats.passed + gate.stats.rejected);
    fastCountdown = 16.18;
}

// ============================================================
// Slow Spiral
// ============================================================
async function runSlowCycle() {
    log('🐢 Slow spiral fetching...', 'gate');
    for (const source of SLOW_SOURCES) {
        try {
            const concepts = await source.fetch();
            const results = await gate.processBatch(concepts.slice(0, 10));
            const added = results.filter(r => r.success).length;
            log(`${source.name}: +${added}/${concepts.length}`, added ? 'ok' : 'warn');
        } catch (err) {
            log(`${source.name} error: ${err.message}`, 'error');
        }
    }
    updateStatsUI(gate.stats.passed, gate.stats.rejected, gate.stats.passed + gate.stats.rejected);
    slowSeconds = 3600;
}

// ============================================================
// Countdown Timers
// ============================================================
function startFastTimer() {
    setInterval(() => {
        fastCountdown = Math.max(0, fastCountdown - 0.1);
        const timerEl = document.getElementById('fastTimer');
        if (timerEl) timerEl.textContent = fastCountdown.toFixed(2);
        if (fastCountdown <= 0) runFastCycle();
    }, 100);
}

function startSlowTimer() {
    setInterval(() => {
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
async function handleManualSubmit() {
    const input = document.getElementById('signalInput')?.value.trim();
    if (!input) return;
    const result = await gate.process({ body: input, source: 'terminal', source_loop: 'slow', score: 75, metadata: {} });
    if (result.success) {
        log(`✓ Accepted: "${input}" (score: ${result.score})`, 'ok');
        document.getElementById('signalInput').value = '';
    } else {
        log(`✗ Rejected: "${input}" — ${result.error}`, 'reject');
    }
    updateStatsUI(gate.stats.passed, gate.stats.rejected, gate.stats.passed + gate.stats.rejected);
}

// ============================================================
// Model Status UI
// ============================================================
function updateModelStatusUI(state, message) {
    const badge = document.getElementById('modelBadge');
    const statusEl = document.getElementById('modelStatus');
    if (!badge) return;
    
    const icons = { unloaded: '⚪', loading: '⏳', ready: '🧠✅', error: '❌' };
    const colors = { unloaded: '#6a7a8a', loading: '#f39c12', ready: '#2ecc71', error: '#e74c3c' };
    
    badge.innerHTML = `${icons[state] || '🧠'} ${state}`;
    badge.style.color = colors[state] || '#6a7a8a';
    
    if (statusEl) {
        statusEl.innerHTML = state === 'ready' ? '✓' : '⏳';
        statusEl.style.color = colors[state];
    }
    
    if (state === 'ready') log('🧠 Semantic model loaded and cached', 'ok');
}

// ============================================================
// Initialize
// ============================================================
async function init() {
    renderUI();
    renderDualPanel();
    
    gate = new HermesGate(sb);
    
    // Start model loading in background
    loadModel().catch(err => log(`Model load failed: ${err.message}`, 'error'));
    onStateChange(updateModelStatusUI);
    
    // Wire events
    setTimeout(() => {
        document.getElementById('fastBtn')?.addEventListener('click', runFastCycle);
        document.getElementById('slowBtn')?.addEventListener('click', runSlowCycle);
        document.getElementById('submitBtn')?.addEventListener('click', handleManualSubmit);
        document.getElementById('signalInput')?.addEventListener('keypress', e => e.key === 'Enter' && handleManualSubmit());
    }, 100);
    
    startFastTimer();
    startSlowTimer();
    
    // Initial runs
    setTimeout(() => runFastCycle(), 2000);
    setTimeout(() => runSlowCycle(), 5000);
    
    // Clock
    setInterval(() => {
        const timeEl = document.getElementById('liveTime');
        if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
    }, 1000);
    
    log('🏛️ Hermes Dual Spiral initialized', 'gate');
}

init();
