import { Fetcher, Network } from '@gardenfi/utils';
import {
  BitcoinNetwork,
  BitcoinTx,
  BitcoinTxType,
  BitcoinUTXO,
  FeeRates,
  IBitcoinProvider,
  Urgency,
  UrgencyToFeeRateKey,
} from './provider.interface';
import { getAPIs, verifyAPIs } from '../API';
import { BWErrors } from '../errors';
import { getBitcoinNetworkFromEnvironment } from '../../utils';

type Vout = {
  vout: { scriptpubkey_address: string }[];
};

const sortByConfirmed = (utxos: BitcoinUTXO[]) => {
  return utxos.sort((a, b) => {
    if (a.status.confirmed != b.status.confirmed) {
      return a.status.confirmed ? -1 : 1;
    } else {
      return b.value - a.value;
    }
  });
};

export class BitcoinProvider implements IBitcoinProvider {
  private readonly network: BitcoinNetwork;
  private readonly APIs: string[];

  private cacheTimeout = 2000;
  private readonly utxosCache = new Map<
    string,
    {
      timestamp: number;
      utxos: BitcoinUTXO[];
    }
  >();

  constructor(network: Network, API?: string) {
    this.APIs = API ? verifyAPIs([API]) : getAPIs(network);
    this.network = getBitcoinNetworkFromEnvironment(network);
  }

  /**
   * Gets the output index of the UTXO
   *
   * @param {string} txId - Transaction ID
   * @param {string} address - Address of the UTXO
   *
   * @returns {Promise<number>} Output index
   *
   * @throws If the UTXO is not found
   */
  async getTxIndex(txId: string, address: string): Promise<number> {
    const apis = this.APIs.map((API) => `${API}/tx/${txId}`);
    const { vout } = await Fetcher.getWithFallback<Vout>(apis);
    for (let i = 0; i < vout.length; i++) {
      if (vout[i].scriptpubkey_address === address) {
        return i;
      }
    }
    throw new Error('failed to get tx index');
  }

