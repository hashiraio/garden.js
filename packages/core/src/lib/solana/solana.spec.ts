/**
 * This testcase performs a SOL - SOL atomic swap between "User" and "Filler".
 * The "User" utilizes (thus tests) the @see SolanaRelay class, whereas
 * the "Filler" utilizes (thus tests) the @see SolanaHTLC class
 * The orderId is random as the on-chain program just accepts it
 * as-is during init() and doesn't care about its value,
 */
import { describe, expect, it } from 'vitest';

import * as crypto from 'crypto';
import * as anchor from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import { hex } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { SolanaRelay } from './relayer/solanaRelay';
import { SwapConfig } from './solanaTypes';
import { SolanaHTLC } from './htlc/solanaHTLC';
import { loadTestConfig } from '../../../../../test-config-loader';
import { ApiKey } from '@gardenfi/utils/dist/src/lib/auth';
import { Url } from '@gardenfi/utils';

const TEST_RPC_URL =
  'https://solana-devnet.g.alchemy.com/v2/FyJVAXC6zO6bCojXG19p-sCpQaXWexBi';
const TEST_RELAY_URL = new Url(
  'http://solana-relayer-staging.hashira.io/relay',
);
const config = loadTestConfig();
const PRIV = config.SOLANA_PRIV;

describe('Testing SolanaRelay and SolanaHTLC via a SOL - SOL atomic swap flow', () => {
  // Swap params
  const secret = crypto.randomBytes(32);
  const secretHash = hex.encode(
    crypto.createHash('sha256').update(secret).digest(),
  );
  const amount = BigInt(web3.LAMPORTS_PER_SOL * 1);
  const expiresIn = 100;

  // A deterministic value for relayer address
  // const relayer = web3.Keypair.fromSeed(new Uint8Array(32).fill(1)).publicKey; localnet

  // Random keypairs for user and filler
  // const user = new web3.Keypair();
  const filler = new web3.Keypair();

  // Solana RPC params
  const connection = new web3.Connection(TEST_RPC_URL, {
    commitment: 'confirmed',
  });
  // Refer https://solana.com/docs/programs/anchor/client-typescript to read more about Provider
  // Create a keypair from a private key array or buffer
  const privateKeyBytes = new Uint8Array(PRIV);
  const user = web3.Keypair.fromSecretKey(privateKeyBytes);
  const userProvider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(user),
  );
  const fillerProvider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(filler),
  );

  const randomSwapId = () => hex.encode(crypto.randomBytes(32));

  const userSwapConfig = new SwapConfig(
    randomSwapId(),
    filler.publicKey.toBase58(),
    secretHash,
    amount,
    expiresIn,
  );
  const userRelay = new SolanaRelay(
    userProvider,
    TEST_RELAY_URL,
    '8jiuEDT8T4Eqd38hiXRHJxRMvMkBWpEPVM3uuAn6bj93',
    {
      native: '8jiuEDT8T4Eqd38hiXRHJxRMvMkBWpEPVM3uuAn6bj93',
      spl: '8jiuEDT8T4Eqd38hiXRHJxRMvMkBWpEPVM3uuAn6bj93',
    },
    new ApiKey(config.API_KEY),
  );

  const fillerSwapConfig = new SwapConfig(
    randomSwapId(),
    user.publicKey.toBase58(),
    secretHash,
    amount,
    expiresIn,
  );
  const fillerHtlc = new SolanaHTLC(fillerProvider);

  // beforeAll(async () => {
  //     console.log("Airdropping 0.5 SOL to the user, relayer and filler for testing");
  //     const airdrop = async (pubkey: web3.PublicKey) => {
  //         const signature = await connection.requestAirdrop(pubkey, web3.LAMPORTS_PER_SOL * 0.5);
  //         await connection.confirmTransaction({ signature, ...(await connection.getLatestBlockhash()) });
  //         return signature;
  //     };
  //     await airdrop(user.publicKey);
  //     await airdrop(filler.publicKey);
  //     const sig = await airdrop(relayer);
  //     expect(sig).toBeDefined();
  //     console.log("Airdrop Success");
  // });

  it('Testing SOL - SOL atomic swap flow', async () => {
    console.log(
      `Ensure relayer is running at endpoint ${TEST_RELAY_URL.href} to avoid test timeout`,
    );
    console.log('User initiates via relayer...');
    const userInitSig = await userRelay.initiate(userSwapConfig);
    expect(userInitSig).toBeDefined();
    console.log('User successfully initiated with transaction:', userInitSig);

    // Simulating Filler initiate (using garden.js HTLC calls)
    console.log('Filler initiates via Htlc...');
    const fillerInitSig = await fillerHtlc.init();
    expect(fillerInitSig).toBeDefined();
    console.log(
      'Filler successfully initiated with transaction:',
      fillerInitSig,
    );

    console.log('User redeems via the relayer...');
    const userRedeemSig = await userRelay.redeem(hex.encode(secret));
    expect(userRedeemSig).toBeDefined();
    console.log('User successfully redeemed with transaction:', userRedeemSig);

    // Simulating Filler redeem (using garden.js HTLC calls)
    console.log('Filler redeems via Htlc...');
    const fillerRedeemSig = await fillerHtlc.redeem(hex.encode(secret));
    console.log(
      'Filler successfully redeemed with transaction:',
      fillerRedeemSig,
    );
    expect(fillerRedeemSig).toBeDefined();
  });
});
