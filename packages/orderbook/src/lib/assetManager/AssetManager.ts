import { Fetcher, APIResponse, Url } from '@gardenfi/utils';
import {
  RouteValidator,
  buildRouteMatrix,
} from './routeValidator/routeValidator';
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
  private _allChains: Chains | null = null;
  private _allAssets: Assets | null = null;
  private _assets: Assets | null = null;
  private _chains: Chains | null = null;

  // Route validation
  private _routeValidator: RouteValidator | null = null;
  private _routeMatrix: Record<string, ChainAsset[]> | null = null;

  // Loading states
  private _isLoading = false;
  private _error: string | null = null;

  // Configuration
  private readonly url: Url;
  private apiKey: string;

  constructor(url: string, apiKey: string) {
    this.url = new Url(url);
    this.apiKey = apiKey;
  }

  // ============================================
  // Getters
  // ============================================

  get allChains(): Chains | null {
    return this._allChains;
  }

  get allAssets(): Assets | null {
    return this._allAssets;
  }

  get assets(): Assets | null {
    return this._assets;
  }

  get chains(): Chains | null {
    return this._chains;
  }

  get routeValidator(): RouteValidator | null {
    return this._routeValidator;
  }

  get routeMatrix(): Record<string, ChainAsset[]> | null {
    return this._routeMatrix;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get error(): string | null {
    return this._error;
  }

  // ============================================
  // Initialization Methods
  // ============================================

  /**
   * Initialize the AssetManager by fetching all required data
   */
  async initialize(): Promise<void> {
    await this.fetchAndSetAssetsAndChains();
  }

  /**
   * Fetch and cache asset and chain data from API
   */
  async fetchAndSetAssetsAndChains(): Promise<void> {
    try {
      this._isLoading = true;
      this._error = null;

      // Initialize route validator
      await this.initializeRouteValidator();

      // Fetch chains and assets data from the provided url
      const url = this.url.endpoint('/v2/chains');
      const res = await Fetcher.get<APIResponse<ApiChainData[]>>(url);

      if (res.error) {
        throw new Error(res.error);
      }

      if (!res.result) {
        throw new Error('Failed to fetch chains data');
      }

      // Process and store data
      const { allChains, allAssets, assets, chains } = this.processApiData(
        res.result,
      );

      this._allChains = allChains;
      this._allAssets = allAssets;
      this._assets = assets;
      this._chains = chains;

      // Build route matrix for performance
      await this.buildRouteMatrix();

      console.info('AssetManager initialized successfully ✅');
    } catch (error) {
      console.error('Failed to fetch assets data ❌', error);
      this._error = 'Failed to fetch assets data';
      throw error;
    } finally {
      this._isLoading = false;
    }
  }

  // ============================================
  // Route Validation Methods
  // ============================================

  /**
   * Check if a swap route from one asset to another is valid
   */
  async isRouteValid(from: Asset, to: Asset): Promise<boolean> {
    if (!this._routeValidator || !from || !to || !from.id || !to.id) {
      console.warn('Missing routeValidator, from, or to. Returning true.');
      return true;
    }

    try {
      const fromChainAsset = ChainAsset.from(from.id);
      const toChainAsset = ChainAsset.from(to.id);

      return await this._routeValidator.isValidRoute(
        fromChainAsset,
        toChainAsset,
      );
    } catch (error) {
      console.error('Error in isRouteValid:', error);
      return true;
    }
  }

  /**
   * Get all valid destination assets for a given source asset
   */
  getValidDestinations(fromAsset: Asset): Asset[] {
    // Fallback if data not ready
    if (!this._routeMatrix || !this._assets || !fromAsset.id) {
      return Object.values(this._assets || {});
    }

    try {
      const validChainAssets = this._routeMatrix[fromAsset.id.toString()];

      if (!validChainAssets) {
        return Object.values(this._assets);
      }

      // Convert ChainAsset array back to Asset array
      return validChainAssets
        .map((chainAsset) => {
          const assetId = chainAsset.toString();
          return Object.values(this._assets!).find((asset) => {
            const assetAssetId = ChainAsset.from(asset).toString();
            return assetAssetId === assetId;
          });
        })
        .filter(Boolean) as Asset[];
    } catch (error) {
      console.error('Error in getValidDestinations:', error);
      return Object.values(this._assets || {});
    }
  }

  // ============================================
  // Asset Query Methods
  // ============================================

  /**
   * Get asset by chain and token address
   */
  getAsset(asset: string | Asset | ChainAsset): Asset | undefined {
    if (!this._assets) return undefined;
    const tokenKey = ChainAsset.from(asset).toString();
    return this._assets[tokenKey];
  }

  /**
   * Get all assets for a specific chain
   */
  getAssetsByChain(chain: Chain): Asset[] {
    if (!this._assets) return [];
    return Object.values(this._assets).filter((asset) => asset.chain === chain);
  }

  /**
   * Search assets by symbol or name
   */
  searchAssets(query: string): Asset[] {
    if (!this._assets) return [];
    const lowerQuery = query.toLowerCase();
    return Object.values(this._assets).filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(lowerQuery) ||
        asset.name.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Get chain data by chain identifier
   */
  getChain(chain: Chain): ChainData | undefined {
    if (!this._chains) return undefined;
    return this._chains[chain];
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Initialize the route validator
   */
  private async initializeRouteValidator(): Promise<void> {
    this._routeValidator = new RouteValidator(this.url.toString(), this.apiKey);
    await this._routeValidator.loadPolicy();
  }

  /**
   * Build route matrix for fast O(1) route lookups
   */
  private async buildRouteMatrix(): Promise<void> {
    if (!this._allAssets || !this._routeValidator) {
      return;
    }

    const allChainAssets = Object.values(this._allAssets)
      .map((asset) => {
        if (!asset.id) return null;
        try {
          return ChainAsset.from(asset.id);
        } catch {
          return null;
        }
      })
      .filter((asset): asset is ChainAsset => asset !== null);

    this._routeMatrix = await buildRouteMatrix(
      allChainAssets,
      this._routeValidator,
    );
  }

  /**
   * Process raw API data into structured format
   */
  private processApiData(apiData: ApiChainData[]): {
    allChains: Chains;
    allAssets: Assets;
    assets: Assets;
    chains: Chains;
  } {
    const allChains: Chains = {};
    const allAssets: Assets = {};
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

      allChains[chainIdentifier] = chainData;
      let totalAssets = 0;

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

        allAssets[tokenKey] = asset;
        assets[tokenKey] = asset;
        totalAssets++;
      }

      if (totalAssets > 0) {
        chains[chainIdentifier] = chainData;
      }
    }

    return { allChains, allAssets, assets, chains };
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

  /**
   * Clear all cached data
   */
  clear(): void {
    this._allChains = null;
    this._allAssets = null;
    this._assets = null;
    this._chains = null;
    this._routeValidator = null;
    this._routeMatrix = null;
    this._error = null;
  }
}
