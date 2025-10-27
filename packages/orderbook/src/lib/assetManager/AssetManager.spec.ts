import { describe, it } from 'vitest';
import { AssetManager } from './AssetManager';

describe('AssetManager initialization', () => {
  const TEST_URL = 'https://api.garden.finance';
  const TEST_API_KEY =
    '963ebcf89e26bd7d41c9adef039dd167584c371fb24f11f8adf1df0c7de3340f';
  const assetManager = new AssetManager(TEST_URL, TEST_API_KEY);

  it('should initialize the asset manager', async () => {
    await assetManager.initialize();
    const allchains = assetManager.chains;
    const allAssets = assetManager.assets;
    console.log('allchains', allchains);
    console.log('allAssets', Object.keys(allAssets!).length);
  });
});
