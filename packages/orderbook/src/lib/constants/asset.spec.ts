import { describe, expect, it } from 'vitest';
import {
  Assets,
  Chains,
  Config,
  OrderStatus,
  OrderLifecycle,
  isMainnet,
  isEVM,
  isBitcoin,
  isSolana,
  isStarknet,
  isSui,
  getBlockchainType,
  isEvmNativeToken,
  isSolanaNativeToken,
  isSuiNativeToken,
  isNativeToken,
  NATIVE_TOKENS,
} from './asset';
import { ChainAsset } from '../chainAsset/chainAsset';
import { BlockchainType } from './asset.types';

describe('Asset Constants', () => {
  describe('Config', () => {
    it('should be defined and have chain configurations', () => {
      expect(Config).toBeDefined();
      expect(typeof Config).toBe('object');
      expect(Object.keys(Config).length).toBeGreaterThan(0);
    });

    it('should have mainnet chains', () => {
      expect(Config.bitcoin).toBeDefined();
      expect(Config.ethereum).toBeDefined();
      expect(Config.arbitrum).toBeDefined();
      expect(Config.solana).toBeDefined();
    });

    it('should have testnet chains', () => {
      expect(Config.bitcoin_testnet).toBeDefined();
      expect(Config.ethereum_sepolia).toBeDefined();
      expect(Config.arbitrum_sepolia).toBeDefined();
    });

    it('should have correct chain structure with type and network', () => {
      expect(Config.ethereum.type).toBe(BlockchainType.evm);
      expect(Config.ethereum.network).toBe('mainnet');
      expect(Config.bitcoin.type).toBe(BlockchainType.bitcoin);
    });
  });

  describe('Chains', () => {
    it('should be defined and contain chain identifiers', () => {
      expect(Chains).toBeDefined();
      expect(typeof Chains).toBe('object');
      expect(Object.keys(Chains).length).toBeGreaterThan(0);
    });

    it('should have chain keys equal to their values', () => {
      expect(Chains.ethereum).toBe('ethereum');
      expect(Chains.bitcoin).toBe('bitcoin');
      expect(Chains.solana).toBe('solana');
    });

    it('should contain all chains from Config', () => {
      const configChains = Object.keys(Config);
      const chainKeys = Object.keys(Chains);
      expect(chainKeys.length).toBe(configChains.length);
    });
  });

  describe('Assets', () => {
    it('should be defined and contain assets', () => {
      expect(Assets).toBeDefined();
      expect(typeof Assets).toBe('object');
      expect(Object.keys(Assets).length).toBeGreaterThan(0);
    });

    it('should have ethereum assets', () => {
      expect(Assets.ethereum).toBeDefined();
      if (Assets.ethereum.WBTC) {
        expect(Assets.ethereum.WBTC.symbol).toBe('WBTC');
        expect(Assets.ethereum.WBTC.chain).toBe('ethereum');
      }
    });

    it('should have bitcoin assets', () => {
      expect(Assets.bitcoin).toBeDefined();
      if (Assets.bitcoin.BTC) {
        expect(Assets.bitcoin.BTC.symbol).toBe('BTC');
        expect(Assets.bitcoin.BTC.chain).toBe('bitcoin');
      }
    });

    it('should have assets with correct structure', () => {
      const ethWBTC = Assets.ethereum?.WBTC;
      if (ethWBTC) {
        expect(ethWBTC).toHaveProperty('id');
        expect(ethWBTC).toHaveProperty('name');
        expect(ethWBTC).toHaveProperty('symbol');
        expect(ethWBTC).toHaveProperty('chain');
        expect(ethWBTC).toHaveProperty('decimals');
      }
    });
  });

  describe('OrderStatus', () => {
    it('should be defined with all statuses', () => {
      expect(OrderStatus.Created).toBe('Created');
      expect(OrderStatus.Initiated).toBe('Initiated');
      expect(OrderStatus.Redeemed).toBe('Redeemed');
      expect(OrderStatus.Refunded).toBe('Refunded');
      expect(OrderStatus.Expired).toBe('Expired');
    });

    it('should have all expected order statuses', () => {
      const statuses = Object.values(OrderStatus);
      expect(statuses).toContain('Created');
      expect(statuses).toContain('Initiate Detected');
      expect(statuses).toContain('Initiated');
      expect(statuses).toContain('Awaiting Redeem');
      expect(statuses).toContain('Redeem Detected');
      expect(statuses).toContain('Redeemed');
    });
  });

  describe('OrderLifecycle', () => {
    it('should be defined with all lifecycle states', () => {
      expect(OrderLifecycle.refunded).toBe('refunded');
      expect(OrderLifecycle.expired).toBe('expired');
      expect(OrderLifecycle.completed).toBe('completed');
      expect(OrderLifecycle.inProgress).toBe('in-progress');
      expect(OrderLifecycle.notInitiated).toBe('not-initiated');
      expect(OrderLifecycle.all).toBe('all');
      expect(OrderLifecycle.pending).toBe('pending');
      expect(OrderLifecycle.fulfilled).toBe('fulfilled');
    });
  });

  describe('NATIVE_TOKENS', () => {
    it('should define native tokens for each blockchain type', () => {
      expect(NATIVE_TOKENS[BlockchainType.evm]).toBe('eth');
      expect(NATIVE_TOKENS[BlockchainType.solana]).toBe('sol');
      expect(NATIVE_TOKENS[BlockchainType.sui]).toBe('sui');
    });
  });
});

