import { SecretManager } from './secretManager';
import { arbitrumSepolia, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { describe, expect, it } from 'vitest';
import { loadTestConfig } from '../../../../../test-config-loader';

describe('secret manager', () => {
  const config = loadTestConfig();
  const pk = config.EVM_PRIVATE_KEY;
  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log('account :', account.address);

  const walletClient = createWalletClient({
    account: account,
    chain: sepolia,
    transport: http(),
  });
  const walletClient2 = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(),
  });

  const secretManager = SecretManager.fromWalletClient(walletClient);
  const secretManager2 = SecretManager.fromWalletClient(walletClient2);

  it('should return master private key', async () => {
    const pk = await secretManager.getDigestKey();
    const pk2 = await secretManager2.getDigestKey();
    console.log('pk :', pk);
    console.log('pk :', pk2);
    expect(pk).toEqual(pk2);
    expect(pk).toBeTruthy();
  });

  it('should generate secret', async () => {
    const sign = await secretManager.generateSecret('hello');
    console.log('sign :', sign.val);
    expect(sign.val).toBeTruthy();
    expect(sign.error).toBeFalsy();
  });
});
