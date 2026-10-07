// Spam Detection Bypass Utility
// Provides smart suggestions and content optimization to avoid spam filters

export interface SpamAnalysis {
  isSpam: boolean;
  score: number;
  reasons: string[];
  suggestions: SpamSuggestion[];
  optimizedContent?: string;
}

export interface SpamSuggestion {
  type: 'replace' | 'remove' | 'rephrase' | 'format';
  original: string;
  suggested: string[];
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

// Comprehensive spam keywords with smart alternatives
const SPAM_KEYWORDS_MAP: Record<string, string[]> = {
  // Money/Financial terms
  'guaranteed': ['assured', 'promised', 'committed', 'ensured'],
  'free money': ['complimentary funds', 'bonus amount', 'additional value'],
  'make money fast': ['earn income quickly', 'generate revenue efficiently', 'build wealth steadily'],
  'cash bonus': ['monetary reward', 'financial incentive', 'payment bonus'],
  'no cost': ['complimentary', 'included', 'at no charge', 'without fee'],
  'risk free': ['secure', 'protected', 'safe investment', 'low-risk'],
  
  // Urgency terms
  'act now': ['take action today', 'respond promptly', 'consider this opportunity'],
  'limited time': ['time-sensitive', 'special period', 'exclusive window'],
  'urgent': ['important', 'time-sensitive', 'priority', 'immediate attention'],
  'expires today': ['deadline today', 'ends today', 'final day'],
  'don\'t wait': ['respond soon', 'take action', 'consider quickly'],
  
  // Sales/Marketing terms
  'buy now': ['purchase today', 'order now', 'get yours', 'secure your'],
  'click here': ['visit this link', 'see more details', 'learn more', 'view offer'],
  'special offer': ['exclusive deal', 'limited opportunity', 'special arrangement'],
  'amazing deal': ['excellent opportunity', 'great value', 'outstanding offer'],
  'incredible': ['remarkable', 'exceptional', 'outstanding', 'impressive'],
  
  // Suspicious phrases
  'congratulations': ['well done', 'excellent news', 'great achievement'],
  'you have won': ['you have been selected', 'you qualify for', 'you are eligible'],
  'claim your': ['receive your', 'get your', 'access your'],
  'winner': ['recipient', 'selected participant', 'qualified individual'],
  
  // Medical/Health
  'lose weight': ['manage weight', 'improve fitness', 'enhance wellness'],
  'miracle cure': ['effective treatment', 'proven solution', 'health improvement'],
  
  // Technology/Internet
  'click below': ['see details below', 'find information below', 'view below'],
  'visit our website': ['explore our site', 'check our platform', 'see our page'],
};

// Patterns that trigger spam detection
const SPAM_PATTERNS = {
  excessiveExclamation: /!{2,}/g,
  excessiveCapitalization: /[A-Z]{4,}/g,
  suspiciousNumbers: /\$\d+|\d+%\s*(off|discount)/gi,
  repeatedWords: /\b(\w+)\s+\1\b/gi,
  excessivePunctuation: /[.]{3,}|[?]{2,}|[!]{2,}/g,
};

export class SpamBypassAnalyzer {
  
  /**
   * Analyze content for spam and provide suggestions
   */
  static analyzeContent(content: string): SpamAnalysis {
    const suggestions: SpamSuggestion[] = [];
    let score = 0;
    const reasons: string[] = [];
    
    // Check for spam keywords
    const keywordResults = this.checkSpamKeywords(content);
    suggestions.push(...keywordResults.suggestions);
    score += keywordResults.score;
    reasons.push(...keywordResults.reasons);
    
    // Check for suspicious patterns
    const patternResults = this.checkSuspiciousPatterns(content);
    suggestions.push(...patternResults.suggestions);
    score += patternResults.score;
    reasons.push(...patternResults.reasons);
    
    // Generate optimized content
    const optimizedContent = this.optimizeContent(content, suggestions);
    
    return {
      isSpam: score >= 30,
      score,
      reasons,
      suggestions,
      optimizedContent
    };
  }
  
  /**
   * Check for spam keywords and provide alternatives
   */
  private static checkSpamKeywords(content: string): {
    suggestions: SpamSuggestion[];
    score: number;
    reasons: string[];
  } {
    const suggestions: SpamSuggestion[] = [];
    let score = 0;
    const reasons: string[] = [];
    const lowerContent = content.toLowerCase();
    
    for (const [keyword, alternatives] of Object.entries(SPAM_KEYWORDS_MAP)) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        score += 15;
        reasons.push(`Contains spam keyword: "${keyword}"`);
        
        suggestions.push({
          type: 'replace',
          original: keyword,
          suggested: alternatives,
          reason: `"${keyword}" is commonly flagged by spam filters`,
          severity: 'high'
        });
      }
    }
    