describe('Chain Utility Functions', () => {
  describe('isMainnet()', () => {
    it('should return true for mainnet chains', () => {
      expect(isMainnet('ethereum')).toBe(true);
      expect(isMainnet('bitcoin')).toBe(true);
      expect(isMainnet('arbitrum')).toBe(true);
      expect(isMainnet('solana')).toBe(true);
    });

    it('should return false for testnet chains', () => {
      expect(isMainnet('ethereum_sepolia')).toBe(false);
      expect(isMainnet('bitcoin_testnet')).toBe(false);
      expect(isMainnet('arbitrum_sepolia')).toBe(false);
    });
  });

  describe('getBlockchainType()', () => {
    it('should return correct blockchain type for EVM chains', () => {
      expect(getBlockchainType('ethereum')).toBe(BlockchainType.evm);
      expect(getBlockchainType('arbitrum')).toBe(BlockchainType.evm);
      expect(getBlockchainType('base')).toBe(BlockchainType.evm);
    });

    it('should return correct blockchain type for Bitcoin chains', () => {
      expect(getBlockchainType('bitcoin')).toBe(BlockchainType.bitcoin);
      expect(getBlockchainType('bitcoin_testnet')).toBe(BlockchainType.bitcoin);
    });

    it('should return correct blockchain type for Solana chains', () => {
      expect(getBlockchainType('solana')).toBe(BlockchainType.solana);
      expect(getBlockchainType('solana_testnet')).toBe(BlockchainType.solana);
    });

    it('should return correct blockchain type for Starknet chains', () => {
      expect(getBlockchainType('starknet')).toBe(BlockchainType.starknet);
      expect(getBlockchainType('starknet_sepolia')).toBe(BlockchainType.starknet);
    });

    it('should return correct blockchain type for Sui chains', () => {
      expect(getBlockchainType('sui')).toBe(BlockchainType.sui);
      expect(getBlockchainType('sui_testnet')).toBe(BlockchainType.sui);
    });
  });
});

describe('Blockchain Type Checkers', () => {
  describe('isEVM()', () => {
    it('should return true for EVM chains', () => {
      expect(isEVM('ethereum')).toBe(true);
      expect(isEVM('arbitrum')).toBe(true);
      expect(isEVM('base')).toBe(true);
      expect(isEVM('ethereum_sepolia')).toBe(true);
    });

    it('should return false for non-EVM chains', () => {
      expect(isEVM('bitcoin')).toBe(false);
      expect(isEVM('solana')).toBe(false);
      expect(isEVM('starknet')).toBe(false);
      expect(isEVM('sui')).toBe(false);
    });
  });

  describe('isBitcoin()', () => {
    it('should return true for Bitcoin chains', () => {
      expect(isBitcoin('bitcoin')).toBe(true);
      expect(isBitcoin('bitcoin_testnet')).toBe(true);
    });

    it('should return false for non-Bitcoin chains', () => {
      expect(isBitcoin('ethereum')).toBe(false);
      expect(isBitcoin('solana')).toBe(false);
      expect(isBitcoin('arbitrum')).toBe(false);
    });
  });

  describe('isSolana()', () => {
    it('should return true for Solana chains', () => {
      expect(isSolana('solana')).toBe(true);
      expect(isSolana('solana_testnet')).toBe(true);
    });

    it('should return false for non-Solana chains', () => {
      expect(isSolana('ethereum')).toBe(false);
      expect(isSolana('bitcoin')).toBe(false);
      expect(isSolana('arbitrum')).toBe(false);
    });
  });

  describe('isStarknet()', () => {
    it('should return true for Starknet chains', () => {
      expect(isStarknet('starknet')).toBe(true);
      expect(isStarknet('starknet_sepolia')).toBe(true);
    });

    it('should return false for non-Starknet chains', () => {
      expect(isStarknet('ethereum')).toBe(false);
      expect(isStarknet('bitcoin')).toBe(false);
      expect(isStarknet('solana')).toBe(false);
    });
  });

  describe('isSui()', () => {
    it('should return true for Sui chains', () => {
      expect(isSui('sui')).toBe(true);
      expect(isSui('sui_testnet')).toBe(true);
    });

    it('should return false for non-Sui chains', () => {
      expect(isSui('ethereum')).toBe(false);
      expect(isSui('bitcoin')).toBe(false);
      expect(isSui('solana')).toBe(false);
    });
  });
});

