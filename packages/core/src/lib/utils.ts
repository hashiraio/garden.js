import {
  APIResponse,
  AsyncResult,
  Environment,
  Err,
  Fetcher,
  Ok,
  trim0x,
  Url,
  with0x,
  Network,
  IAuth,
} from '@gardenfi/utils';
import {
  AffiliateFee,
  AssetHTLCInfo,
  BlockchainType,
  Chain,
  Order,
} from '@gardenfi/orderbook';
import { sha256 } from 'viem';
import * as varuint from 'varuint-bitcoin';
import * as secp256k1 from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { Signature } from 'starknet';
import { API, Api, DEFAULT_AFFILIATE_ASSET } from './constants';
import { ApiConfig, GardenHTLCModules } from './garden/garden.types';
import { BitcoinNetwork } from './bitcoin/provider/provider.interface';
import { IBaseWallet } from './bitcoin/wallet/baseWallet';
import { web3 } from '@coral-xyz/anchor';
import { BigNumber } from 'bignumber.js';

export function resolveApiConfig(env: ApiConfig): {
  api: Api;
  network: Network;
} {
  const network = typeof env === 'string' ? env : env.network;

  const baseApi =
    network === Network.MAINNET
      ? API.mainnet
      : Network.TESTNET
      ? API.testnet
      : API.localnet;

  const api: Api =
    typeof env === 'string'
      ? baseApi
      : {
          ...baseApi,
          ...env,
        };

  return { api, network };
}

export const computeSecret = async (
  fromChain: Chain,
  toChain: Chain,
  wallets: Partial<Record<Chain, IBaseWallet>>,
  nonce: number,
) => {
  const initiatorWallet = wallets[fromChain as Chain];
  const followerWallet = wallets[toChain as Chain];
  if (!followerWallet) throw new Error(`No ${fromChain} wallet found`);
  if (!initiatorWallet) throw new Error(`No ${toChain} wallet found`);

  let sig = undefined;
  if (isFromChainBitcoin(fromChain)) {
    const msg = sha256(
      with0x(
        Buffer.from(
          'catalog.js' + nonce + (await followerWallet.getAddress()),
        ).toString('hex'),
      ),
    ).slice(2);
    sig = await initiatorWallet.sign(msg);
  } else {
    const msg = sha256(
      with0x(
        Buffer.from(
          'catalog.js' + nonce + (await initiatorWallet.getAddress()),
        ).toString('hex'),
      ),
    ).slice(2);
    sig = await followerWallet.sign(msg);
  }

  return trim0x(sha256(with0x(sig)));
};

export const isFromChainBitcoin = (chain: Chain) => {
  return (
    chain === 'bitcoin' ||
    chain === 'bitcoin_testnet' ||
    chain === 'bitcoin_regtest'
  );
};

/**
 * Given a hex string or a buffer, return the x-only pubkey. (removes y coordinate the prefix)
 */
export function xOnlyPubkey(pubkey: Buffer | string): Buffer {
  if (typeof pubkey === 'string') pubkey = Buffer.from(pubkey, 'hex');
  return pubkey.length === 32 ? pubkey : pubkey.subarray(1, 33);
}

export function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

/**
 * concat the leaf version, the length of the script, and the script itself
 */
export function serializeScript(leafScript: Buffer) {
  return Buffer.concat([
    Uint8Array.from([0xc0]),
    prefixScriptLength(leafScript),
  ]);
}

/**
 * concat the length of the script and the script itself
 */
export function prefixScriptLength(s: Buffer): Buffer {
  const varintLen = varuint.encodingLength(s.length);
  const buffer = Buffer.allocUnsafe(varintLen);
  varuint.encode(s.length, buffer);
  return Buffer.concat([buffer, s]);
}

export function sortLeaves(leaf1: Buffer, leaf2: Buffer) {
  if (leaf1.compare(leaf2) > 0) {
    const temp = leaf1;
    leaf1 = leaf2;
    leaf2 = temp;
  }
  return [leaf1, leaf2];
}

export const toXOnly = (pubKey: string) =>
  pubKey.length === 64 ? pubKey : pubKey.slice(2);

export const isValidBitcoinPubKey = (pubKey: string): boolean => {
  if (!pubKey) return false;

  try {
    const pubKeyBuffer = Buffer.from(pubKey, 'hex');
    return secp256k1.isPoint(pubKeyBuffer);
  } catch {
    return false;
  }
};

export const constructOrderPair = (
  sourceChain: Chain,
  sourceAsset: string,
  destChain: Chain,
  destAsset: string,
) =>
  sourceChain +
  ':' +
  sourceAsset.toLowerCase() +
  '::' +
  destChain +
  ':' +
  destAsset.toLowerCase();

