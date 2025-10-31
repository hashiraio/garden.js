import { Connect, IInjectedBitcoinProvider } from 'src/bitcoin/bitcoin.types';
import { WALLET_CONFIG } from './../../constants';
import {
  AsyncResult,
  Err,
  executeWithTryCatch,
  Fetcher,
  Network,
  Ok,
  Url,
} from '@gardenfi/utils';
import {
  BalanceResponse,
  SendBitcoinRequest,
  SendBitcoinResponse,
  StandardWalletConfig,
} from './standard.types';

export class StandardProvider implements IInjectedBitcoinProvider {
  #config: StandardWalletConfig;
  public address = '';
  public id = WALLET_CONFIG.Standard.id;
  public name = WALLET_CONFIG.Standard.name;
  public icon = WALLET_CONFIG.Standard.icon;

  constructor(config: StandardWalletConfig) {
    this.#config = config;
    this.address = config.address;
  }

  async connect(): AsyncResult<Connect, string> {
    try {
      return Ok({
        address: this.#config.address,
        provider: this,
        network: this.#config.network,
        id: WALLET_CONFIG.Standard.id,
      });
    } catch (error) {
      return Err('Error while connecting to Standard wallet: ' + error);
    }
  }

  async requestAccounts() {
    return await executeWithTryCatch(async () => {
      return [this.#config.address];
    }, 'Error while requesting accounts from Standard wallet');
  }

  async getAccounts(): AsyncResult<string[], string> {
    return this.requestAccounts();
  }

  async getNetwork(): AsyncResult<Network, string> {
    return Ok(this.#config.network);
  }

  async switchNetwork(): AsyncResult<Network, string> {
    this.#config.network =
      this.#config.network === Network.MAINNET
        ? Network.TESTNET
        : Network.MAINNET;
    // Re-connect with the new network provider
    const connectResult = await this.connect();
    if (connectResult.error) {
      return Err(
        `Failed to connect to ${this.#config.network}: ${connectResult.error}`,
      );
    }
    return Ok(this.#config.network);
  }

  async getBalance(): AsyncResult<
    { confirmed: number; unconfirmed: number; total: number },
    string
  > {
    return await executeWithTryCatch(async () => {
      const response = await Fetcher.get<BalanceResponse>(
        new Url(this.#config.baseurl)
          .endpoint('v1/wallets')
          .endpoint(this.#config.id)
          .endpoint('balance'),
        {
          headers: {
            Authorization: `Bearer ${this.#config.tokens.access_token}`,
          },
        },
      );
      const confirmedBalance = parseInt(response.balance);
      const unconfirmedBalance = parseInt(response.unconfirmed_balance);
      return {
        confirmed: confirmedBalance,
        unconfirmed: unconfirmedBalance,
        total: confirmedBalance + unconfirmedBalance,
      };
    }, 'Error while getting balance from Standard wallet');
  }

  async sendBitcoin(
    toAddress: string,
    satoshis: number,
  ): AsyncResult<string, string> {
    return await executeWithTryCatch(async () => {
      const payload: SendBitcoinRequest = {
        chain_type: 'BITCOIN',
        type: 'Send',
        chain_id: this.#config.network,
        data: {
          reciever: toAddress,
          amount: satoshis.toString(),
        },
      };
      const response = await Fetcher.post<SendBitcoinResponse>(
        new Url(this.#config.baseurl)
          .endpoint('/v1/wallets')
          .endpoint(this.#config.id)
          .endpoint('rpc'),
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.#config.tokens.access_token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.success) {
        throw new Error('API Failed');
      }
      return response.tx_id;
    }, 'Error while sending bitcoin from Standard wallet');
  }

  on(): void {}

  off(): void {}

  disconnect = (): AsyncResult<string, string> => {
    return Promise.resolve(Ok('Disconnected Standard wallet'));
  };
}
