import {
  ApiKey,
  APIResponse,
  AsyncResult,
  Err,
  Fetcher,
  IAuth,
  Ok,
  Url,
} from '@gardenfi/utils';
import { ChainAsset } from '../../chainAsset/chainAsset';
import NodeCache from 'node-cache';

type RoutePolicy = {
  default: 'open' | 'closed';
  isolation_groups: string[];
  blacklist_pairs: string[];
  whitelist_overrides: string[];
};

enum Direction {
  Forward = '->',
  Bidirectional = '<->',
}

enum Wildcard {
  Any = '*',
  AnyToken = ':*',
  AnyChain = '*:',
}

enum RuleSide {
  From = 'from',
  To = 'to',
}

type ParsedRule = {
  pattern: string;
  fromPattern: string;
  toPattern: string;
  direction: Direction;
  specificity: number;
};

class RouteValidator {
  public policy = new NodeCache({
    stdTTL: 36000, // 10 hours in seconds
    checkperiod: 3600, // Check for expired keys every hour
  });
  private static readonly POLICY_CACHE_KEY = 'route_policy';
  private apiBaseUrl: Url;
  private auth: IAuth;

  constructor(apiBaseUrl: string, apiKey: string | IAuth) {
    if (typeof apiKey === 'string') this.auth = new ApiKey(apiKey);
    else this.auth = apiKey;

    if (typeof apiBaseUrl === 'string') this.apiBaseUrl = new Url(apiBaseUrl);
    else this.apiBaseUrl = apiBaseUrl;
  }

  getPolicy(): RoutePolicy | undefined {
    return this.policy.get<RoutePolicy>(RouteValidator.POLICY_CACHE_KEY);
  }

  setPolicy(policy: RoutePolicy): RoutePolicy {
    const oldPolicy = this.getPolicy();
    const newPolicy = {
      default: policy.default || oldPolicy?.default || 'open',
      isolation_groups: [
        ...new Set([
          ...(oldPolicy?.isolation_groups || []),
          ...policy.isolation_groups,
        ]),
      ],
      blacklist_pairs: [
        ...new Set([
          ...(oldPolicy?.blacklist_pairs || []),
          ...policy.blacklist_pairs,
        ]),
      ],
      whitelist_overrides: [
        ...new Set([
          ...(oldPolicy?.whitelist_overrides || []),
          ...policy.whitelist_overrides,
        ]),
      ],
    };
    this.policy.set(RouteValidator.POLICY_CACHE_KEY, newPolicy);
    return newPolicy;
  }

  /**
   * Loads the current route policy, cached or via API.
   */
  async loadPolicy(): AsyncResult<RoutePolicy, string> {
    const cachedPolicy = this.getPolicy();
    if (cachedPolicy) return Ok(cachedPolicy);

    // Fetch from API if not in cache
    try {
      const headers = await this.auth.getAuthHeaders();
      if (!headers.ok)
        return Err(`Failed to get auth headers: ${headers.error}`);

      const response = await Fetcher.get<APIResponse<RoutePolicy>>(
        this.apiBaseUrl.endpoint('v2/policy'),
        {
          headers: {
            'Content-Type': 'application/json',
            ...headers.val,
          },
        },
      );

      if (!response.result) return Err(`API Error: ${response.error}`);

      return Ok(this.setPolicy(response.result));
    } catch (error) {
      return Err(`Failed to load policy: ${error}`);
    }
  }

  /**
   * Checks if a given route is valid based on all route rules.
   */
  async isValidRoute(
    fromAsset: ChainAsset,
    toAsset: ChainAsset,
  ): Promise<boolean> {
    const policy = await this.loadPolicy();
    if (!policy.ok) return false;

    // Can't swap to same asset
    if (fromAsset.toString() === toAsset.toString()) return false;

    const { sortedIsolationRules, sortedBlacklistRules, sortedWhitelistRules } =
      this.preprocessRules(policy.val);

    // Check if SOURCE is in an isolation group
    const sourceIsolationRule = this.findMatchingRule(
      fromAsset,
      sortedIsolationRules,
      RuleSide.From,
    );
    if (sourceIsolationRule) {
      // Source is isolated, can only go to destinations in its isolation group
      if (!this.matchesRuleDestination(toAsset, sourceIsolationRule))
        return false;
    }

    // Check if DESTINATION is in an isolation group (only for bidirectional rules)
    const destIsolationRule = this.findMatchingRule(
      toAsset,
      sortedIsolationRules,
      RuleSide.To,
    );
    if (
      destIsolationRule &&
      destIsolationRule.direction === Direction.Bidirectional
    ) {
      // Destination is isolated, can only be reached from sources in its isolation group
      if (!this.matchesRuleSource(fromAsset, destIsolationRule)) return false;
    }

    // Check blacklist
    if (this.matchesRuleList(fromAsset, toAsset, sortedBlacklistRules)) {
      // Check whitelist first (it overrides blacklist)
      if (this.matchesRuleList(fromAsset, toAsset, sortedWhitelistRules))
        return true;
      return false;
    }

    // Default fallback
    return policy.val.default === 'open';
  }

  /**
   * Returns all valid destinations for a given source asset.
   */
  async getValidDestinations(
    fromAsset: ChainAsset,
    allAssets: ChainAsset[],
  ): Promise<ChainAsset[]> {
    const validDestinations: ChainAsset[] = [];
    for (const toAsset of allAssets) {
      if (await this.isValidRoute(fromAsset, toAsset))
        validDestinations.push(toAsset);
    }
    return validDestinations;
  }