  /**
   * Broadcasts the transaction. Retries upto 5 times.
   *
   * @param {string} tx - Hex representation of the transaction
   * @returns {Promise<string>} Transaction ID
   *
   * @throws If the it fails to broadcast
   */
  async broadcast(tx: string): Promise<string> {
    if (!/^[0-9a-fA-F]+$/.test(tx)) {
      throw new Error('invalid tx hex');
    }
    //retry 5 times
    for (let i = 0; i < 5; i++) {
      try {
        return Fetcher.postWithFallback<string>(
          this.APIs.map((API) => `${API}/tx`),
          {
            body: tx,
          },
        );
      } catch (error) {
        if (i === 4) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    throw new Error('failed to broadcast tx');
  }

  /**
   * Gets the balance of an address
   *
   * @param {string} address - Bitcoin address
   * @returns {Promise<number>} The balance in satoshies
   */
  async getBalance(address: string): Promise<number> {
    return (await this.getUTXOs(address)).reduce(
      (acc, tx) => acc + tx.value,
      0,
    );
  }

  /**
   * Sets the timeout for the cache
   *
   * After the timeout, the cache will be invalidated and the next call will not use the cache
   * @param timeout - Time in milliseconds
   */
  setTimeoutForCache(timeout: number) {
    this.cacheTimeout = timeout;
  }

  /**
   * Returns all UTXOs that can be unlocked by the given address. If the balance field is provided
   * then the returned UTXOs are sorted in descending order.
   *
   * @param {string} address - Bitcoin address
   * @param {number} [balance] - The upper cap for the summation of the returned UTXOs.
   */
  async getUTXOs(
    address: string,
    balance?: number | undefined,
  ): Promise<BitcoinUTXO[]> {
    const cached = this.utxosCache.get(address);
    // is it more than 10 seconds old?
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return parseUtxos(cached.utxos, balance);
    }

    const txs = await Fetcher.getWithFallback<BitcoinUTXO[]>(
      this.APIs.map((API) => `${API}/address/${address}/utxo`),
      {
        signal: AbortSignal.timeout(5000),
      },
    );

    this.utxosCache.set(address, {
      timestamp: Date.now(),
      utxos: txs,
    });

    return parseUtxos(txs, balance);
  }

  /**
   * Transaction Hex for the given transaction ID
   *
   * @param {string} txId - Transaction ID
   * @returns {Promise<string>} Transaction Hex
   */
  async getTransactionHex(txId: string): Promise<string> {
    return Fetcher.getWithFallback<string>(
      this.APIs.map((API) => `${API}/tx/${txId}/hex`),
    );
  }

  /**
   * Transaction for the given transaction ID
   *
   * @param {string} txId - Transaction ID
   * @returns {Promise<BitcoinTx>}
   */
  async getTransaction(txId: string): Promise<BitcoinTx> {
    return Fetcher.getWithFallback<BitcoinTx>(
      this.APIs.map((API) => `${API}/tx/${txId}`),
    );
  }

  /**
   * Confirmations for the given transaction ID
   *
   * @param {string} txHash - Transaction ID
   * @returns {Promise<number>} The number of confirmation
   */
  async getConfirmations(txHash: string): Promise<number> {
    const tx = await this.getTransaction(txHash);
    if (!tx.status.confirmed || !tx.status.block_height) return 0;
    const currentHeight = await this.getLatestTip();
    return currentHeight - tx.status.block_height + 1;
  }

  /**
   * Get fee rates
   *
   * @returns {Promise<FeeRates>}
   */
  async getFeeRates(): Promise<FeeRates> {
    if (this.network === BitcoinNetwork.Regtest) {
      return {
        fastestFee: 8,
        halfHourFee: 7,
        hourFee: 6,
        economyFee: 4,
        minimumFee: 2,
      };
    }

    let mempoolNetwork = '';
    if (this.network === BitcoinNetwork.Testnet) {
      mempoolNetwork = 'testnet4/';
    }
    const url = `https://mempool.space/${mempoolNetwork}api/v1/fees/recommended`;
    const fallbackUrl = `https://blockstream.info/${mempoolNetwork}api/fee-estimates`;
    const response = await Fetcher.getWithFallback<any>([url, fallbackUrl], {
      signal: AbortSignal.timeout(5000),
    });
    // check if the response is from mempool.space
    if ('fastestFee' in response) {
      if (response.fastestFee === 1) {
        // sometimes, mempool.space returns 1 satoshi as the fastest fee
        return {
          fastestFee: 2,
          halfHourFee: 2,
          hourFee: 2,
          economyFee: 2,
          minimumFee: 2,
        };
      }
      return response;
    }
    // mempool failed, but blockstream succeeded
    return {
      fastestFee: response[1],
      halfHourFee: response[5],
      hourFee: response[10],
      economyFee: response[20],
      minimumFee: response[25],
    };
  }

  /**
   * Transactions for the given address and type. Limits to the latest 50 transactions.
   *
   * @param {string} address - Bitcoin address
   * @param {BitcoinTxType} type - Transaction type
   *
   * @returns {Promise<BitcoinTx[]>}
   */
  async getTransactions(
    address: string,
    type: BitcoinTxType,
  ): Promise<BitcoinTx[]> {
    const txs = await Fetcher.getWithFallback<BitcoinTx[]>(
      this.APIs.map((API) => `${API}/address/${address}/txs`),
    );

    if (type === BitcoinTxType.ALL) {
      return txs;
    } else if (type === BitcoinTxType.IN) {
      return txs.filter((tx: BitcoinTx) =>
        tx.vout.find((v) => v.scriptpubkey_address === address),
      );
    } else if (type === BitcoinTxType.OUT) {
      return txs.filter((tx: BitcoinTx) =>
        tx.vin.find((v) => v.prevout.scriptpubkey_address === address),
      );
    }
    throw new Error('failed to get transactions: invalid bitcoin tx type');
  }

  /**
   * Returns the network of the provider
   *
   * @returns {BitcoinNetwork}
   */
  getNetwork(): BitcoinNetwork {
    return this.network;
  }

  /**
   * Returns the latest block height
   *
   * @returns {Promise<number>} Block height
   */
  async getLatestTip(): Promise<number> {
    return Fetcher.getWithFallback<number>(
      this.APIs.map((API) => `${API}/blocks/tip/height`),
    );
  }

  /**
   * Suggests fee for sending a transaction with a given amount. Must only be used for segwit inputs and outputs
   *
   *
   * only for segwit inputs and outputs
   * @param {string} account - Bitcoin address
   * @param {number} amount - in satoshis
   * @param {Urgency} urgency - urgency of the transaction
   *
   * @returns {Promise<number>} Recommended Fee
   */
  async suggestFee(
    account: string,
    amount: number,
    urgency: Urgency,
  ): Promise<number> {
    const utxos = await this.getUTXOs(account, amount);
    const noOfInputs = utxos.length;
    const noOfOuputs = 2;
    const feeRates = await this.getFeeRates();
    const feeRate = Math.floor(feeRates[UrgencyToFeeRateKey[urgency]] * 1.05);
    return feeRate * (noOfInputs * 70 + noOfOuputs * 31 + 10);
  }

  /**
   * Returns the timestamps when a list of unconfirmed transactions was initially observed in the mempool.
   * If a transaction is not found in the mempool or has been mined, the timestamp will be 0.
   * @param txIds
   * @returns List of time stamps in milliseconds
   */
  async getTransactionTimes(txIds: string[]): Promise<number[]> {
    const queryString = txIds.map((id) => `txId[]=${id}`).join('&');

    const times = await Fetcher.getWithFallback<number[]>(
      this.APIs.map((API) => `${API}/v1/transaction-times?${queryString}`),
    );

    return times.map((time) => time * 1000);
  }
}

/**
 * Given txs and balance, returns the UTXOs that can be used to spend the balance.
 *
 * If balance is not provided, then all the UTXOs are returned.
 *
 */
const parseUtxos = (txs: BitcoinUTXO[], balance?: number) => {
  if (Array.isArray(txs)) {
    if (balance) {
      const total = txs.reduce((acc, tx) => acc + tx.value, 0);
      if (total < balance) {
        throw new Error(BWErrors.INSUFFICIENT_FUNDS(total, balance));
      }
      let sum = BigInt(0);
      txs.sort((a, b) => b.value - a.value);
      const txsToReturn: BitcoinUTXO[] = [];
      for (const tx of txs) {
        sum += BigInt(tx.value);
        txsToReturn.push(tx);
        if (sum >= balance) {
          break;
        }
      }

      return sortByConfirmed(txsToReturn);
    }

    return sortByConfirmed(txs);
  }
  return [];
};
