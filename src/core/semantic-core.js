/**
 * SemanticCore - Browser-cached transformer model wrapper
 * 23MB MiniLM-L6-v2, caches after first load via Transformers.js
 */

let cachedPipeline = null;
let loadPromise = null;

export const ModelState = {
    UNLOADED: 'unloaded',
    LOADING: 'loading',
    READY: 'ready',
    ERROR: 'error'
};

let currentState = ModelState.UNLOADED;
let stateListeners = [];

function setState(state, message = '') {
    currentState = state;
    stateListeners.forEach(fn => fn(state, message));
}

export function onStateChange(listener) {
    stateListeners.push(listener);
    listener(currentState, '');
    return () => { stateListeners = stateListeners.filter(l => l !== listener); };
}

export async function loadModel() {
    if (currentState === ModelState.READY) return cachedPipeline;
    if (loadPromise) return loadPromise;
    
    setState(ModelState.LOADING, 'Downloading semantic model (23MB, will cache)...');
    
    loadPromise = (async () => {
        try {
            const { pipeline, env } = await import('@xenova/transformers');
            
            // Configure for aggressive caching
            env.allowLocalModels = true;
            env.useBrowserCache = true;
            env.cacheDir = '/hermes-cache/';
            
            const model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            cachedPipeline = model;
            setState(ModelState.READY, 'Semantic engine online');
            return model;
        } catch (err) {
            setState(ModelState.ERROR, err.message);
            throw err;
        }
    })();
    
    return loadPromise;
}

export async function getEmbedding(text) {
    const model = await loadModel();
    if (!model) return null;
    
    try {
        const result = await model(text, { pooling: 'mean', normalize: true });
        return Array.from(result.data);
    } catch (err) {
        console.warn('Embedding failed:', err);
        return null;
    }
}

export async function getSimilarity(textA, textB) {
    const [embA, embB] = await Promise.all([getEmbedding(textA), getEmbedding(textB)]);
    if (!embA || !embB) return 0;
    return cosineSimilarity(embA, embB);
}

export function cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function isReady() { return currentState === ModelState.READY; }
