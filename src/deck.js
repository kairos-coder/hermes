// deck.js - Deck management: draw, shuffle, evolve

import { CONFIG, BASE_DECK } from './config.js';

export class Deck {
  constructor() {
    this.cards = JSON.parse(JSON.stringify(BASE_DECK));
    this.hand = [];
    this.discard = [];
    this.playHistory = [];
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  drawHand(size = CONFIG.HAND_SIZE) {
    // Reshuffle discard into deck if needed
    if (this.cards.length < size) {
      this.cards.push(...this.discard);
      this.discard = [];
      this.shuffle();
    }

    this.hand = this.cards.splice(0, size);
    return this.hand;
  }

  discardCard(card) {
    this.discard.push(card);
  }

  discardHand() {
    this.discard.push(...this.hand);
    this.hand = [];
  }

  playCard(cardId) {
    const index = this.hand.findIndex(c => c.id === cardId);
    if (index === -1) return null;
    
    const card = this.hand.splice(index, 1)[0];
    card.playCount++;
    return card;
  }

  recordResult(card, success) {
    if (success) {
      card.successCount++;
      card.confidence = Math.min(1, card.confidence * CONFIG.CONFIDENCE_GROWTH);
    } else {
      card.confidence = Math.max(0.1, card.confidence * CONFIG.CONFIDENCE_DECAY);
    }
    this.discardCard(card);
    this.playHistory.push({ card: card.id, success, timestamp: Date.now() });
  }

  evolve() {
    // Cards with low confidence mutate
    this.cards = this.cards.map(card => {
      if (card.confidence < 0.3 && card.playCount > 5) {
        return this.mutateCard(card);
      }
      return card;
    });

    // Discard very low confidence cards
    this.discard = this.discard.filter(card => {
      if (card.confidence < 0.15 && card.playCount > 10) {
        return false; // Remove from discard (truly gone)
      }
      return true;
    });

    // If deck is small, spawn new cards from successful ones
    if (this.cards.length < 8) {
      const successful = [...this.cards, ...this.discard]
        .filter(c => c.confidence > 0.7)
        .sort((a, b) => b.confidence - a.confidence);
      
      if (successful.length > 0) {
        const parent = successful[0];
        const child = this.spawnCard(parent);
        this.cards.push(child);
      }
    }
  }

  mutateCard(card) {
    const mutations = [
      { suffix: ' Pro', confidence: 0.5, bonus: 'More precise targeting' },
      { suffix: ' Lite', confidence: 0.4, bonus: 'Faster execution' },
      { suffix: ' Deep', confidence: 0.6, bonus: 'Deeper analysis' },
    ];
    
    const mutation = mutations[Math.floor(Math.random() * mutations.length)];
    
    return {
      ...card,
      id: card.id + '_' + Date.now(),
      name: card.name + mutation.suffix,
      confidence: mutation.confidence,
      playCount: 0,
      successCount: 0,
      description: card.description + '. ' + mutation.bonus + '.',
      parent: card.id,
      generation: (card.generation || 0) + 1,
    };
  }

  spawnCard(parent) {
    return {
      ...parent,
      id: parent.id + '_child_' + Date.now(),
      name: parent.name + ' II',
      confidence: parent.confidence * 0.8,
      playCount: 0,
      successCount: 0,
      description: parent.description + ' Refined through experience.',
      parent: parent.id,
      generation: (parent.generation || 0) + 1,
    };
  }

  getStats() {
    return {
      deckSize: this.cards.length,
      handSize: this.hand.length,
      discardSize: this.discard.length,
      totalPlays: this.cards.reduce((s, c) => s + c.playCount, 0) + 
                  this.discard.reduce((s, c) => s + c.playCount, 0),
      averageConfidence: [...this.cards, ...this.discard]
        .reduce((s, c) => s + c.confidence, 0) / (this.cards.length + this.discard.length || 1),
      topCard: [...this.cards, ...this.discard]
        .sort((a, b) => b.confidence - a.confidence)[0],
    };
  }
}
