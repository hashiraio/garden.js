import { describe, expect, it } from 'vitest';
import { RouteValidator } from './routeValidator';
import { ChainAsset } from '../../chainAsset/chainAsset';

describe('RouteValidator', () => {
  const routeValidator = new RouteValidator(
    'https://api.garden.finance',
    '963ebcf89e26bd7d41c9adef039dd167584c371fb24f11f8adf1df0c7de3340f',
  );

  it('should be defined', async () => {
    const policy = await routeValidator.loadPolicy();
    console.log('policy :', policy.val);
    expect(policy.ok).toBe(true);
  });

  it('get valid destinations', async () => {
    const validDestinations = await routeValidator.getValidDestinations(
      ChainAsset.from('hypercore:USDC'),
      [
        ChainAsset.from('hyperliquid:USDC'),
        ChainAsset.from('ethereum:USDC'),
        ChainAsset.from('solana:USDC'),
        ChainAsset.from('base:USDC'),
      ],
    );
    console.log('validDestinations :', validDestinations);
    expect(validDestinations.length).toBe(1);
  });

  it('build route matrix', async () => {
    const routeMatrix = await routeValidator.buildRouteMatrix([
      ChainAsset.from('hypercore:USDC'),
      ChainAsset.from('hyperliquid:USDC'),
      ChainAsset.from('ethereum:USDC'),
      ChainAsset.from('solana:USDC'),
      ChainAsset.from('base:USDC'),
    ]);
    console.log('routeMatrix :', routeMatrix);
    expect(routeMatrix.length).toBe(1);
  });
});
