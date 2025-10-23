import { describe, it } from 'vitest';
import { loadTestConfig } from '../../../../../../test-config-loader';
import { TronWeb } from 'tronweb';
import { TronRelay } from './tronRelay';
import { ApiKey, Network } from '@gardenfi/utils';

describe('Garden swap tests with Tron wallet', () => {
  const config = loadTestConfig();

  // Load TRON_PRIVATE_KEY from your config
  const TRON_PRIVATE_KEY = config.TRON_PRIVATE_KEY;
  if (!TRON_PRIVATE_KEY) {
    throw new Error('TRON_PRIVATE_KEY is not defined in the test config');
  }

  const tronWallet = new TronWeb({
    fullHost: 'https://api.shasta.trongrid.io',
  });

  const xyz = tronWallet.address.fromPrivateKey(TRON_PRIVATE_KEY);
  console.log(`
======= TRON Wallet Address =======
Tron Wallet Address: ${xyz}
==================================
  `);

  const tronRelay = new TronRelay(
    'https://testnet.api.hashira.io/tron',
    Network.TESTNET,
    new ApiKey(config.API_KEY),
    {
      fullHost: 'https://api.shasta.trongrid.io',
      privateKey: TRON_PRIVATE_KEY,
    },
  );

  // Optionally add a simple test
  it('should initialize TronRelay with a Tron wallet', () => {
    // setupEventListeners(garden);
    const htlcActorAddress = tronRelay.htlcActorAddress;
    console.log('HTLC Actor Address:', htlcActorAddress);
  });
});