export function validateBTCAddress(address: string, networkType: Environment) {
  if (!address) return false;
  const network =
    networkType === Environment.MAINNET
      ? bitcoin.networks.bitcoin
      : networkType === Environment.TESTNET
      ? bitcoin.networks.testnet
      : bitcoin.networks.regtest;

  if (!network) return false;
  bitcoin.initEccLib(ecc);
  try {
    bitcoin.address.toOutputScript(address, network);
    return true;
  } catch {
    // console.error(e);
    return false;
  }
}

export function generateOutputs(output: Buffer, count: number): Buffer[] {
  const outputs: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    outputs.push(output);
  }
  return outputs;
}

export const getBitcoinNetworkFromEnvironment = (
  network: Network,
): BitcoinNetwork => {
  switch (network) {
    case Network.MAINNET:
      return BitcoinNetwork.Mainnet;
    case Network.TESTNET:
      return BitcoinNetwork.Testnet;
    case Network.LOCALNET:
      return BitcoinNetwork.Regtest;
    default:
      throw new Error(`Invalid bitcoin network ${network}`);
  }
};

export const getBitcoinNetworkFromNetwork = (network: Network) => {
  switch (network) {
    case Network.MAINNET:
      return bitcoin.networks.bitcoin;
    case Network.TESTNET:
      return bitcoin.networks.testnet;
    case Network.LOCALNET:
      return bitcoin.networks.regtest;
    default:
      throw new Error(`Invalid bitcoin network ${network}`);
  }
};

export const isHexString = (value: string): boolean => {
  const hex = value.toLowerCase().replace('0x', '');
  return /^[0-9a-f]+$/.test(hex);
};

export const formatStarknetSignature = (sig: Signature) => {
  // Handle object format
  if (typeof sig === 'object' && 'r' in sig && 's' in sig) {
    return Ok([sig.r.toString(), sig.s.toString()]);
  }

  // Handle array format
  if (Array.isArray(sig)) {
    const result = sig.map((value) => {
      if (typeof value === 'string' && value.startsWith('0x')) {
        if (isHexString(value)) {
          return BigInt(value).toString();
        }
      }
      return value;
    });
    return Ok(result);
  }

  return Err('Invalid signature format');
};

export function reversify(val: string): Buffer {
  return Buffer.from(val, 'hex').reverse();
}

export function isErrorWithMessage(err: unknown): err is { message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as any).message === 'string'
  );
}