  /**
   * Returns every valid route (from-to pair) among the provided assets.
   */
  async getAllValidRoutes(
    assets: ChainAsset[],
  ): Promise<Array<{ from: ChainAsset; to: ChainAsset }>> {
    const routes: Array<{ from: ChainAsset; to: ChainAsset }> = [];

    // Batch process to avoid redundant policy loads
    for (const fromAsset of assets) {
      for (const toAsset of assets) {
        if (await this.isValidRoute(fromAsset, toAsset)) {
          routes.push({ from: fromAsset, to: toAsset });
        }
      }
    }

    return routes;
  }

  /**
   * Turns policy string rules into sorted ParsedRule objects.
   */
  private preprocessRules(policy: RoutePolicy): {
    sortedIsolationRules: ParsedRule[];
    sortedBlacklistRules: ParsedRule[];
    sortedWhitelistRules: ParsedRule[];
  } {
    const sortedIsolationRules = policy.isolation_groups
      .map((rule) => this.parseRule(rule))
      .sort((a, b) => b.specificity - a.specificity);

    const sortedBlacklistRules = policy.blacklist_pairs
      .map((rule) => this.parseRule(rule))
      .sort((a, b) => b.specificity - a.specificity);

    const sortedWhitelistRules = policy.whitelist_overrides
      .map((rule) => this.parseRule(rule))
      .sort((a, b) => b.specificity - a.specificity);

    return { sortedIsolationRules, sortedBlacklistRules, sortedWhitelistRules };
  }

  /**
   * Parses a rule string (e.g. "ethereum:usdc -> base:usdt") into parts.
   */
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

  /**
   * Gives a specificity score to a rule pattern for prioritizing.
   */
  private calculateSpecificity(from: string, to: string): number {
    const score = (pattern: string): number => {
      const lower = pattern.toLowerCase();
      if (lower === Wildcard.Any) return 0;
      if (lower.includes(Wildcard.Any)) return 1; // Single wildcard
      return 2; // exact match
    };

    return score(from) * 10 + score(to);
  }

  /**
   * Finds the first matching rule for an asset given the rule "side".
   */
  private findMatchingRule(
    asset: ChainAsset,
    rules: ParsedRule[],
    side: RuleSide,
  ): ParsedRule | null {
    for (const rule of rules) {
      const pattern =
        side === RuleSide.From ? rule.fromPattern : rule.toPattern;
      if (this.matchesAssetPattern(asset, pattern)) return rule;

      // Check bidirectional
      if (rule.direction === Direction.Bidirectional) {
        const altPattern =
          side === RuleSide.From ? rule.toPattern : rule.fromPattern;
        if (this.matchesAssetPattern(asset, altPattern)) return rule;
      }
    }
    return null;
  }

  /**
   * Checks if a given toAsset matches the rule's destination side.
   */
  private matchesRuleDestination(
    toAsset: ChainAsset,
    rule: ParsedRule,
  ): boolean {
    if (this.matchesAssetPattern(toAsset, rule.toPattern)) return true;
    if (
      rule.direction === Direction.Bidirectional &&
      this.matchesAssetPattern(toAsset, rule.fromPattern)
    )
      return true;
    return false;
  }

  /**
   * Checks if a given fromAsset matches the rule's source side.
   */
  private matchesRuleSource(fromAsset: ChainAsset, rule: ParsedRule): boolean {
    if (this.matchesAssetPattern(fromAsset, rule.fromPattern)) return true;
    if (
      rule.direction === Direction.Bidirectional &&
      this.matchesAssetPattern(fromAsset, rule.toPattern)
    )
      return true;
    return false;
  }

  /**
   * Checks if any rule in a list matches fromAsset and toAsset.
   */
  private matchesRuleList(
    fromAsset: ChainAsset,
    toAsset: ChainAsset,
    rules: ParsedRule[],
  ): boolean {
    return rules.some((rule) => this.matchesRule(fromAsset, toAsset, rule));
  }

  /**
   * Checks if a rule matches fromAsset and toAsset (forward or backward if bidirectional).
   */
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

  /**
   * Checks if an asset string matches a rule's pattern (wildcards supported).
   */
  private matchesAssetPattern(asset: ChainAsset, pattern: string): boolean {
    const [_chain, _symbol] = pattern.split(':');

    const chainMatch =
      (_chain as string) === Wildcard.Any || _chain === asset.chain;
    const assetMatch =
      (_symbol.toLowerCase() as string) === Wildcard.Any ||
      _symbol.toLowerCase() === asset.symbol.toLowerCase();

    return chainMatch && assetMatch;
  }

  async buildRouteMatrix(
    assets: ChainAsset[],
  ): Promise<Record<string, ChainAsset[]>> {
    const matrix: Record<string, ChainAsset[]> = {};

    for (const fromAsset of assets) {
      const validDestinations: ChainAsset[] = [];
      for (const toAsset of assets) {
        if (await this.isValidRoute(fromAsset, toAsset)) {
          validDestinations.push(toAsset);
        }
      }
      matrix[fromAsset.toString()] = validDestinations;
    }

    return matrix;
  }
}

export { RouteValidator, type RoutePolicy };
