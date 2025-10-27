import { describe, expect, it } from 'vitest';
import { ChainAsset } from './chainAsset';
import { SupportedAssets } from '../constants';

describe('ChainAsset', () => {
  it('should create a chain asset from a chain and symbol', () => {
    const chainAsset = ChainAsset.fromChainAndSymbol('ethereum', 'eth');
    console.log('chainAsset :', chainAsset);
    expect(chainAsset.toString()).toBe('ethereum:eth');
  });

  it('should create a chain asset from a formatted string', () => {
    const chainAsset = ChainAsset.fromString('ethereum:eth');
    console.log('chainAsset :', chainAsset);
    expect(chainAsset.toString()).toBe('ethereum:eth');
  });

  it('should create a chain asset from an asset', () => {
    const chainAsset = ChainAsset.fromAsset(
      SupportedAssets.testnet.base_sepolia.WBTC,
    );
    console.log('chainAsset :', chainAsset);
    expect(chainAsset.toString()).toBe('base_sepolia:wbtc');
  });
});