export const waitForSolanaTxConfirmation = async (
  connection: web3.Connection,
  txHash: string,
): Promise<boolean> => {
  const startTime = Date.now();
  const MAX_DURATION = 30_000;
  const RETRY_INTERVAL = 2_000;

  while (Date.now() - startTime < MAX_DURATION) {
    const latestBlockhash = await connection.getLatestBlockhash();

    const confirmation = await connection.confirmTransaction(
      {
        signature: txHash,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      'confirmed',
    );

    if (confirmation.value && confirmation.value.err == null) {
      console.log('Tx Confirmed ✅', txHash);
      return true;
    }

    console.log('Tx not confirmed yet. Retrying in 2 seconds...');
    await new Promise((res) => setTimeout(res, RETRY_INTERVAL));
  }

  return false;
};

export const getAssetInfoFromOrder = async (
  order: string,
  url: Url,
): Promise<
  AsyncResult<{ htlcAddress: string; tokenAddress: string }, string>
> => {
  const assetInfoRes = await Fetcher.get<APIResponse<AssetHTLCInfo[]>>(
    url + '/v2/assets',
  );

  if (assetInfoRes.error) {
    return Err('Failed to fetch asset info: ' + assetInfoRes.error);
  }

  const assetList = assetInfoRes.result || [];
  const assetInfo = assetList.find((a) => a.id === order);

  if (!assetInfo) {
    return Err(`Asset info not found for asset id: ${order}`);
  }

  const htlcAddress = assetInfo.htlc?.address || '';
  const tokenAddress = assetInfo.token?.address || '';

  return Ok({ htlcAddress, tokenAddress });
};

export const validateAmount = (amount: string) => {
  if (amount == null || amount.includes('.'))
    return Err('Invalid amount ', amount);
  const amountBigInt = new BigNumber(amount);
  if (
    !amountBigInt.isInteger() ||
    amountBigInt.isNaN() ||
    amountBigInt.lt(0) ||
    amountBigInt.isLessThanOrEqualTo(0)
  )
    return Err('Invalid amount ', amount);
  return Ok(amountBigInt);
};

export const withDefaultAffiliateFees = (
  list: AffiliateFee[] | undefined,
): AffiliateFee[] => {
  return (list ?? []).map((fee) => ({
    fee: fee.fee,
    address: fee.address,
    asset: fee.asset ?? DEFAULT_AFFILIATE_ASSET.asset,
  }));
};

/**
 *
 * @param blockchainType
 * @param htlcs
 * @returns
 */
export const getAddresses = async (
  blockchainType: BlockchainType,
  htlcs: GardenHTLCModules,
) => {
  switch (blockchainType) {
    case BlockchainType.evm:
      if (!htlcs.evm)
        return Err(
          'Please provide evmHTLC when initializing garden or pass EVM address in SwapParams',
        );
      return Ok(htlcs.evm.htlcActorAddress);
    case BlockchainType.bitcoin: {
      const pubKey = htlcs.bitcoin?.getPublicKey;
      if (!pubKey || !isValidBitcoinPubKey(pubKey))
        return Err(
          'Invalid btc public key or pass Bitcoin address in SwapParams',
        );
      return Ok(toXOnly(pubKey));
    }
    case BlockchainType.solana: {
      if (!htlcs.solana)
        return Err(
          'Please provide solanaHTLC when initializing garden or pass Solana address in SwapParams',
        );
      return Ok(htlcs.solana.htlcActorAddress);
    }
    case BlockchainType.starknet: {
      if (!htlcs.starknet)
        return Err(
          'Please provide starknetHTLC when initializing garden or pass Starknet address in SwapParams',
        );
      return Ok(htlcs.starknet.htlcActorAddress);
    }
    case BlockchainType.sui: {
      if (!htlcs.sui)
        return Err(
          'Please provide suiHTLC when initializing garden or pass Sui address in SwapParams',
        );
      return Ok(htlcs.sui.htlcActorAddress);
    }
    case BlockchainType.tron: {
      if (!htlcs.tron)
        return Err(
          'Please provide tronHTLC when initializing garden or pass Tron address in SwapParams',
        );
      return Ok(htlcs.tron.htlcActorAddress);
    }
    default:
      return Err('Unsupported chain');
  }
};

/**
 * Validates that HTLCs are available for the required blockchain types for swap initiation
 * @param blockchainType The blockchain type to check
 * @returns AsyncResult<void, string>
 */
export const validateHTLCForSwap = async (
  blockchainType: BlockchainType,
  htlcs: GardenHTLCModules,
): Promise<AsyncResult<void, string>> => {
  const htlcMap: Record<BlockchainType, { htlc: any; name: string }> = {
    [BlockchainType.evm]: { htlc: htlcs.evm, name: 'EVM' },
    [BlockchainType.solana]: { htlc: htlcs.solana, name: 'Solana' },
    [BlockchainType.starknet]: {
      htlc: htlcs.starknet,
      name: 'Starknet',
    },
    [BlockchainType.sui]: { htlc: htlcs.sui, name: 'Sui' },
    [BlockchainType.bitcoin]: { htlc: htlcs.bitcoin, name: 'Bitcoin' },
    [BlockchainType.tron]: { htlc: htlcs.tron, name: 'Tron' },
  };

  if (blockchainType === BlockchainType.bitcoin) {
    return Ok(undefined);
  }

  const entry = htlcMap[blockchainType];
  if (!entry) {
    return Err(
      `Unsupported blockchain type for swap initiation: ${blockchainType}`,
    );
  }
  if (!entry.htlc) {
    return Err(
      `${
        entry.name
      } HTLC is required for swap initiation. Please provide ${entry.name.toLowerCase()}HTLC when initializing garden.`,
    );
  }
  return Ok(undefined);
};

export async function redeemOrderThroughRelayer(
  order: Order,
  secret: string,
  auth: IAuth,
  url: Url,
): Promise<AsyncResult<string, string>> {
  try {
    const headers = await auth.getAuthHeaders();
    if (!headers.ok) return Err(headers.error);

    const res = await Fetcher.patch<APIResponse<string>>(
      url
        .endpoint('/v2/orders')
        .endpoint(order.order_id)
        .addSearchParams({ action: 'redeem' }),
      {
        body: JSON.stringify({
          secret: trim0x(secret),
        }),
        headers: {
          ...headers.val,
          'Content-Type': 'application/json',
        },
        retryCount: 10,
        retryDelay: 2000,
      },
    );

    if (res.error) return Err(res.error);
    return res.result ? Ok(res.result) : Err('Redeem: No result found');
  } catch (error) {
    return Err(String(error));
  }
}
