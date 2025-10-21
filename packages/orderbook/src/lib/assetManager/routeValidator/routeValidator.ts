import { ApiKey, IAuth } from '@gardenfi/utils';
import { ChainAsset } from '../../chainAsset/chainAsset';

type RoutePolicy = {
  default: 'open' | 'closed';
  isolation_groups: string[];
  blacklist_pairs: string[];
  whitelist_overrides: string[];
};

type PolicyResponse = {
  status: 'Ok' | 'Error';
  result: RoutePolicy;
  error?: string;
};

enum Direction {
  Forward = '->',
  Bidirectional = '<->',
}

enum Wildcard {
  WildCard = '*',
  TokenWildcard = ':*',
  ChainWildcard = '*:',
}

type ParsedRule = {
  pattern: string;
  fromPattern: string;
  toPattern: string;
  direction: Direction;
  specificity: number;
};

class RouteValidator {
  private policy: RoutePolicy | null = null;
  private sortedIsolationRules: ParsedRule[] = [];
  private sortedBlacklistRules: ParsedRule[] = [];
  private sortedWhitelistRules: ParsedRule[] = [];

  constructor(
    private readonly apiBaseUrl: string,
    private readonly auth: string | ApiKey | IAuth,
  ) {}

  async loadPolicy(): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/v2/policy`, {
        headers: {
          'garden-app-id': this.apiKey,
          accept: 'application/json',
        },
      });

      const data: PolicyResponse = await response.json();

      if (data.status !== 'Ok') {
        throw new Error(`API Error: ${data.error}`);
      }

      this.policy = data.result;

      this.preprocessRules();
    } catch (error) {
      throw new Error(`Failed to load policy: ${error}`);
    }
  }

  isValidRoute(fromAsset: ChainAsset, toAsset: ChainAsset): boolean {
    const policy = this.ensurePolicyLoaded();

    // Same asset check
    if (fromAsset.toString() === toAsset.toString()) return false;

    // Check whitelist overrides first (highest precedence)
    if (this.matchesRuleList(fromAsset, toAsset, this.sortedWhitelistRules)) {
      return true;
    }

    // Check isolation rules
    const isolationRule = this.findMatchingRule(
      fromAsset,
      this.sortedIsolationRules,
      'from',
    );
    if (isolationRule) {
      // If source has isolation rules, destination must match those rules
      const allowed = this.matchesRuleDestination(
        toAsset,
        isolationRule,
        fromAsset,
      );
      if (!allowed) return false;
    }

    // Check if destination has isolation rules that would block this route
    const destIsolationRule = this.findMatchingRule(
      toAsset,
      this.sortedIsolationRules,
      'to',
    );
    if (destIsolationRule) {
      const allowed = this.matchesRuleSource(
        fromAsset,
        destIsolationRule,
        toAsset,
      );
      if (!allowed) return false;
    }

    // Check blacklist
    if (this.matchesRuleList(fromAsset, toAsset, this.sortedBlacklistRules)) {
      return false;
    }

    return policy.default === 'open';
  }

  isAssetInIsolationGroup(asset: ChainAsset): boolean {
    this.ensurePolicyLoaded();
    return this.sortedIsolationRules.some(
      (rule) =>
        this.matchesAssetPattern(asset, rule.fromPattern) ||
        this.matchesAssetPattern(asset, rule.toPattern),
    );
  }

  getValidDestinations(
    fromAsset: ChainAsset,
    allAssets: ChainAsset[],
  ): ChainAsset[] {
    this.ensurePolicyLoaded();

    return allAssets.filter((toAsset) => this.isValidRoute(fromAsset, toAsset));
  }

  getAllValidRoutes(
    assets: ChainAsset[],
  ): Array<{ from: ChainAsset; to: ChainAsset }> {
    return assets.flatMap((fromAsset) =>
      assets
        .filter((toAsset) => this.isValidRoute(fromAsset, toAsset))
        .map((toAsset) => ({ from: fromAsset, to: toAsset })),
    );
  }

  private preprocessRules(): void {
    if (!this.policy) return;

    this.sortedIsolationRules = this.policy.isolation_groups
      .map((rule) => this.parseRule(rule))
      .sort((a, b) => b.specificity - a.specificity);

    this.sortedBlacklistRules = this.policy.blacklist_pairs
      .map((rule) => this.parseRule(rule))
      .sort((a, b) => b.specificity - a.specificity);

    this.sortedWhitelistRules = this.policy.whitelist_overrides
      .map((rule) => this.parseRule(rule))
      .sort((a, b) => b.specificity - a.specificity);
  }

  private parseRule(pattern: string): ParsedRule {
    const bidirectional = pattern.includes(Direction.Bidirectional);
    const separator = bidirectional
      ? Direction.Bidirectional
      : Direction.Forward;
    const [fromPattern, toPattern] = pattern
      .split(separator)
      .map((p) => p.trim());

    return {
      pattern,
      fromPattern,
      toPattern,
      direction: separator,
      specificity: this.calculateSpecificity(fromPattern, toPattern),
    };
  }

  private calculateSpecificity(from: string, to: string): number {
    const score = (pattern: string): number => {
      const lower = pattern.toLowerCase();
      if (lower === Wildcard.WildCard) return 0;
      if (lower.includes(Wildcard.WildCard)) return 1; // Single wildcard
      return 2; // Exact match
    };

    return score(from) * 10 + score(to);
  }

  private findMatchingRule(
    asset: ChainAsset,
    rules: ParsedRule[],
    side: 'from' | 'to',
  ): ParsedRule | null {
    for (const rule of rules) {
      const pattern = side === 'from' ? rule.fromPattern : rule.toPattern;
      if (this.matchesAssetPattern(asset, pattern)) {
        return rule;
      }
      // Check bidirectional
      if (rule.direction === Direction.Bidirectional) {
        const altPattern = side === 'from' ? rule.toPattern : rule.fromPattern;
        if (this.matchesAssetPattern(asset, altPattern)) {
          return rule;
        }
      }
    }
    return null;
  }

  private matchesRuleDestination(
    toAsset: ChainAsset,
    rule: ParsedRule,
    fromAsset: ChainAsset,
  ): boolean {
    // Check forward direction
    if (this.matchesAssetPattern(toAsset, rule.toPattern)) {
      return true;
    }
    // Check bidirectional
    if (
      rule.direction === Direction.Bidirectional &&
      this.matchesAssetPattern(toAsset, rule.fromPattern)
    ) {
      return true;
    }
    return false;
  }

  private matchesRuleSource(
    fromAsset: ChainAsset,
    rule: ParsedRule,
    toAsset: ChainAsset,
  ): boolean {
    // Check if fromAsset can reach toAsset based on isolation rule
    if (this.matchesAssetPattern(fromAsset, rule.fromPattern)) {
      return true;
    }
    if (
      rule.direction === Direction.Bidirectional &&
      this.matchesAssetPattern(fromAsset, rule.toPattern)
    ) {
      return true;
    }
    return false;
  }

  private matchesRuleList(
    fromAsset: ChainAsset,
    toAsset: ChainAsset,
    rules: ParsedRule[],
  ): boolean {
    return rules.some((rule) => this.matchesRule(fromAsset, toAsset, rule));
  }

  private matchesRule(
    fromAsset: ChainAsset,
    toAsset: ChainAsset,
    rule: ParsedRule,
  ): boolean {
    const forwardMatch =
      this.matchesAssetPattern(fromAsset, rule.fromPattern) &&
      this.matchesAssetPattern(toAsset, rule.toPattern);

    if (rule.direction === Direction.Bidirectional) {
      const reverseMatch =
        this.matchesAssetPattern(fromAsset, rule.toPattern) &&
        this.matchesAssetPattern(toAsset, rule.fromPattern);
      return forwardMatch || reverseMatch;
    }

    return forwardMatch;
  }

  private matchesAssetPattern(asset: ChainAsset, pattern: string): boolean {
    const assetStr = asset.toString().toLowerCase();
    const patternLower = pattern.toLowerCase();

    if (patternLower === Wildcard.WildCard) return true;

    if (patternLower.endsWith(Wildcard.TokenWildcard)) {
      const chainPrefix = patternLower.slice(0, -1);
      return assetStr.startsWith(chainPrefix);
    }

    if (patternLower.startsWith(Wildcard.ChainWildcard)) {
      const tokenSuffix = patternLower.slice(1);
      return assetStr.endsWith(tokenSuffix);
    }

    return assetStr === patternLower;
  }

  private ensurePolicyLoaded(): RoutePolicy {
    if (!this.policy) {
      throw new Error('Policy not loaded. Call loadPolicy() first.');
    }
    return this.policy;
  }
}

function buildRouteMatrix(
  assets: ChainAsset[],
  validator: RouteValidator,
): Record<string, ChainAsset[]> {
  return Object.fromEntries(
    assets.map((fromAsset) => [
      fromAsset.toString(),
      validator.getValidDestinations(fromAsset, assets),
    ]),
  );
}

export { RouteValidator, buildRouteMatrix, type RoutePolicy };
