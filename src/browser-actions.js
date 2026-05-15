// browser-actions.js - Execute cards against the page

import { TOKEN_PATTERNS } from './config.js';

export class BrowserActions {
  constructor(frame) {
    this.frame = frame; // iframe element
    this.results = [];
    this.tokens = [];
  }

  get doc() {
    try {
      return this.frame.contentDocument || this.frame.contentWindow?.document;
    } catch (e) {
      return null;
    }
  }

  // ── Card Actions ──
  
  navigateTo(params) {
    if (params.url) {
      this.frame.src = params.url;
      return { success: true, data: `Navigated to ${params.url}` };
    }
    return { success: false, error: 'No URL provided' };
  }

  extractText(params) {
    const doc = this.doc;
    if (!doc) return { success: false, error: 'Cannot access page' };
    
    const selector = params.selector || 'body';
    const element = doc.querySelector(selector);
    
    if (!element) return { success: false, error: `Element "${selector}" not found` };
    
    const text = element.innerText || element.textContent || '';
    this.results.push({ type: 'text', data: text, source: selector });
    
    return { success: text.length > 0, data: text.substring(0, 200) + '...', length: text.length };
  }

  extractLinks(params) {
    const doc = this.doc;
    if (!doc) return { success: false, error: 'Cannot access page' };
    
    const links = Array.from(doc.querySelectorAll('a[href]')).map(a => ({
      text: a.textContent?.trim() || '[no text]',
      href: a.href,
    }));
    
    this.results.push({ type: 'links', data: links });
    
    return { success: links.length > 0, data: links, count: links.length };
  }

  searchDOM(params) {
    const doc = this.doc;
    if (!doc) return { success: false, error: 'Cannot access page' };
    
    const query = params.query || '';
    const text = (doc.body?.innerText || '').toLowerCase();
    const found = text.includes(query.toLowerCase());
    
    if (found) {
      const index = text.indexOf(query.toLowerCase());
      const context = text.substring(Math.max(0, index - 50), index + query.length + 50);
      this.results.push({ type: 'search', query, context });
    }
    
    return { success: found, data: found ? 'Found!' : 'Not found', query };
  }

  filterResults(params) {
    const pattern = params.pattern || '';
    if (!this.results.length) return { success: false, error: 'No results to filter' };
    
    const lastResult = this.results[this.results.length - 1];
    
    if (typeof lastResult.data === 'string') {
      const regex = new RegExp(pattern, 'gi');
      const matches = lastResult.data.match(regex) || [];
      return { success: matches.length > 0, data: matches, count: matches.length };
    }
    
    return { success: false, error: 'Last result is not filterable text' };
  }

  findTokens(params) {
    const doc = this.doc;
    if (!doc) return { success: false, error: 'Cannot access page' };
    
    const text = doc.body?.innerText || '';
    const patternType = params.pattern || 'email';
    const regex = TOKEN_PATTERNS[patternType];
    
    if (!regex) return { success: false, error: `Unknown pattern: ${patternType}` };
    
    const matches = text.match(regex) || [];
    const unique = [...new Set(matches)];
    
    unique.forEach(token => {
      if (!this.tokens.includes(token)) {
        this.tokens.push(token);
      }
    });
    
    return { 
      success: unique.length > 0, 
      data: unique, 
      count: unique.length,
      pattern: patternType,
      totalTokens: this.tokens.length 
    };
  }

  storeToken(params) {
    if (this.tokens.length === 0) return { success: false, error: 'No tokens to store' };
    
    const stored = [...this.tokens];
    this.results.push({ type: 'tokens_stored', data: stored, count: stored.length });
    
    return { success: true, data: stored, count: stored.length };
  }

  clickElement(params) {
    const doc = this.doc;
    if (!doc) return { success: false, error: 'Cannot access page' };
    
    const selector = params.selector || '';
    const element = doc.querySelector(selector);
    
    if (!element) return { success: false, error: `Element "${selector}" not found` };
    
    element.click();
    return { success: true, data: `Clicked ${selector}` };
  }

  waitFor(params) {
    const ms = params.ms || 1000;
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true, data: `Waited ${ms}ms` });
      }, ms);
    });
  }

  scrollIntoView(params) {
    const doc = this.doc;
    if (!doc) return { success: false, error: 'Cannot access page' };
    
    const selector = params.selector || '';
    const element = doc.querySelector(selector);
    
    if (!element) return { success: false, error: `Element "${selector}" not found` };
    
    element.scrollIntoView({ behavior: 'smooth' });
    return { success: true, data: `Scrolled to ${selector}` };
  }

  evaluateJS(params) {
    const doc = this.doc;
    if (!doc) return { success: false, error: 'Cannot access page' };
    
    try {
      const result = doc.defaultView?.eval(params.code || '');
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  parseJSON(params) {
    if (!this.results.length) return { success: false, error: 'No results to parse' };
    
    const lastResult = this.results[this.results.length - 1];
    
    if (typeof lastResult.data === 'string') {
      try {
        const parsed = JSON.parse(lastResult.data);
        return { success: true, data: parsed };
      } catch (e) {
        return { success: false, error: 'Not valid JSON' };
      }
    }
    
    return { success: false, error: 'Last result is not JSON string' };
  }

  takeScreenshot(params) {
    // Placeholder for screenshot functionality
    return { success: true, data: 'Screenshot would be captured here' };
  }
}
