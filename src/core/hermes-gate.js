import { getEmbedding, isReady } from './semantic-core.js';

// Word lists
const PRIORITY_WORDS = new Set([
    'ai','ml','api','data','cloud','native','quantum','neural','vector','semantic',
    'intelligence','generative','agentic','ouroboros','phoenix','prometheus','hermes'
]);

const ARCHETYPAL_WORDS = new Set([
    'nyx','erebus','tartarus','styx','chaos','zeus','apollo','athena','ares',
    'hermes','demeter','hephaestus','titan','olympus','ouroboros','phoenix','sphinx'
]);

const STOPWORDS = new Set([
    'the','and','for','with','this','that','from','have','are','was','were',
    'what','when','where','who','which','there','their','they','them'
]);

function syllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    const m = word.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
}

export function passesGate(body) {
    const words = body.toLowerCase().trim().split(/\s+/);
    
    if (words.every(w => STOPWORDS.has(w))) {
        return { pass: false, reason: 'pure stopwords' };
    }
    
    const hasPriority = words.some(w => PRIORITY_WORDS.has(w));
    const hasArchetypal = words.some(w => ARCHETYPAL_WORDS.has(w));
    const hasWeight = words.some(w => syllables(w) >= 3);
    
    if (!hasPriority && !hasArchetypal && !hasWeight) {
        return { pass: false, reason: `no priority/archetypal/weight` };
    }
    
    return { pass: true, scoreBoost: (hasPriority ? 15 : 0) + (hasArchetypal ? 10 : 0) };
}

export class HermesGate {
    constructor(supabase) {
        this.sb = supabase;
        this.minWords = 1;
        this.maxWords = 3;
        this.expiryDays = 3;
        this.stats = { passed: 0, rejected: 0 };
    }
    
    async isDuplicate(body, source, hours = 24) {
        const cutoff = new Date(Date.now() - hours * 3600000);
        const { data } = await this.sb
            .from('concepts')
            .select('id')
            .eq('body', body.toLowerCase().trim())
            .eq('source', source)
            .gte('created_at', cutoff.toISOString())
            .limit(1);
        return data && data.length > 0;
    }
    
    async process(raw) {
        const body = raw.body.trim();
        const wordCount = body.split(/\s+/).length;
        
        if (wordCount < this.minWords || wordCount > this.maxWords) {
            return { success: false, error: `word count ${wordCount}` };
        }
        
        const gate = passesGate(body);
        if (!gate.pass) {
            this.stats.rejected++;
            return { success: false, error: gate.reason };
        }
        
        if (await this.isDuplicate(body, raw.source)) {
            return { success: false, error: 'duplicate' };
        }
        
        let score = (raw.score || 50) + gate.scoreBoost;
        
        // Add semantic novelty if available
        if (isReady()) {
            const embedding = await getEmbedding(body);
            // Novelty scoring would go here
            score = Math.min(100, score + 5);
        }
        
        const record = {
            body: body.toLowerCase().trim(),
            band: 'hermes',
            source: raw.source,
            source_loop: raw.source_loop || 'slow',
            state: raw.source_loop === 'fast' ? 'raw' : 'in_transit',
            realm: raw.source_loop === 'fast' ? 'hephaestus' : null,
            word_count: wordCount,
            score,
            metadata: raw.metadata || {},
            expires_at: new Date(Date.now() + this.expiryDays * 86400000).toISOString(),
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await this.sb.from('concepts').insert(record).select().single();
        if (error) return { success: false, error: error.message };
        
        this.stats.passed++;
        return { success: true, id: data.id, score };
    }
    
    async processBatch(items, onProgress) {
        const results = [];
        for (let i = 0; i < items.length; i++) {
            const r = await this.process(items[i]);
            results.push(r);
            if (onProgress) onProgress(i + 1, items.length, r);
            await new Promise(r => setTimeout(r, 50));
        }
        return results;
    }
    
    getStats() { return { ...this.stats }; }
    resetStats() { this.stats = { passed: 0, rejected: 0 }; }
}
