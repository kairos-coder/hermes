# ⚡ Hermes · Token Hunter

**Spiralus Celer #1 · φ¹ = 1.618s**

The fastest god. Hermes hunts novel concepts from the world and routes them to their proper domain. He receives his telos from Persephone at the start of each cycle and carries it through the Celer spiral.

## Role

Semantic token extraction. Text arrives → tokenize → embed → route to domain → store. Hermes does one thing: find what is new and carry it to Aphrodite.

## Edge Function

`hermes-extract` — Semantic hunter/gatherer. Uses Supabase AI (`gte-small`) to embed incoming words, computes cosine similarity against 12 domain centroids, routes to the closest domain above threshold. Hunger-weighting boosts underrepresented domains.

## Input/Output

- **Receives:** Telos seed from Persephone (every ~16 min)
- **Produces:** Domain-tagged tokens with embeddings and quality scores
- **Dispatches to:** Aphrodite (via `aphrodite_dispatch`)

## Timing

φ¹ = 1.618s — Fast enough to hunt continuously. Hermes is the sensory layer. He fires more than any other god. By the time Apollo finishes one synthesis, Hermes has run 18 times.

## HTML Temple

`index.html` — Token hunter dashboard with reproductive spawn. Shows domain distribution, recent tokens, variant lineage. Can spawn A/B children when score exceeds threshold.

## KairosDB Tables

- **Writes:** `tokens`
- **Dispatches:** `aphrodite_dispatch`
- **Lineage:** `lineage` (when spawning variants)

## The φ Spiral
