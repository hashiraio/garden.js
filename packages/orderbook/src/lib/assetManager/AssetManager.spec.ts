import { describe, it } from 'vitest';
import { AssetManager } from './AssetManager';

describe('AssetManager initialization', () => {
  const TEST_URL = 'https://testnet.api.garden.finance';
  const TEST_API_KEY =
    'f242ea49332293424c96c562a6ef575a819908c878134dcb4fce424dc84ec796';
  const assetManager = new AssetManager(TEST_URL, TEST_API_KEY);

  it('should initialize the asset manager', async () => {
    await assetManager.initialize();
    await assetManager.fetchAndSetAssetsAndChains();
    const allAssets = assetManager.allAssets;
    const allchains = assetManager.allChains;
    console.log('allAssets', allAssets);
    console.log('allchains', allchains);
  });
});