describe('Native Token Checkers', () => {
  describe('isEvmNativeToken()', () => {
    it('should return true for ETH on EVM chains', () => {
      expect(isEvmNativeToken('ethereum', 'eth')).toBe(true);
      expect(isEvmNativeToken('ethereum', 'ETH')).toBe(true);
      expect(isEvmNativeToken('arbitrum', 'eth')).toBe(true);
    });

    it('should return false for non-ETH tokens on EVM chains', () => {
      expect(isEvmNativeToken('ethereum', 'wbtc')).toBe(false);
      expect(isEvmNativeToken('ethereum', 'usdc')).toBe(false);
    });

    it('should return false for non-EVM chains', () => {
      expect(isEvmNativeToken('bitcoin', 'btc')).toBe(false);
      expect(isEvmNativeToken('solana', 'sol')).toBe(false);
    });
  });

  describe('isSolanaNativeToken()', () => {
    it('should return true for SOL on Solana chains', () => {
      expect(isSolanaNativeToken('solana', 'sol')).toBe(true);
      expect(isSolanaNativeToken('solana', 'SOL')).toBe(true);
      expect(isSolanaNativeToken('solana_testnet', 'sol')).toBe(true);
    });

    it('should return false for non-SOL tokens on Solana chains', () => {
      expect(isSolanaNativeToken('solana', 'usdc')).toBe(false);
      expect(isSolanaNativeToken('solana', 'cbbtc')).toBe(false);
    });

    it('should return false for non-Solana chains', () => {
      expect(isSolanaNativeToken('ethereum', 'sol')).toBe(false);
      expect(isSolanaNativeToken('bitcoin', 'sol')).toBe(false);
    });
  });

  describe('isSuiNativeToken()', () => {
    it('should return true for SUI on Sui chains', () => {
      expect(isSuiNativeToken('sui', 'sui')).toBe(true);
      expect(isSuiNativeToken('sui', 'SUI')).toBe(true);
      expect(isSuiNativeToken('sui_testnet', 'sui')).toBe(true);
    });

    it('should return false for non-SUI tokens on Sui chains', () => {
      expect(isSuiNativeToken('sui', 'wbtc')).toBe(false);
      expect(isSuiNativeToken('sui', 'usdc')).toBe(false);
    });

    it('should return false for non-Sui chains', () => {
      expect(isSuiNativeToken('ethereum', 'sui')).toBe(false);
      expect(isSuiNativeToken('bitcoin', 'sui')).toBe(false);
    });
  });

  describe('isNativeToken()', () => {
    it('should return true for ETH on EVM chains', () => {
      const ethAsset = ChainAsset.fromString('ethereum:eth');
      expect(isNativeToken(ethAsset)).toBe(true);
    });

    it('should return true for SOL on Solana chains', () => {
      const solAsset = ChainAsset.fromString('solana:sol');
      expect(isNativeToken(solAsset)).toBe(true);
    });

    it('should return true for SUI on Sui chains', () => {
      const suiAsset = ChainAsset.fromString('sui:sui');
      expect(isNativeToken(suiAsset)).toBe(true);
    });

    it('should return true for Bitcoin (all BTC is native)', () => {
      const btcAsset = ChainAsset.fromString('bitcoin:btc');
      expect(isNativeToken(btcAsset)).toBe(true);
    });

    it('should return false for ERC20 tokens on EVM chains', () => {
      const wbtcAsset = ChainAsset.fromString('ethereum:wbtc');
      expect(isNativeToken(wbtcAsset)).toBe(false);
    });

    it('should return false for SPL tokens on Solana', () => {
      const usdcAsset = ChainAsset.fromString('solana:usdc');
      expect(isNativeToken(usdcAsset)).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  it('should have consistent data between Config, Chains, and Assets', () => {
    Object.keys(Config).forEach((chain) => {
      expect(Chains[chain as keyof typeof Chains]).toBe(chain);
    });
  });

  it('should have assets matching their chain property', () => {
    Object.entries(Assets).forEach(([chainKey, chainAssets]) => {
      Object.values(chainAssets).forEach((asset) => {
        if (asset && typeof asset === 'object' && 'chain' in asset) {
          expect(asset.chain).toBe(chainKey);
        }
      });
    });
  });

  it('should have correct blockchain type for each chain in Config', () => {
    expect(Config.ethereum.type).toBe(BlockchainType.evm);
    expect(Config.bitcoin.type).toBe(BlockchainType.bitcoin);
    expect(Config.solana.type).toBe(BlockchainType.solana);
    expect(Config.starknet?.type).toBe(BlockchainType.starknet);
    expect(Config.sui?.type).toBe(BlockchainType.sui);
  });

  it('should correctly identify all mainnet chains', () => {
    const mainnetChains = ['ethereum', 'bitcoin', 'arbitrum', 'solana', 'base'];
    mainnetChains.forEach((chain) => {
      if (Config[chain as keyof typeof Config]) {
        expect(isMainnet(chain as any)).toBe(true);
      }
    });
  });

  it('should correctly identify all testnet chains', () => {
    const testnetChains = [
      'ethereum_sepolia',
      'bitcoin_testnet',
      'arbitrum_sepolia',
      'solana_testnet',
    ];
    testnetChains.forEach((chain) => {
      if (Config[chain as keyof typeof Config]) {
        expect(isMainnet(chain as any)).toBe(false);
      }
    });
  });
});
