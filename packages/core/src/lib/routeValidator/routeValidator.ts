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

  constructor(private apiBaseUrl: string, private apiKey: string) {}

  // Fetch policy from the API
  async loadPolicy(): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/policy`, {
        headers: {
          'garden-app-id': this.apiKey,
          accept: 'application/json',
        },
      });

      const data: PolicyResponse = await response.json();

      if (data.status === 'Ok') {
        this.policy = data.result;
      } else {
        throw new Error(`API Error: ${data.error}`);
      }
    } catch (error) {
      throw new Error(`Failed to load policy: ${error}`);
    }
  }

  // Check if a route is valid based on the policy
  isValidRoute(fromAsset: ChainAsset, toAsset: ChainAsset): boolean {
    if (!this.policy) {
      throw new Error('Policy not loaded. Call loadPolicy() first.');
    }

    // Can't swap to the same asset
    if (fromAsset === toAsset) {
      return false;
    }

    // Check isolation groups first (highest priority)
    if (this.isInIsolationGroup(fromAsset, toAsset)) {
      return this.isValidIsolationGroup(fromAsset, toAsset);
    }

    // Check whitelist overrides (bypass other restrictions)
    if (this.isWhitelistOverride(fromAsset, toAsset)) {
      return true;
    }

    // Check blacklist pairs
    if (this.isBlacklisted(fromAsset, toAsset)) {
      return false;
    }

    // Apply default policy
    return this.policy.default === 'open';
  }

  // Get all valid destination assets for a given source asset
  getValidDestinations(
    fromAsset: ChainAsset,
    allAssets: ChainAsset[],
  ): ChainAsset[] {
    return allAssets.filter((toAsset) => this.isValidRoute(fromAsset, toAsset));
  }

  // Get all possible routes from a list of assets
  getAllValidRoutes(
    assets: ChainAsset[],
  ): Array<{ from: ChainAsset; to: ChainAsset }> {
    const routes: Array<{ from: ChainAsset; to: ChainAsset }> = [];

    for (const fromAsset of assets) {
      for (const toAsset of assets) {
        if (this.isValidRoute(fromAsset, toAsset)) {
          routes.push({ from: fromAsset, to: toAsset });
        }
      }
    }

    return routes;
  }

  // Private helper methods
  private isInIsolationGroup(
    fromAsset: ChainAsset,
    toAsset: ChainAsset,
  ): boolean {
    return this.policy!.isolation_groups.some((group) => {
      const assets = this.parseIsolationGroup(group);
      return assets.includes(fromAsset) || assets.includes(toAsset);
    });
  }

  private isValidIsolationGroup(
    fromAsset: ChainAsset,
    toAsset: ChainAsset,
  ): boolean {
    return this.policy!.isolation_groups.some((group) => {
      const assets = this.parseIsolationGroup(group);
      return assets.includes(fromAsset) && assets.includes(toAsset);
    });
  }

  private isWhitelistOverride(
    fromAsset: ChainAsset,
    toAsset: ChainAsset,
  ): boolean {
    return this.policy!.whitelist_overrides.some((override) =>
      this.matchesPattern(fromAsset, toAsset, override),
    );
  }

  private isBlacklisted(fromAsset: ChainAsset, toAsset: ChainAsset): boolean {
    return this.policy!.blacklist_pairs.some((blacklist) =>
      this.matchesPattern(fromAsset, toAsset, blacklist),
    );
  }

  private parseIsolationGroup(group: string): ChainAsset[] {
    // Parse "ethereum:SEED <-> arbitrum:SEED" format
    const assets = group.split('<->').map((asset) => ChainAsset.from(asset));
    return assets;
  }

  private matchesPattern(
    fromAsset: ChainAsset,
    toAsset: ChainAsset,
    pattern: string,
  ): boolean {
    const [fromPattern, toPattern] = pattern.split('->').map((p) => p.trim());

    return (
      this.matchesAssetPattern(fromAsset, fromPattern) &&
      this.matchesAssetPattern(toAsset, toPattern)
    );
  }

  private matchesAssetPattern(asset: ChainAsset, pattern: string): boolean {
    // Handle wildcard patterns
    if (pattern === '*') return true;

    if (pattern.includes('*')) {
      // Handle patterns like "starknet:*" or "*:USDC"
      if (pattern.endsWith(':*')) {
        const chainPattern = pattern.slice(0, -2);
        return asset.toString().startsWith(chainPattern + ':');
      }
      if (pattern.startsWith('*:')) {
        const symbolPattern = pattern.slice(2);
        return asset.toString().endsWith(':' + symbolPattern);
      }
    }

    // Exact match
    return asset.toString() === pattern;
  }
}

// Helper function to build route matrix for UI
function buildRouteMatrix(
  assets: ChainAsset[],
  validator: RouteValidator,
): Record<string, ChainAsset[]> {
  const matrix: Record<string, ChainAsset[]> = {};

  for (const fromAsset of assets) {
    matrix[fromAsset.toString()] = validator.getValidDestinations(
      fromAsset,
      assets,
    );
  }

  return matrix;
}

// Export for use in your application
export { RouteValidator, buildRouteMatrix, type RoutePolicy };
