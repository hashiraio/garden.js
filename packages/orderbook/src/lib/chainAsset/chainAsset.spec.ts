import { describe, expect, it } from 'vitest';
import { ChainAsset } from './chainAsset';
import { Assets } from '../constants/asset';
import { Asset } from '../constants/asset.types';

describe('ChainAsset', () => {
  describe('constructor()', () => {
    it('should create a ChainAsset instance with valid chain and symbol', () => {
      const chainAsset = new ChainAsset('ethereum', 'WBTC');

      expect(chainAsset).toBeInstanceOf(ChainAsset);
      expect(chainAsset.chain).toBe('ethereum');
      expect(chainAsset.symbol).toBe('WBTC');
      expect(chainAsset.formatted).toBe('ethereum:wbtc');
      expect(chainAsset.blockchainType).toBeDefined();
      expect(chainAsset.network).toBeDefined();
    });

    it('should normalize chain and symbol to lowercase in formatted property', () => {
      const chainAsset = new ChainAsset('ethereum', 'WBTC');
      expect(chainAsset.formatted).toBe('ethereum:wbtc');
    });

    it('should set blockchain type based on chain', () => {
      const ethChainAsset = new ChainAsset('ethereum', 'ETH');
      expect(ethChainAsset.blockchainType).toBe('evm');
    });
  });

  describe('fromChainAndSymbol()', () => {
    it('should create a ChainAsset from chain and symbol', () => {
      const chainAsset = ChainAsset.fromChainAndSymbol('ethereum', 'WBTC');

      expect(chainAsset).toBeInstanceOf(ChainAsset);
      expect(chainAsset.chain).toBe('ethereum');
      expect(chainAsset.symbol).toBe('WBTC');
      expect(chainAsset.toString()).toBe('ethereum:wbtc');
    });

    it('should work with different chains', () => {
      const btcChainAsset = ChainAsset.fromChainAndSymbol('bitcoin', 'BTC');
      expect(btcChainAsset.chain).toBe('bitcoin');
      expect(btcChainAsset.symbol).toBe('BTC');
      expect(btcChainAsset.toString()).toBe('bitcoin:btc');
    });

    it('should work with solana chain', () => {
      const solChainAsset = ChainAsset.fromChainAndSymbol('solana', 'SOL');
      expect(solChainAsset.chain).toBe('solana');
      expect(solChainAsset.blockchainType).toBe('solana');
    });
  });

  describe('fromString()', () => {
    it('should create a ChainAsset from formatted string', () => {
      const chainAsset = ChainAsset.fromString('ethereum:wbtc');

      expect(chainAsset).toBeInstanceOf(ChainAsset);
      expect(chainAsset.chain).toBe('ethereum');
      expect(chainAsset.symbol).toBe('wbtc');
      expect(chainAsset.toString()).toBe('ethereum:wbtc');
    });

    it('should parse different chain asset strings', () => {
      const btcAsset = ChainAsset.fromString('bitcoin:btc');
      expect(btcAsset.chain).toBe('bitcoin');
      expect(btcAsset.symbol).toBe('btc');
    });

    it('should handle uppercase in input', () => {
      const chainAsset = ChainAsset.fromString('ethereum:WBTC');
      expect(chainAsset.symbol).toBe('WBTC');
      expect(chainAsset.toString()).toBe('ethereum:wbtc');
    });

    it('should throw error for invalid chain', () => {
      expect(() => {
        ChainAsset.fromString('invalidchain:token');
      }).toThrow('Invalid chain in asset string: invalidchain');
    });

    it('should throw error for malformed string without colon', () => {
      expect(() => {
        ChainAsset.fromString('ethereumwbtc');
      }).toThrow();
    });
  });

  describe('fromAsset()', () => {
    it('should create a ChainAsset from an Asset object', () => {
      const mockAsset: Asset = {
        id: 'ethereum:wbtc',
        name: 'Wrapped Bitcoin',
        chain: 'ethereum',
        symbol: 'WBTC',
        decimals: 8,
        htlc: null,
        token: null,
      };

      const chainAsset = ChainAsset.fromAsset(mockAsset);

      expect(chainAsset).toBeInstanceOf(ChainAsset);
      expect(chainAsset.chain).toBe('ethereum');
      expect(chainAsset.symbol).toBe('WBTC');
      expect(chainAsset.toString()).toBe('ethereum:wbtc');
    });

    it('should work with real assets from Assets config', () => {
      // Test with a known asset from ethereum chain
      if (Assets.ethereum && Assets.ethereum.WBTC) {
        const asset = Assets.ethereum.WBTC;
        const chainAsset = ChainAsset.fromAsset(asset);
        expect(chainAsset).toBeInstanceOf(ChainAsset);
        expect(chainAsset.chain).toBe('ethereum');
        expect(chainAsset.symbol).toBe('WBTC');
      }
    });
  });

  describe('from()', () => {
    it('should handle ChainAsset instance', () => {
      const original = new ChainAsset('ethereum', 'WBTC');
      const result = ChainAsset.from(original);

      expect(result).toBe(original);
      expect(result.toString()).toBe('ethereum:wbtc');
    });

    it('should handle string input', () => {
      const chainAsset = ChainAsset.from('ethereum:wbtc');

      expect(chainAsset).toBeInstanceOf(ChainAsset);
      expect(chainAsset.chain).toBe('ethereum');
      expect(chainAsset.symbol).toBe('wbtc');
    });

    it('should handle Asset object input', () => {
      const mockAsset: Asset = {
        id: 'bitcoin:btc',
        name: 'Bitcoin',
        chain: 'bitcoin',
        symbol: 'BTC',
        decimals: 8,
        htlc: null,
        token: null,
      };

      const chainAsset = ChainAsset.from(mockAsset);

      expect(chainAsset).toBeInstanceOf(ChainAsset);
      expect(chainAsset.chain).toBe('bitcoin');
      expect(chainAsset.symbol).toBe('BTC');
    });

    it('should handle ChainAssetString type', () => {
      const chainAssetString = 'arbitrum:wbtc' as const;
      const chainAsset = ChainAsset.from(chainAssetString);

      expect(chainAsset.chain).toBe('arbitrum');
      expect(chainAsset.symbol).toBe('wbtc');
    });
  });

  describe('toString()', () => {
    it('should return formatted chain:symbol string', () => {
      const chainAsset = new ChainAsset('ethereum', 'WBTC');
      expect(chainAsset.toString()).toBe('ethereum:wbtc');
    });

    it('should always return lowercase format', () => {
      const chainAsset = new ChainAsset('ethereum', 'WBTC');
      expect(chainAsset.toString()).toBe('ethereum:wbtc');
      expect(chainAsset.toString()).not.toBe('ETHEREUM:WBTC');
    });

    it('should match formatted property', () => {
      const chainAsset = new ChainAsset('bitcoin', 'BTC');
      expect(chainAsset.toString()).toBe(chainAsset.formatted);
    });
  });

  describe('Properties', () => {
    it('should have all required properties set', () => {
      const chainAsset = new ChainAsset('ethereum', 'WBTC');

      expect(chainAsset.chain).toBeDefined();
      expect(chainAsset.symbol).toBeDefined();
      expect(chainAsset.blockchainType).toBeDefined();
      expect(chainAsset.formatted).toBeDefined();
      expect(chainAsset.network).toBeDefined();
      expect(chainAsset.asset).toBeDefined();
    });

    it('should have correct network for mainnet chains', () => {
      const ethChainAsset = new ChainAsset('ethereum', 'WBTC');
      expect(ethChainAsset.network).toBe('mainnet');
    });

    it('should have correct blockchain types', () => {
      const ethAsset = new ChainAsset('ethereum', 'ETH');
      const btcAsset = new ChainAsset('bitcoin', 'BTC');
      const solAsset = new ChainAsset('solana', 'SOL');

      expect(ethAsset.blockchainType).toBe('evm');
      expect(btcAsset.blockchainType).toBe('bitcoin');
      expect(solAsset.blockchainType).toBe('solana');
    });
  });

  describe('Edge Cases', () => {
    it('should handle symbols with special characters', () => {
      const chainAsset = ChainAsset.fromString('ethereum:cbbtc');
      expect(chainAsset.symbol).toBe('cbbtc');
      expect(chainAsset.toString()).toBe('ethereum:cbbtc');
    });

    it('should handle chain asset with mixed case consistently', () => {
      const ca1 = ChainAsset.fromString('ethereum:WBTC');
      const ca2 = ChainAsset.fromString('ethereum:wbtc');

      // toString should always return lowercase
      expect(ca1.toString()).toBe('ethereum:wbtc');
      expect(ca2.toString()).toBe('ethereum:wbtc');
    });

    it('should preserve original case in symbol property but lowercase in formatted', () => {
      const chainAsset = new ChainAsset('ethereum', 'WBTC');
      expect(chainAsset.symbol).toBe('WBTC');
      expect(chainAsset.formatted).toBe('ethereum:wbtc');
    });
  });
});
