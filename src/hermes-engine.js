// hermes-engine.js - Core Hermes agent logic

import { Deck } from './deck.js';
import { BrowserActions } from './browser-actions.js';
import { CONFIG, HERMES_LINES } from './config.js';

export class HermesEngine {
  constructor(frame, logger) {
    this.frame = frame;
    this.logger = logger;
    this.deck = new Deck();
    this.actions = new BrowserActions(frame);
    this.tokens = [];
    this.mission = null;
    this.sequenceHistory = [];
    this.isPlaying = false;
  }

  async drawHand() {
    const hand = this.deck.drawHand();
    this.logger.log('draw', HERMES_LINES.draw);
    this.logger.log('system', `Drew ${hand.length} cards: ${hand.map(c => c.icon + ' ' + c.name).join(', ')}`);
    return hand;
  }

  async playSequence(sequence = null) {
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    // If no sequence provided, use the hand in order
    const cards = sequence || [...this.deck.hand];
    
    this.logger.log('play', HERMES_LINES.play);
    this.logger.log('system', `Playing ${cards.length} cards: ${cards.map(c => c.name).join(' → ')}`);
    
    const results = [];
    
    for (const card of cards) {
      const playedCard = this.deck.playCard(card.id);
      if (!playedCard) {
        this.logger.log('system', `Card ${card.name} not in hand, skipping`);
        continue;
      }
      
      this.logger.log('play', `🃏 Playing: ${card.icon} ${card.name}`);
      
      // Execute the card's action
      const actionFn = this.actions[card.action];
      if (!actionFn) {
        this.logger.log('failure', `Unknown action: ${card.action}`);
        this.deck.recordResult(card, false);
        continue;
      }
      
      try {
        const result = await actionFn.call(this.actions, card.params);
        
        if (result.success) {
          this.logger.log('success', HERMES_LINES.success);
          this.logger.log('success', `${card.name}: ${result.data}`);
          
          // If tokens were found, store them
          if (result.totalTokens && result.totalTokens > 0) {
            this.tokens = [...this.actions.tokens];
            this.logger.log('success', `🎯 ${result.totalTokens} tokens found!`);
          }
        } else {
          this.logger.log('failure', HERMES_LINES.failure);
          this.logger.log('failure', `${card.name} failed: ${result.error || 'No result'}`);
        }
        
        this.deck.recordResult(card, result.success);
        results.push({ card: card.name, ...result });
        
      } catch (error) {
        this.logger.log('failure', `${card.name} errored: ${error.message}`);
        this.deck.recordResult(card, false);
        results.push({ card: card.name, success: false, error: error.message });
      }
      
      // Small delay between cards for visual effect
      await new Promise(r => setTimeout(r, 300));
    }
    
    // Discard remaining hand
    this.deck.discardHand();
    
    // Record sequence
    this.sequenceHistory.push({
      cards: cards.map(c => c.name),
      results,
      tokensFound: this.tokens.length,
      timestamp: Date.now(),
    });
    
    this.isPlaying = false;
    return results;
  }

  evolveDeck() {
    const before = this.deck.getStats();
    this.deck.evolve();
    const after = this.deck.getStats();
    
    this.logger.log('evolve', HERMES_LINES.evolve);
    this.logger.log('system', `Deck evolved: ${before.deckSize} → ${after.deckSize} cards`);
    
    if (after.topCard) {
      this.logger.log('system', `Top card: ${after.topCard.name} (${Math.round(after.topCard.confidence * 100)}% confidence)`);
    }
  }

  setMission(mission) {
    this.mission = mission;
    this.logger.log('system', `📋 Mission: ${mission.name} — ${mission.description}`);
  }

  navigateTo(url) {
    this.frame.src = url;
    this.logger.log('system', `🧭 Navigating to ${url}`);
  }

  respondTo(message) {
    // Simple responses based on state
    if (!message) return;
    
    const stats = this.deck.getStats();
    const responses = [
      `I have ${stats.deckSize} cards in my deck with ${Math.round(stats.averageConfidence * 100)}% average confidence.`,
      `Found ${this.tokens.length} tokens so far. The hunt continues.`,
      `Last sequence: ${this.sequenceHistory[this.sequenceHistory.length - 1]?.cards.join(' → ') || 'none yet'}.`,
      `My top card is ${stats.topCard?.name || 'unknown'}. It serves me well.`,
    ];
    
    this.logger.log('hermes', responses[Math.floor(Math.random() * responses.length)]);
  }

  getState() {
    return {
      deck: this.deck.getStats(),
      hand: this.deck.hand,
      discard: this.deck.discard,
      tokens: this.tokens,
      mission: this.mission,
      sequenceCount: this.sequenceHistory.length,
      lastSequence: this.sequenceHistory[this.sequenceHistory.length - 1],
    };
  }
}
