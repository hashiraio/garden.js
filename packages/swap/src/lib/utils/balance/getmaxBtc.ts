import * as bitcoin from 'bitcoinjs-lib';
import { AsyncResult, Err, Network, Ok, Result } from '@gardenfi/utils';

// Types for network and address types
type AddressType = 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr' | 'unknown';

// Transaction size estimates (in virtual bytes) for different address types
const TX_SIZE_ESTIMATES = {
  // Input sizes (virtual bytes)
  inputs: {
    p2pkh: 148, // Legacy input
    p2sh: 91, // P2SH-wrapped SegWit (estimated)
    p2wpkh: 68, // Native SegWit v0
    p2wsh: 104.5, // Native SegWit v0 multisig
    p2tr: 57.5, // Taproot (key path spend)
  },
  // Output sizes (virtual bytes)
  outputs: {
    p2pkh: 34,
    p2sh: 32,
    p2wpkh: 31,
    p2wsh: 43,
    p2tr: 43,
  },
  // Base transaction overhead
  base: 10.5, // version (4) + input count (1) + output count (1) + locktime (4) + 0.5 for witness overhead
};

const networks = [
  { name: 'mainnet' as Network, config: bitcoin.networks.bitcoin },
  { name: 'testnet' as Network, config: bitcoin.networks.testnet },
];

const detectAddressInfo = (
  address: string,
): Result<
  {
    type: AddressType;
    network: Network;
  },
  string
> => {
  // Try Bech32 first (SegWit v0/v1: bc1 / tb1)
  if (address.startsWith('bc1') || address.startsWith('tb1')) {
    try {
      const decodedAddress = bitcoin.address.fromBech32(address);
      const network = address.startsWith('bc1')
        ? Network.MAINNET
        : Network.TESTNET;

      if (decodedAddress.version === 0) {
        if (decodedAddress.data.length === 20)
          return Ok({ type: 'p2wpkh', network });
        if (decodedAddress.data.length === 32)
          return Ok({ type: 'p2wsh', network });
      } else if (
        decodedAddress.version === 1 &&
        decodedAddress.data.length === 32
      ) {
        return Ok({ type: 'p2tr', network });
      }

      return Err('Invalid Bech32 structure or unsupported SegWit version/data');
    } catch (e) {
      return Err(`Invalid Bech32 address: ${e}`);
    }
  }

  // Try Base58 (Legacy + P2SH)
  for (const net of networks) {
    try {
      const decoded = bitcoin.address.fromBase58Check(address);

      if (decoded.version === net.config.pubKeyHash) {
        return Ok({ type: 'p2pkh', network: net.name });
      }

      if (decoded.version === net.config.scriptHash) {
        return Ok({ type: 'p2sh', network: net.name });
      }
    } catch (e) {
      // Continue to try next network
      console.warn(`Invalid Base58 address for ${net.name}: ${e}`);
    }
  }

  return Err('Unsupported or invalid Bitcoin address format');
};

/**
 * Estimates transaction size for spending all UTXOs
 */
function estimateTransactionSize(
  addressType: AddressType,
  utxoCount: number = 3, // Conservative estimate - assume 3 UTXOs on average
): number {
  const inputSize =
    TX_SIZE_ESTIMATES.inputs[
      addressType as keyof typeof TX_SIZE_ESTIMATES.inputs
    ] ?? TX_SIZE_ESTIMATES.inputs.p2pkh;

  const outputSize =
    TX_SIZE_ESTIMATES.outputs.p2tr +
    (TX_SIZE_ESTIMATES.outputs[
      addressType as keyof typeof TX_SIZE_ESTIMATES.outputs
    ] ?? TX_SIZE_ESTIMATES.outputs.p2wpkh);

  const totalSize = TX_SIZE_ESTIMATES.base + inputSize * utxoCount + outputSize;

  return Math.ceil(totalSize);
}

export const getSpendableBalance = async (
  address: string,
  balance: number,
  utxosLen: number,
  feeRate: number,
): AsyncResult<number, string> => {
  const addressInfo = detectAddressInfo(address);
  if (!addressInfo.ok) return Err(addressInfo.error);

  // Estimate transaction size
  const estimatedTxSize = estimateTransactionSize(
    addressInfo.val.type,
    utxosLen,
  );

  // Calculate total fee
  const estimatedFee = Math.ceil(estimatedTxSize * feeRate);

  // Calculate spendable balance
  const spendableBalance = Math.max(0, balance - estimatedFee);

  if (spendableBalance == 0) {
    return Err('Insufficient balance to cover transaction fee');
  }

  return Ok(spendableBalance);
};