    return { suggestions, score, reasons };
  }
  
  /**
   * Check for suspicious patterns
   */
  private static checkSuspiciousPatterns(content: string): {
    suggestions: SpamSuggestion[];
    score: number;
    reasons: string[];
  } {
    const suggestions: SpamSuggestion[] = [];
    let score = 0;
    const reasons: string[] = [];
    
    // Excessive exclamation marks
    const exclamationMatches = content.match(SPAM_PATTERNS.excessiveExclamation);
    if (exclamationMatches) {
      score += 10;
      reasons.push('Excessive exclamation marks');
      suggestions.push({
        type: 'format',
        original: exclamationMatches.join(', '),
        suggested: ['Use single exclamation mark', 'Use period instead', 'Rephrase with enthusiasm'],
        reason: 'Multiple exclamation marks appear spammy',
        severity: 'medium'
      });
    }
    
    // Excessive capitalization
    const capsMatches = content.match(SPAM_PATTERNS.excessiveCapitalization);
    if (capsMatches) {
      score += 15;
      reasons.push('Suspicious character patterns');
      suggestions.push({
        type: 'format',
        original: capsMatches.join(', '),
        suggested: ['Use normal capitalization', 'Emphasize with bold formatting', 'Use title case'],
        reason: 'All caps text is often flagged as spam',
        severity: 'high'
      });
    }
    
    // Suspicious numbers/prices
    const numberMatches = content.match(SPAM_PATTERNS.suspiciousNumbers);
    if (numberMatches) {
      score += 10;
      reasons.push('Contains promotional pricing patterns');
      suggestions.push({
        type: 'rephrase',
        original: numberMatches.join(', '),
        suggested: ['Spell out numbers', 'Use "special pricing"', 'Mention "competitive rates"'],
        reason: 'Promotional pricing can trigger spam filters',
        severity: 'medium'
      });
    }
    
    return { suggestions, score, reasons };
  }
  
  /**
   * Generate optimized content based on suggestions
   */
  private static optimizeContent(content: string, suggestions: SpamSuggestion[]): string {
    let optimized = content;
    
    for (const suggestion of suggestions) {
      if (suggestion.type === 'replace' && suggestion.suggested.length > 0) {
        const regex = new RegExp(suggestion.original, 'gi');
        optimized = optimized.replace(regex, suggestion.suggested[0]);
      } else if (suggestion.type === 'format') {
        // Fix formatting issues
        optimized = optimized.replace(SPAM_PATTERNS.excessiveExclamation, '!');
        optimized = optimized.replace(SPAM_PATTERNS.excessiveCapitalization, (match) => 
          match.charAt(0) + match.slice(1).toLowerCase()
        );
      }
    }
    
    return optimized;
  }
  
  /**
   * Get real-time suggestions as user types
   */
  static getRealTimeSuggestions(content: string): SpamSuggestion[] {
    const analysis = this.analyzeContent(content);
    return analysis.suggestions.filter(s => s.severity === 'high' || s.severity === 'medium');
  }
  
  /**
   * Check if content is likely to pass spam filters
   */
  static isContentSafe(content: string): boolean {
    const analysis = this.analyzeContent(content);
    return !analysis.isSpam;
  }
  
  /**
   * Get spam score breakdown
   */
  static getScoreBreakdown(content: string): {
    total: number;
    keywords: number;
    patterns: number;
    recommendations: string[];
  } {
    const keywordResults = this.checkSpamKeywords(content);
    const patternResults = this.checkSuspiciousPatterns(content);
    
    const recommendations = [];
    if (keywordResults.score > 0) {
      recommendations.push('Replace flagged keywords with alternatives');
    }
    if (patternResults.score > 0) {
      recommendations.push('Improve text formatting and reduce excessive punctuation');
    }
    if (keywordResults.score + patternResults.score < 10) {
      recommendations.push('Content looks good for deliverability');
    }
    
    return {
      total: keywordResults.score + patternResults.score,
      keywords: keywordResults.score,
      patterns: patternResults.score,
      recommendations
    };
  }
}

// Export utility functions for easy use
export const analyzeSpamContent = SpamBypassAnalyzer.analyzeContent;
export const getRealTimeSuggestions = SpamBypassAnalyzer.getRealTimeSuggestions;
export const isContentSafe = SpamBypassAnalyzer.isContentSafe;
export const getSpamScoreBreakdown = SpamBypassAnalyzer.getScoreBreakdown;