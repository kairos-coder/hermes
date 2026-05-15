// card-actions.js - Executes cards using existing Hermes modules

import { FAST_SOURCES, SLOW_SOURCES } from './source-registry.js';
import { getEmbedding, getSimilarity, isReady } from './semantic-core.js';
import { passesGate } from './hermes-gate.js';

export class CardActions {
  constructor(gate, sb) {
    this.gate = gate;      // HermesGate instance
    this.sb = sb;          // Supabase client
    this.results = [];     // Accumulated results
    this.tokens = [];      // Found tokens
  }

  // ── SOURCE CARDS ──
  
  async fetchFastSources(params) {
    const allConcepts = [];
    for (const source of FAST_SOURCES) {
      try {
        const concepts = await source.fetch();
        allConcepts.push(...concepts);
      } catch (err) {
        console.warn(`${source.name} failed:`, err);
      }
    }
    this.results.push({ type: 'concepts', data: allConcepts, source: 'fast' });
    return { success: allConcepts.length > 0, data: allConcepts, count: allConcepts.length };
  }

  async fetchSlowSources(params) {
    const allConcepts = [];
    for (const source of SLOW_SOURCES) {
      try {
        const concepts = await source.fetch();
        allConcepts.push(...concepts.slice(0, 12));
      } catch (err) {
        console.warn(`${source.name} failed:`, err);
      }
    }
    this.results.push({ type: 'concepts', data: allConcepts, source: 'slow' });
    return { success: allConcepts.length > 0, data: allConcepts, count: allConcepts.length };
  }

  async fetchMythicOnly(params) {
    const mythicSource = FAST_SOURCES.find(s => s.name === 'Mythic Archive');
    if (!mythicSource) return { success: false, error: 'Mythic source not found' };
    const concepts = await mythicSource.fetch();
    this.results.push({ type: 'concepts', data: concepts, source: 'mythic' });
    return { success: concepts.length > 0, data: concepts, count: concepts.length };
  }

  // ── SEMANTIC CARDS ──

  async semanticFilter(params) {
    const lastResult = this.results[this.results.length - 1];
    if (!lastResult?.data) return { success: false, error: 'No data to filter' };
    if (!isReady()) return { success: false, error: 'Semantic model not ready' };

    const concepts = lastResult.data;
    const threshold = params.threshold || 0.7;
    const missionEmbedding = await getEmbedding('technology innovation future');

    const scored = await Promise.all(concepts.map(async (c) => {
      const emb = await getEmbedding(c.body || c.title || '');
      if (!emb) return { ...c, semanticScore: 0 };
      // Cosine similarity would go here
      return { ...c, semanticScore: 0.5 };
    }));

    const filtered = scored.filter(c => c.semanticScore >= threshold);
    lastResult.data = filtered;
    return { success: filtered.length > 0, data: filtered, count: filtered.length };
  }

  async clusterTokens(params) {
    const lastResult = this.results[this.results.length - 1];
    if (!lastResult?.data) return { success: false, error: 'No tokens to cluster' };
    if (!isReady()) return { success: false, error: 'Semantic model not ready' };

    const tokens = lastResult.data;
    // Simple clustering by embedding similarity
    const clusters = { tech: [], mythos: [], general: [] };
    
    for (const token of tokens) {
      const text = token.body || token.title || '';
      const emb = await getEmbedding(text);
      // Placeholder: real clustering would compare embeddings
      if (text.match(/ai|tech|code|data|cloud/i)) clusters.tech.push(token);
      else if (text.match(/myth|god|titan|ancient/i)) clusters.mythos.push(token);
      else clusters.general.push(token);
    }

    this.results.push({ type: 'clusters', data: clusters });
    const totalClustered = Object.values(clusters).reduce((s, a) => s + a.length, 0);
    return { success: totalClustered > 0, data: clusters, count: totalClustered };
  }

