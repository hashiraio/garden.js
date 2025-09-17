/**
 * We'll be testing if the relayer is able to
 * 1. Initate a transaction
 * 2. Redeem a transaction
 */
import { beforeAll, describe, expect, it } from 'vitest';

import * as crypto from 'crypto';
import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import { hex } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { SwapConfig } from '../solanaTypes';
import { SolanaHTLC } from '../htlc/solanaHTLC';
import { loadTestConfig } from '../../../../../../test-config-loader';

// Load test configuration
const config = loadTestConfig();

// const TEST_RPC_URL = "https://solana-devnet.g.alchemy.com/v2/FyJVAXC6zO6bCojXG19p-sCpQaXWexBi";
const TEST_RPC_URL = config.TEST_RPC_URL;
// const TEST_RELAY_URL = new URL("https://solana-relayer-staging.hashira.io/relay");
// const TEST_RELAY_URL = new URL("http://10.67.23.157:5014/relay");
const PRIV = config.SOLANA_PRIV;

describe('========SOLANA HTLC TEST=========', () => {
  let userProvider: anchor.AnchorProvider;
  let connection: anchor.web3.Connection;
  let userHtlc: SolanaHTLC;
  let secretHash: string;

  beforeAll(async () => {
    // We'll be initializing our solana wallet which will be the userProvider
    const privateKeyBytes = new Uint8Array(PRIV);
    const user = web3.Keypair.fromSecretKey(privateKeyBytes);
    connection = new web3.Connection(TEST_RPC_URL, { commitment: 'finalized' });
    userProvider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(user),
    );

    const randomSwapId = () => hex.encode(crypto.randomBytes(32));
    const secret = crypto.randomBytes(32);
    secretHash = hex.encode(
      crypto.createHash('sha256').update(secret).digest(),
    );
    const amount = BigInt(web3.LAMPORTS_PER_SOL * 0.00001);
    const expiresIn = 100;

    const userSwapConfig = new SwapConfig(
      randomSwapId(),
      'Cw2NgGzGfdhPvWyTHitxZmgB4sRUJCXr8cUfdFNMheTN',
      secretHash,
      amount,
      expiresIn,
    ); //the string is filler public key

    userHtlc = new SolanaHTLC(userSwapConfig, userProvider); //on chanin address of relayer
  });
  it('HTLC should initiate the provided transaction and return the transaction hex', async () => {
    console.log('User initiates via relayer...');
    const userInitSig = await userHtlc.init();
    expect(userInitSig).toBeDefined();
    console.log('User successfully initiated with transaction:', userInitSig);
  }, 120000);

  it('HTLC should redeem the funds as per the secret hash provided', async () => {
    console.log('Redeeming the transaction');
    const res = await userHtlc.redeem(secretHash);
    expect(res).toBeDefined();
    console.log('Relayer redeemed successfully!');
  });
});
