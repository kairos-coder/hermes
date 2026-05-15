// Token extraction utilities
const STOPWORDS = new Set(['the','and','for','with','this','that','from','are','was','were']);

export function extractTokens(text) {
    return text.toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length >= 4 && w.length <= 14 && !STOPWORDS.has(w));
}

export function scoreToken(word, freq) {
    let s = Math.min(70, freq * 6);
    const priorityWords = new Set(['ai','ml','quantum','neural','semantic','agentic','hermes']);
    if (priorityWords.has(word)) s += 30;
    return Math.min(100, s);
}

export function topTokens(tokens, n = 10) {
    const freq = new Map();
    for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
    return Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([word, count]) => ({ word, count, score: scoreToken(word, count) }));
}

// Source definitions
export const FAST_SOURCES = [
    {
        name: 'Hacker News',
        icon: '⚡',
        fetch: async () => {
            const ids = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r => r.json());
            const stories = await Promise.all(
                ids.slice(0, 15).map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json()))
            );
            const tokens = stories.filter(s => s?.title).flatMap(s => extractTokens(s.title));
            return topTokens(tokens, 8).map(({ word, count, score }) => ({
                body: word, source: 'hn_fast', source_loop: 'fast', score,
                metadata: { frequency: count, domain: 'tech' }
            }));
        }
    },
    {
        name: 'Mythic Archive',
        icon: '🏛️',
        fetch: async () => {
            const MYTHIC = ['chaos','ouroboros','phoenix','hermes','demeter','prometheus','titan','sphinx','labyrinth'];
            const shuffled = [...MYTHIC].sort(() => 0.5 - Math.random()).slice(0, 6);
            return shuffled.map(word => ({
                body: word, source: 'mythic_fast', source_loop: 'fast',
                score: 85 + Math.floor(Math.random() * 15),
                metadata: { domain: 'mythos' }
            }));
        }
    },
    {
        name: 'Dev.to',
        icon: '💻',
        fetch: async () => {
            const articles = await fetch('https://dev.to/api/articles?top=10').then(r => r.json());
            const tokens = articles.flatMap(a => extractTokens(a.title));
            return topTokens(tokens, 6).map(({ word, count, score }) => ({
                body: word, source: 'devto_fast', source_loop: 'fast', score,
                metadata: { frequency: count, domain: 'dev' }
            }));
        }
    }
];

export const SLOW_SOURCES = [
    {
        name: 'Hacker News',
        fetch: async () => {
            const ids = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r => r.json());
            const stories = await Promise.all(
                ids.slice(0, 15).map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json()))
            );
            return stories.filter(s => s?.title).map(s => ({
                body: s.title, source: 'hackernews', source_loop: 'slow',
                score: 60 + Math.floor(Math.random() * 30),
                metadata: { url: s.url, hn_score: s.score }
            }));
        }
    },
    {
        name: 'Dev.to Full',
        fetch: async () => {
            const articles = await fetch('https://dev.to/api/articles?top=15').then(r => r.json());
            return articles.map(a => ({
                body: a.title, source: 'devto', source_loop: 'slow',
                score: 55 + Math.floor(Math.random() * 30),
                metadata: { url: a.url, tags: a.tag_list }
            }));
        }
    }
];
