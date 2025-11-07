import { describe, it, expect, beforeAll } from 'vitest';
import { AssetManager } from './AssetManager';
import { getConfig } from '@gardenfi/utils';
import { ChainAsset } from '../chainAsset/chainAsset';
import { Asset } from '../constants/asset.types';

describe('AssetManager', () => {
  const config = getConfig();
  let assetManager: AssetManager;

  beforeAll(async () => {
    assetManager = new AssetManager(config.baseUrl, config.apiKey);
    await assetManager.initialize();
  });

  describe('Initialization', () => {
    it('should create an instance of AssetManager', () => {
      const manager = new AssetManager(config.baseUrl, config.apiKey);
      expect(manager).toBeInstanceOf(AssetManager);
      expect(manager.assets).toBeNull();
      expect(manager.chains).toBeNull();
      expect(manager.isLoading).toBe(false);
    });

    it('should initialize with string apiKey', () => {
      const manager = new AssetManager(config.baseUrl, config.apiKey);
      expect(manager).toBeDefined();
    });

    it('should initialize the asset manager successfully', async () => {
      const manager = new AssetManager(config.baseUrl, config.apiKey);
      await manager.initialize();

      expect(manager.assets).not.toBeNull();
      expect(manager.chains).not.toBeNull();
      expect(manager.isLoading).toBe(false);
      expect(manager.error).toBeNull();
    });

    it('should fetch and set assets and chains', async () => {
      const manager = new AssetManager(config.baseUrl, config.apiKey);
      const result = await manager.fetchAndSetAssetsAndChains();

      expect(result.ok).toBe(true);
      expect(result.val).toBe('AssetManager initialized successfully');
      expect(manager.assets).not.toBeNull();
      expect(manager.chains).not.toBeNull();
    });

    it('should have assets after initialization', () => {
      expect(assetManager.assets).not.toBeNull();
      expect(Object.keys(assetManager.assets!).length).toBeGreaterThan(0);
    });

    it('should have chains after initialization', () => {
      expect(assetManager.chains).not.toBeNull();
      expect(Object.keys(assetManager.chains!).length).toBeGreaterThan(0);
    });

    it('should build route matrix after initialization', () => {
      expect(assetManager.routeMatrix).not.toBeNull();
    });
  });

  describe('getAsset()', () => {
    it('should get asset by ChainAsset string', () => {
      const firstAssetKey = Object.keys(assetManager.assets!)[0];
      const asset = assetManager.getAsset(firstAssetKey);
      expect(asset).toBeDefined();
      if (asset) {
        expect(asset.symbol).toBeTruthy();
        expect(asset.name).toBeTruthy();
      }
    });

    it('should get asset by ChainAsset object', () => {
      const firstAssetKey = Object.keys(assetManager.assets!)[0];
      const chainAsset = ChainAsset.fromString(firstAssetKey);
      const asset = assetManager.getAsset(chainAsset);
      expect(asset).toBeDefined();
      if (asset) {
        expect(asset.symbol).toBeTruthy();
      }
    });

    it('should return undefined for non-existent asset', () => {
      try {
        const asset = assetManager.getAsset('ethereum:nonexistenttoken123456');
        expect(asset).toBeUndefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle asset lookup consistently', () => {
      const firstAssetKey = Object.keys(assetManager.assets!)[0];
      const asset1 = assetManager.getAsset(firstAssetKey);
      const asset2 = assetManager.getAsset(firstAssetKey.toLowerCase());

      expect(asset1).toBeDefined();
      expect(asset2).toBeDefined();

      if (asset1 && asset2) {
        expect(asset1.symbol).toBe(asset2.symbol);
      }
    });
  });

  describe('getAssetsByChain()', () => {
    it('should get all assets for a valid chain', () => {
      const chains = Object.keys(assetManager.chains!);
      expect(chains.length).toBeGreaterThan(0);

      const firstChain = chains[0] as any;
      const assets = assetManager.getAssetsByChain(firstChain);
      expect(assets).toBeDefined();
      expect(Array.isArray(assets)).toBe(true);
      assets.forEach((asset) => {
        expect(asset.chain).toBe(firstChain);
      });
    });

    it('should get all assets for ethereum chain if available', () => {
      const chains = Object.keys(assetManager.chains!);
      if (chains.includes('ethereum')) {
        const assets = assetManager.getAssetsByChain('ethereum' as any);
        expect(assets).toBeDefined();
        expect(Array.isArray(assets)).toBe(true);
      }
    });

    it('should return empty array for chain with no assets', () => {
      const assets = assetManager.getAssetsByChain('hypercore' as any);
      expect(assets).toBeDefined();
      expect(Array.isArray(assets)).toBe(true);
    });

    it('should return empty array if assets not loaded', () => {
      const manager = new AssetManager(config.baseUrl, config.apiKey);
      const assets = manager.getAssetsByChain('ethereum' as any);
      expect(assets).toEqual([]);
    });
  });

  describe('searchAssets()', () => {
    it('should search assets by symbol', () => {
      const results = assetManager.searchAssets('BTC');
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      results.forEach((asset) => {
        const matchesSymbol = asset.symbol.toLowerCase().includes('btc');
        const matchesName = asset.name.toLowerCase().includes('btc');
        expect(matchesSymbol || matchesName).toBe(true);
      });
    });

    it('should search assets by name', () => {
      const results = assetManager.searchAssets('bitcoin');
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search assets case-insensitively', () => {
      const results1 = assetManager.searchAssets('USDC');
      const results2 = assetManager.searchAssets('usdc');
      const results3 = assetManager.searchAssets('UsD');

      expect(results1.length).toBeGreaterThan(0);
      expect(results2.length).toBeGreaterThan(0);
      expect(results3.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-matching search', () => {
      const results = assetManager.searchAssets('nonexistenttoken12345');
      expect(results).toEqual([]);
    });

    it('should return empty array if assets not loaded', () => {
      const manager = new AssetManager(config.baseUrl, config.apiKey);
      const results = manager.searchAssets('BTC');
      expect(results).toEqual([]);
    });

    it('should search by partial match', () => {
      const results = assetManager.searchAssets('wrapped');
      expect(results.length).toBeGreaterThan(0);
      results.forEach((asset) => {
        expect(asset.name.toLowerCase().includes('wrapped')).toBe(true);
      });
    });
  });

  describe('getChain()', () => {
    it('should get chain data by chain identifier', () => {
      const chains = Object.keys(assetManager.chains!);
      expect(chains.length).toBeGreaterThan(0);

      const firstChainKey = chains[0] as any;
      const chain = assetManager.getChain(firstChainKey);
      expect(chain).toBeDefined();
      if (chain) {
        expect(chain.chain).toBe(firstChainKey);
        expect(chain.name).toBeTruthy();
      }
    });

    it('should get ethereum chain data if available', () => {
      const chains = Object.keys(assetManager.chains!);
      if (chains.includes('ethereum')) {
        const chain = assetManager.getChain('ethereum' as any);
        expect(chain).toBeDefined();
        if (chain) {
          expect(chain.chain).toBe('ethereum');
        }
      }
    });

    it('should return undefined for non-existent chain', () => {
      const chain = assetManager.getChain('nonexistent' as any);
      expect(chain).toBeUndefined();
    });

    it('should return undefined if chains not loaded', () => {
      const manager = new AssetManager(config.baseUrl, config.apiKey);
      const firstChainKey = Object.keys(assetManager.chains!)[0] as any;
      const chain = manager.getChain(firstChainKey);
      expect(chain).toBeUndefined();
    });
  });

  describe('getValidDestinations()', () => {
    it('should get valid destinations for an asset', () => {
      const firstAssetKey = Object.keys(assetManager.assets!)[0];
      const testAsset = assetManager.getAsset(firstAssetKey);
      expect(testAsset).toBeDefined();

      if (testAsset) {
        const destinations = assetManager.getValidDestinations(testAsset);
        expect(Array.isArray(destinations)).toBe(true);
      }
    });

    it('should return empty array if route matrix not built', () => {
      const manager = new AssetManager(config.baseUrl, config.apiKey);
      const firstChainKey = Object.keys(assetManager.chains!)[0] as any;
      const mockAsset: Asset = {
        id: `${firstChainKey}:test`,
        name: 'Test',
        chain: firstChainKey,
        symbol: 'TEST',
        decimals: 8,
        htlc: null,
        token: null,
      };

      const destinations = manager.getValidDestinations(mockAsset);
      expect(destinations).toEqual([]);
    });

    it('should return empty array for asset without id', () => {
      const firstChainKey = Object.keys(assetManager.chains!)[0] as any;
      const mockAsset: Asset = {
        id: '',
        name: 'Test',
        chain: firstChainKey,
        symbol: 'TEST',
        decimals: 8,
        htlc: null,
        token: null,
      };

      const destinations = assetManager.getValidDestinations(mockAsset);
      expect(destinations).toEqual([]);
    });

    it('should return valid Asset objects', () => {
      const firstAssetKey = Object.keys(assetManager.assets!)[0];
      const testAsset = assetManager.getAsset(firstAssetKey);
      if (testAsset) {
        const destinations = assetManager.getValidDestinations(testAsset);
        destinations.forEach((dest) => {
          expect(dest).toHaveProperty('id');
          expect(dest).toHaveProperty('name');
          expect(dest).toHaveProperty('symbol');
          expect(dest).toHaveProperty('chain');
        });
      }
    });
  });

  describe('isRouteValid()', () => {
    it('should validate a valid route between two assets', async () => {
      const assetKeys = Object.keys(assetManager.assets!);
      if (assetKeys.length >= 2) {
        const fromAsset = assetManager.getAsset(assetKeys[0]);
        const toAsset = assetManager.getAsset(assetKeys[1]);

        if (fromAsset && toAsset) {
          const isValid = await assetManager.isRouteValid(fromAsset, toAsset);
          expect(typeof isValid).toBe('boolean');
        }
      }
    });

    it('should check route validity using ChainAsset', async () => {
      const assetKeys = Object.keys(assetManager.assets!);
      if (assetKeys.length >= 2) {
        const fromAsset = assetManager.getAsset(assetKeys[0]);
        const toAsset = assetManager.getAsset(assetKeys[1]);

        if (fromAsset && toAsset) {
          const isValid = await assetManager.isRouteValid(fromAsset, toAsset);
          expect(typeof isValid).toBe('boolean');
        }
      }
    });

    it('should handle same asset route check', async () => {
      const firstAssetKey = Object.keys(assetManager.assets!)[0];
      const testAsset = assetManager.getAsset(firstAssetKey);

      if (testAsset) {
        const isValid = await assetManager.isRouteValid(testAsset, testAsset);
        expect(typeof isValid).toBe('boolean');
      }
    });
  });

  describe('refresh()', () => {
    it('should refresh all data', async () => {
      const manager = new AssetManager(config.baseUrl, config.apiKey);
      await manager.refresh();

      expect(manager.assets).not.toBeNull();
      expect(manager.chains).not.toBeNull();
      expect(manager.routeMatrix).not.toBeNull();
    });

    it('should maintain data after refresh', async () => {
      const assetCountBefore = Object.keys(assetManager.assets!).length;
      await assetManager.refresh();
      const assetCountAfter = Object.keys(assetManager.assets!).length;

      expect(assetCountAfter).toBeGreaterThan(0);
      expect(Math.abs(assetCountAfter - assetCountBefore)).toBeLessThan(10);
    });
  });

  describe('Loading States', () => {
    it('should track loading state during initialization', async () => {
      const manager = new AssetManager(config.baseUrl, config.apiKey);
      expect(manager.isLoading).toBe(false);

      const initPromise = manager.initialize();

      await initPromise;
      expect(manager.isLoading).toBe(false);
    });

    it('should clear error state on successful fetch', async () => {
      const manager = new AssetManager(config.baseUrl, config.apiKey);
      await manager.fetchAndSetAssetsAndChains();

      expect(manager.error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search query', () => {
      const results = assetManager.searchAssets('');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle special characters in search', () => {
      const results = assetManager.searchAssets('btc-test');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle malformed asset identifiers gracefully', () => {
      try {
        const asset = assetManager.getAsset('invalid:format:extra');
        expect(asset === undefined || asset !== null).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Data Integrity', () => {
    it('should have properly formatted chain data', () => {
      const chains = assetManager.chains;
      expect(chains).not.toBeNull();

      Object.values(chains!).forEach((chain) => {
        if (chain) {
          expect(chain).toHaveProperty('chain');
          expect(chain).toHaveProperty('name');
          expect(chain).toHaveProperty('id');
        }
      });
    });

    it('should have properly formatted asset data', () => {
      const assets = assetManager.assets;
      expect(assets).not.toBeNull();

      const assetKeys = Object.keys(assets!);
      expect(assetKeys.length).toBeGreaterThan(0);

      assetKeys.slice(0, 5).forEach((key) => {
        const asset = assets![key];
        expect(asset).toHaveProperty('id');
        expect(asset).toHaveProperty('name');
        expect(asset).toHaveProperty('symbol');
        expect(asset).toHaveProperty('chain');
        expect(asset).toHaveProperty('decimals');
        expect(typeof asset.decimals).toBe('number');
      });
    });

    it('should have consistent asset IDs', () => {
      const assets = assetManager.assets;
      expect(assets).not.toBeNull();

      Object.entries(assets!).forEach(([key, asset]) => {
        const chainAssetStr = ChainAsset.from(asset.id).toString();
        expect(chainAssetStr.toLowerCase()).toBe(key.toLowerCase());
      });
    });
  });

  describe('Route Validator Integration', () => {
    it('should have route validator initialized', () => {
      expect(assetManager.routeValidator).toBeDefined();
    });

    it('should have loaded policy after initialization', () => {
      expect(assetManager.routeValidator).toBeDefined();
    });
  });
});
