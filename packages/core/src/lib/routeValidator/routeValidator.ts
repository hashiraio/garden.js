import { ChainAsset } from '@gardenfi/orderbook';

// Types for the policy configuration
interface RoutePolicy {
  default: 'open' | 'closed';
  isolation_groups: string[];
  blacklist_pairs: string[];
  whitelist_overrides: string[];
}

interface PolicyResponse {
  status: 'Ok' | 'Error';
  result: RoutePolicy;
  error?: string;
}

class RouteValidator {
  private policy: RoutePolicy | null = null;
  constructor(
    private readonly apiBaseUrl: string,
    private readonly apiKey: string,
  ) {}

  // Fetch policy from the API
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

      // this.policy = data.result;
      this.policy = {
        default: 'open',
        isolation_groups: ['arbitrum:seed <-> ethereum:seed'],
        blacklist_pairs: ['solana:* <-> ethereum:*'],
        whitelist_overrides: ['solana:sol -> ethereum:cbbtc'],
      };
    } catch (error) {
      throw new Error(`Failed to load policy: ${error}`);
    }
  }

  isValidRoute(fromAsset: ChainAsset, toAsset: ChainAsset): boolean {
    const policy = this.ensurePolicyLoaded();

    if (fromAsset === toAsset) return false;

    // Check if both assets are in the same isolation group
    const fromGroup = this.findIsolationGroup(fromAsset);
    const toGroup = this.findIsolationGroup(toAsset);

    if (fromGroup !== null || toGroup !== null) {
      return fromGroup === toGroup;
    }

    // Check whitelist overrides
    if (
      this.matchesPatternList(fromAsset, toAsset, policy.whitelist_overrides)
    ) {
      return true;
    }

    // Check blacklist
    if (this.matchesPatternList(fromAsset, toAsset, policy.blacklist_pairs)) {
      return false;
    }

    return policy.default === 'open';
  }

  isAssetInIsolationGroup(asset: ChainAsset): boolean {
    this.ensurePolicyLoaded();
    return this.findIsolationGroup(asset) !== null;
  }

  getValidDestinations(
    fromAsset: ChainAsset,
    allAssets: ChainAsset[],
  ): ChainAsset[] {
    this.ensurePolicyLoaded();

    const fromGroup = this.findIsolationGroup(fromAsset);

    // If in isolation group, only return assets from the same group
    if (fromGroup !== null) {
      return allAssets.filter(
        (asset) =>
          asset !== fromAsset && this.findIsolationGroup(asset) === fromGroup,
      );
    }

    // Otherwise, filter based on route validation
    return allAssets.filter((toAsset) => {
      if (fromAsset === toAsset) return false;
      if (this.findIsolationGroup(toAsset) !== null) return false;
      return this.isValidRoute(fromAsset, toAsset);
    });
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

  private ensurePolicyLoaded(): RoutePolicy {
    if (!this.policy) {
      throw new Error('Policy not loaded. Call loadPolicy() first.');
    }
    return this.policy;
  }

  private findIsolationGroup(asset: ChainAsset): number | null {
    if (!this.policy) return null;

    for (let i = 0; i < this.policy.isolation_groups.length; i++) {
      if (this.matchesIsolationGroup(asset, this.policy.isolation_groups[i])) {
        return i;
      }
    }
    return null;
  }

  private matchesIsolationGroup(asset: ChainAsset, group: string): boolean {
    const patterns = this.parsePattern(group);
    return patterns.some((pattern) => this.matchesAssetPattern(asset, pattern));
  }

  private matchesPatternList(
    fromAsset: ChainAsset,
    toAsset: ChainAsset,
    patterns: string[],
  ): boolean {
    return patterns.some((pattern) =>
      this.matchesRoutePattern(fromAsset, toAsset, pattern),
    );
  }

  private matchesRoutePattern(
    fromAsset: ChainAsset,
    toAsset: ChainAsset,
    pattern: string,
  ): boolean {
    const separator = pattern.includes('<->') ? '<->' : '->';
    const [fromPattern, toPattern] = pattern
      .split(separator)
      .map((p) => p.trim());

    const forwardMatch =
      this.matchesAssetPattern(fromAsset, fromPattern) &&
      this.matchesAssetPattern(toAsset, toPattern);

    if (separator === '<->') {
      const reverseMatch =
        this.matchesAssetPattern(fromAsset, toPattern) &&
        this.matchesAssetPattern(toAsset, fromPattern);
      return forwardMatch || reverseMatch;
    }

    return forwardMatch;
  }

  private parsePattern(pattern: string): string[] {
    const separator = pattern.includes('<->') ? '<->' : '->';
    return pattern.split(separator).map((p) => p.trim());
  }

  private matchesAssetPattern(asset: ChainAsset, pattern: string): boolean {
    const assetStr = asset.toString().toLowerCase();
    const patternLower = pattern.toLowerCase();

    if (patternLower === '*') return true;

    if (patternLower.endsWith(':*')) {
      return assetStr.startsWith(patternLower.slice(0, -2) + ':');
    }

    if (patternLower.startsWith('*:')) {
      return assetStr.endsWith(':' + patternLower.slice(2));
    }

    return assetStr === patternLower;
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
