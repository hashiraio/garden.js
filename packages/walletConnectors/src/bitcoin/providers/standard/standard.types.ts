import { Network } from '@gardenfi/utils';

export type StandardWalletConfig = {
  network: Network;
  address: string;
  id: string;
  baseurl: string;
  tokens: {
    access_token: string;
    refresh_token: string;
  };
};

export type BalanceResponse = {
  chain: string;
  chain_id: string;
  address: string;
  balance: string;
  unit: string;
  unconfirmed_balance: string;
};

export type SendBitcoinRequest = {
  chain_type: 'BITCOIN';
  type: 'Send';
  chain_id: Network;
  data: {
    reciever: string;
    amount: string;
  };
};

export type SendBitcoinResponse = {
  success: boolean;
  tx_id: string;
};
