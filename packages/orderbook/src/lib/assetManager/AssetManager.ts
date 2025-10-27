import {
  Fetcher,
  APIResponse,
  Url,
  Ok,
  AsyncResult,
  Err,
  IAuth,
  ApiKey,
} from '@gardenfi/utils';
import { RouteValidator } from './routeValidator/routeValidator';
import { ApiChainData, Assets, ChainData, Chains } from './types';
import { Config } from '../constants/asset';
import { ChainAsset } from '../chainAsset/chainAsset';
import { Asset, Chain } from '../constants/asset.types';
import { parseAssetNameSymbol } from './utils';

// All supported chains from the Config
const SUPPORTED_CHAINS = Object.keys(Config) as Chain[];

/**
 * AssetManager
 *
 * It fetches asset data from our API, caches it locally, and provides methods
 * to check if routes between assets are valid. Also builds a route matrix
 * to make route lookups fast.
 */
export class AssetManager {
  // Core data stores
  assets: Assets | null = null;
  chains: Chains | null = null;

  // Route validation
  routeValidator: RouteValidator;
  routeMatrix: Record<string, ChainAsset[]> | null = null;

  // Loading states
  isLoading = false;
  error: string | null = null;

  // Configuration
  private readonly url: Url;
  private auth: IAuth;

  constructor(url: string, apiKey: IAuth | string) {
    this.url = new Url(url);
    if (typeof apiKey === 'string') this.auth = new ApiKey(apiKey);
    else this.auth = apiKey;
    this.routeValidator = new RouteValidator(this.url.toString(), this.auth);
  }

  // ============================================
  // Initialization Methods
  // ============================================

  /**
   * Initialize the AssetManager by fetching all required data
   */
  async initialize(): Promise<void> {
    await this.fetchAndSetAssetsAndChains();
    await this.routeValidator.loadPolicy();
  }

  /**
   * Fetch and cache asset and chain data from API
   */
  async fetchAndSetAssetsAndChains(): AsyncResult<string, string> {
    try {
      this.isLoading = true;
      this.error = null;

      const authHeaders = await this.auth.getAuthHeaders();
      if (!authHeaders.ok) return Err('Failed to get auth headers');

      // Fetch chains and assets data from the provided url
      const url = this.url.endpoint('/v2/chains');
      const res = await Fetcher.get<APIResponse<ApiChainData[]>>(url, {
        headers: {
          ...authHeaders.val,
        },
      });

      if (!res.result) return Err(`Failed to fetch chains data: ${res.error}`);

      // Process and store data
      const { assets, chains } = this.processApiData(res.result);

      this.assets = assets;
      this.chains = chains;

      // Build route matrix for performance
      await this.buildRouteMatrix();

      return Ok('AssetManager initialized successfully');
    } catch (error) {
      return Err(`Failed to fetch assets data: ${error}`);
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================
  // Route Validation Methods
  // ============================================

  /**
   * Check if a swap route from one asset to another is valid
   */
  async isRouteValid(from: Asset, to: Asset): Promise<boolean> {
    return await this.routeValidator.isValidRoute(
      ChainAsset.from(from.id),
      ChainAsset.from(to.id),
    );
  }

  /**
   * Get all valid destination assets for a given source asset
   */
  getValidDestinations(asset: Asset): Asset[] {
    // Fallback if data not ready
    if (!this.routeMatrix || !this.assets || !asset.id) {
      console.warn(
        'Missing routeMatrix, assets, or asset. Returning all assets.',
      );
      return [];
    }

    const validChainAssets =
      this.routeMatrix[asset.id.toString().toLowerCase()];
    if (!validChainAssets) return [];

    // Convert ChainAsset array back to Asset array
    return validChainAssets
      .map((chainAsset) => {
        const assetId = chainAsset.toString();
        return Object.values(this.assets!).find((asset) => {
          const assetAssetId = ChainAsset.from(asset).toString();
          return assetAssetId === assetId;
        });
      })
      .filter(Boolean) as Asset[];
  }

  // ============================================
  // Asset Query Methods
  // ============================================

  /**
   * Get asset by chain and token address
   */
  getAsset(asset: string | Asset | ChainAsset): Asset | undefined {
    if (!this.assets) return undefined;
    const tokenKey = ChainAsset.from(asset).toString();
    return this.assets[tokenKey];
  }

  /**
   * Get all assets for a specific chain
   */
  getAssetsByChain(chain: Chain): Asset[] {
    if (!this.assets) return [];
    return Object.values(this.assets).filter((asset) => asset.chain === chain);
  }

  /**
   * Search assets by symbol or name
   */
  searchAssets(query: string): Asset[] {
    if (!this.assets) return [];
    const lowerQuery = query.toLowerCase();
    return Object.values(this.assets).filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(lowerQuery) ||
        asset.name.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Get chain data by chain identifier
   */
  getChain(chain: Chain): ChainData | undefined {
    if (!this.chains) return undefined;
    return this.chains[chain];
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Build route matrix for fast O(1) route lookups
   */
  async buildRouteMatrix(): Promise<void> {
    if (!this.assets || !this.routeValidator) return;

    const allChainAssets = Object.values(this.assets)
      .map((asset) => {
        if (!asset.id) return null;
        try {
          return ChainAsset.from(asset.id);
        } catch {
          return null;
        }
      })
      .filter((asset): asset is ChainAsset => asset !== null);

    this.routeMatrix = await this.routeValidator.buildRouteMatrix(
      allChainAssets,
    );
  }

  /**
   * Process raw API data into structured format
   */
  private processApiData(apiData: ApiChainData[]): {
    assets: Assets;
    chains: Chains;
  } {
    const assets: Assets = {};
    const chains: Chains = {};

    for (const apiChain of apiData) {
      const chainIdentifier = this.parseChainIdentifier(apiChain.chain);

      if (!chainIdentifier || !SUPPORTED_CHAINS.includes(chainIdentifier)) {
        continue;
      }

      const chainData: ChainData = {
        ...apiChain,
        name: this.formatChainName(apiChain.chain),
        chain: chainIdentifier,
      };

      for (const apiAsset of apiChain.assets) {
        const tokenKey = ChainAsset.from(apiAsset.id).toString();

        const { name, symbol } = parseAssetNameSymbol(
          apiAsset.name,
          apiAsset.id,
        );

        const asset: Asset = {
          ...apiAsset,
          id: ChainAsset.from(apiAsset.id),
          chain: chainIdentifier,
          name,
          symbol,
        };

        assets[tokenKey] = asset;

        if (!chains[chainIdentifier]) chains[chainIdentifier] = chainData;
      }
    }

    return { assets, chains };
  }

  /**
   * Parse chain identifier from string
   */
  private parseChainIdentifier(chainName: string): Chain | null {
    return SUPPORTED_CHAINS.includes(chainName as Chain)
      ? (chainName as Chain)
      : null;
  }

  /**
   * Format chain name for display
   */
  private formatChainName(chainName: string): string {
    return chainName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // ============================================
  // Data Refresh Methods
  // ============================================

  /**
   * Refresh all data
   */
  async refresh(): Promise<void> {
    await this.initialize();
  }
}