  async scoreNovelty(params) {
    const lastResult = this.results[this.results.length - 1];
    if (!lastResult?.data) return { success: false, error: 'No tokens to score' };

    const tokens = lastResult.data;
    tokens.forEach(t => {
      t.score = (t.score || 50) + Math.floor(Math.random() * 20);
      t.noveltyBoosted = true;
    });

    return { success: true, data: tokens, count: tokens.length };
  }

  // ── GATE CARDS ──

  async runGateCheck(params) {
    const lastResult = this.results[this.results.length - 1];
    if (!lastResult?.data) return { success: false, error: 'No data for gate' };

    const items = Array.isArray(lastResult.data) ? lastResult.data : [lastResult.data];
    const passed = [];
    const rejected = [];

    for (const item of items) {
      const body = item.body || item.title || '';
      const gateResult = passesGate(body);
      if (gateResult.pass) {
        passed.push({ ...item, scoreBoost: gateResult.scoreBoost });
      } else {
        rejected.push({ ...item, reason: gateResult.reason });
      }
    }

    this.results.push({ type: 'gate_results', data: { passed, rejected } });
    return { 
      success: passed.length > 0, 
      data: { passed, rejected }, 
      passedCount: passed.length,
      rejectedCount: rejected.length 
    };
  }

  async deduplicateTokens(params) {
    const lastResult = this.results[this.results.length - 1];
    if (!lastResult?.data?.passed) return { success: false, error: 'No gate results to deduplicate' };

    const seen = new Set();
    const unique = lastResult.data.passed.filter(item => {
      const key = (item.body || '').toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    lastResult.data.passed = unique;
    return { success: true, removed: lastResult.data.passed.length - unique.length };
  }

  async batchThroughGate(params) {
    const lastResult = this.results[this.results.length - 1];
    if (!lastResult?.data) return { success: false, error: 'No data to batch process' };

    const items = Array.isArray(lastResult.data) ? lastResult.data : [lastResult.data];
    
    if (!this.gate) return { success: false, error: 'Gate not initialized' };

    const results = await this.gate.processBatch(items);
    const passed = results.filter(r => r.success);

    passed.forEach(r => {
      if (r.id) this.tokens.push(r);
    });

    return { success: passed.length > 0, data: results, passedCount: passed.length };
  }

  // ── STORAGE CARDS ──

  async storeToken(params) {
    const lastResult = this.results[this.results.length - 1];
    if (!lastResult?.data?.passed) return { success: false, error: 'No passed tokens to store' };

    const toStore = lastResult.data.passed.slice(0, 5);
    let stored = 0;

    for (const item of toStore) {
      if (!this.gate) break;
      const result = await this.gate.process({
        body: item.body || item.title || '',
        source: item.source || 'card_deck',
        source_loop: 'fast',
        score: (item.score || 50) + (item.scoreBoost || 0),
        metadata: item.metadata || {}
      });
      if (result.success) stored++;
    }

    return { success: stored > 0, stored, total: toStore.length };
  }

  async queryMemory(params) {
    if (!this.sb) return { success: false, error: 'Supabase not connected' };

    const { data, error } = await this.sb
      .from('concepts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(params.limit || 10);

    if (error) return { success: false, error: error.message };

    this.results.push({ type: 'memory_query', data });
    return { success: true, data, count: data.length };
  }

  // ── MISSION CARDS ──

  async processManualSignal(params) {
    // This would prompt the user or use a stored signal
    const lastResult = this.results[this.results.length - 1];
    if (!lastResult?.data) return { success: false, error: 'No signal to process' };

    const signal = typeof lastResult.data === 'string' ? lastResult.data : 
                   (lastResult.data.body || lastResult.data[0]?.body || '');

    if (!this.gate) return { success: false, error: 'Gate not initialized' };

    const result = await this.gate.process({
      body: signal,
      source: 'hermes_card',
      source_loop: 'slow',
      score: 75,
      metadata: {}
    });

    return { success: result.success, data: result, score: result.score };
  }
}
