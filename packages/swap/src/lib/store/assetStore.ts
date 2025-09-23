import { create } from 'zustand';
import {
  ChainsApiResponse,
  ChainInfo,
  AssetFromResponse,
  ParsedChainInfo,
  ParsedAsset,
} from '../types/types';
import {
  Asset,
  Chain,
  ChainAsset,
  EVMChains,
  // isBitcoin,
  isEVM,
  isEvmNativeToken,
  isSolana,
  isSolanaNativeToken,
  isStarknet,
  isSui,
} from '@gardenfi/orderbook';
import { getApiEndpoint, IOType } from '../constants/constants';
import { Network } from '@gardenfi/utils';
import { getAllWorkingRPCs } from '../utils/balance/rpcUtils';
import { getBalanceMulticall } from '../utils/balance/getBalanceMulticall';
import { Hex } from 'viem';
import { SupportedChains } from '../constants/wagmiConfig';
import { getLegacyGasEstimate } from '../utils/balance/getNativeTokenFee';
import BigNumber from 'bignumber.js';
import {
  getStarknetTokenBalance,
  getSolanaTokenBalance,
  getSuiTokenBalance,
} from '../utils/balance/getTokenBalance';
// import { BitcoinProvider } from '@gardenfi/core';
// import { getSpendableBalance } from '../utils/balance/getmaxBtc';

type AssetStoreState = {
  filter: string;
  chains: ParsedChainInfo[];
  allAssets: ParsedAsset[];
  isLoading: boolean;
  error: string | null;
  currentNetwork: Network;
  openAssetModal: () => void;
  closeAssetModal: () => void;
  modalOpenFor: IOType | null;
  isAssetModalOpen: boolean;
  balances: Record<string, BigNumber | undefined>;
  workingRPCs: Record<number, string[]>;
  openModal: (side: IOType) => void;
  closeModal: () => void;
  setFilter: (filter: string) => void;
  fetchAssets: (network?: Network) => Promise<void>;
  fetchAndSetRPCs: () => Promise<void>;
  setCurrentNetwork: (network: Network) => void;
  fetchAndSetEvmBalances: (
    address: string,
    fetchOnlyAsset?: Asset,
  ) => Promise<void>;
  fetchAndSetStarknetBalance: (address: string) => Promise<void>;
  fetchAndSetSolanaBalance: (address: string) => Promise<void>;
  fetchAndSetSuiBalance: (address: string) => Promise<void>;
};

// Helper function to parse chain info
const parseChainInfo = (chainInfo: ChainInfo): ParsedChainInfo => {
  const { chain, chainName } = parseChainName(chainInfo.chain);

  return {
    chainName,
    chain: chain,
    chainId: chainInfo.id,
    iconUrl: chainInfo.icon,
    explorerUrl: chainInfo.explorer_url,
    confirmationTarget: chainInfo.confirmation_target,
    sourceTimelock: parseInt(chainInfo.source_timelock),
    destinationTimelock: parseInt(chainInfo.destination_timelock),
    supportedHtlcSchemas: chainInfo.supported_htlc_schemas,
    supportedTokenSchemas: chainInfo.supported_token_schemas,
    assets: chainInfo.assets.map((asset) => parseAsset(asset, chainInfo)),
  };
};

const parseAsset = (
  asset: AssetFromResponse,
  parent: ChainInfo,
): ParsedAsset => {
  const { chain } = parseChainName(parent.chain);
  const { symbol, name } = parseAssetId(asset.id);

  return {
    id: ChainAsset.from(asset.id),
    name: name,
    symbol: symbol,
    chain: chain,
    decimals: asset.decimals,
    tokenAddress: asset.token?.address || '',
    atomicSwapAddress: asset.htlc?.address || '',
    logo: asset.icon,
    price: asset.price,
    min_amount: asset.min_amount,
    max_amount: asset.max_amount,
  };
};

const parseChainName = (
  chainId: string,
): { chain: Chain; chainName: string } => {
  return {
    chain: chainId.split(':')[0] as Chain,
    chainName: chainId
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()),
  };
};

const SYMBOL_NAME_MAP: Record<string, string> = {
  wbtc: 'Wrapped Bitcoin',
  sol: 'Solana',
  usdc: 'USD Coin',
  usdt: 'Tether USD',
  btc: 'Bitcoin',
  cbbtc: 'Coinbase Wrapped Bitcoin',
  wcbtc: 'Wrapped Citrea Bitcoin',
};

const parseAssetId = (assetId: string): { symbol: string; name: string } => {
  const parts = assetId.split(':');
  let symbol: string;
  if (parts.length < 2) {
    symbol = assetId.toUpperCase();
  } else {
    symbol = parts[parts.length - 1].toUpperCase();
  }
  // Lookup in map (case-insensitive)
  const name = SYMBOL_NAME_MAP[symbol.toLowerCase()] ?? symbol;
  return { symbol, name };
};

export const assetInfoStore = create<AssetStoreState>((set, get) => ({
  chains: [],
  allAssets: [],
  isLoading: false,
  error: null,
  currentNetwork: Network.TESTNET,
  modalOpenFor: null,
  isAssetModalOpen: false,
  filter: '',
  balances: {},
  workingRPCs: {},

  fetchAssets: async (network?: Network) => {
    const targetNetwork = network || get().currentNetwork;
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `${getApiEndpoint(targetNetwork).api}/v2/chains`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ChainsApiResponse = await response.json();

      if (data.status !== 'Ok') {
        throw new Error('API returned error status');
      }

      const parsedChains = data.result.map(parseChainInfo);
      const allAssets = parsedChains.flatMap((chain) => chain.assets);

      set({
        chains: parsedChains,
        allAssets,
        isLoading: false,
        error: null,
        currentNetwork: targetNetwork,
      });
    } catch (error: any) {
      set({
        error: error?.message ?? 'Failed to load assets',
        isLoading: false,
      });
    }
  },

  setCurrentNetwork: (network: Network) => {
    set({ currentNetwork: network });
  },

  openModal: (side: IOType) => set({ modalOpenFor: side }),
  closeModal: () => set({ modalOpenFor: null }),
  openAssetModal: () => set({ isAssetModalOpen: true }),
  closeAssetModal: () => set({ isAssetModalOpen: false, filter: '' }),
  setFilter: (filter) => set({ filter }),
  fetchAndSetRPCs: async () => {
    set({ isLoading: true });
    const workingRPCs = await getAllWorkingRPCs([...SupportedChains]);
    set({ workingRPCs, isLoading: false });
  },

  fetchAndSetEvmBalances: async (address: string, fetchOnlyAsset?: Asset) => {
    const { allAssets, workingRPCs } = get();
    if (!allAssets) return;
    const tokensByChain: Partial<Record<Chain, Asset[]>> = {}; //TODO let
    const targetAssets = fetchOnlyAsset
      ? [fetchOnlyAsset]
      : Object.values(allAssets);
    for (const asset of targetAssets) {
      if (!isEVM(asset.chain)) continue;
      // Skip assets with empty or invalid token addresses
      if (!asset.tokenAddress || asset.tokenAddress.trim() === '') {
        console.log('Skipping asset with empty tokenAddress:', asset);
        continue;
      }
      if (!tokensByChain[asset.chain]) tokensByChain[asset.chain] = [];
      tokensByChain[asset.chain]!.push(asset);
    }
    try {
      const balanceResults = await Promise.allSettled(
        Object.entries(tokensByChain).map(async ([chain, assets]) => {
          const chainBalances = await getBalanceMulticall(
            assets.map((asset) => asset.tokenAddress) as Hex[],
            address as Hex,
            chain as EVMChains,
            workingRPCs,
          );

          const updatedBalances: Record<string, BigNumber | undefined> = {};

          for (const asset of assets!) {
            const orderKey = ChainAsset.from(asset).toString();
            let balance = chainBalances[asset.tokenAddress];

            if (
              balance &&
              balance.gt(0) &&
              isEvmNativeToken(chain as EVMChains, asset.tokenAddress)
            ) {
              const fee = await getLegacyGasEstimate(
                chain as EVMChains,
                address as `0x${string}`,
                asset.atomicSwapAddress as `0x${string}`,
              );

              if (fee) {
                const feeBN = new BigNumber(fee.gasCost);
                balance = BigNumber.max(balance.minus(feeBN), 0);
              }
            }

            updatedBalances[orderKey] = balance;
          }

          return updatedBalances;
        }),
      );

      const finalBalances = balanceResults.reduce((acc, result) => {
        return result.status === 'fulfilled'
          ? { ...acc, ...result.value }
          : acc;
      }, {});

      set({ balances: { ...get().balances, ...finalBalances } });
    } catch (err) {
      console.error('Failed to fetch balances', err);
    }
  },

  fetchAndSetStarknetBalance: async (address: string) => {
    const { allAssets } = get();
    if (!allAssets) return;

    const starknetAsset = Object.values(allAssets).find((asset) =>
      isStarknet(asset.chain),
    );

    if (!starknetAsset) return;

    const starknetBalance: Record<string, BigNumber | undefined> = {};
    const balanceRaw = await getStarknetTokenBalance(
      address,
      starknetAsset,
      get().currentNetwork,
    );

    const orderKey = ChainAsset.from(starknetAsset).toString();
    // Keep raw base units in store for consistent UI formatting
    starknetBalance[orderKey] = new BigNumber(balanceRaw);
    set({ balances: { ...get().balances, ...starknetBalance } });
  },

  fetchAndSetSolanaBalance: async (address: string) => {
    const { allAssets } = get();
    if (!allAssets) return;

    const solanaAssets = Object.values(allAssets).filter((asset) =>
      isSolana(asset.chain),
    );

    if (!solanaAssets.length) return;
    const solanaBalance: Record<string, BigNumber | undefined> = {};

    for (const asset of solanaAssets) {
      const balanceRaw = await getSolanaTokenBalance(
        address,
        asset,
        get().currentNetwork,
      );
      const orderKey = ChainAsset.from(asset).toString();

      if (isSolanaNativeToken(asset.chain, asset.tokenAddress)) {
        // Subtract estimated rent/fee in lamports, keep lamports (raw) in store
        const lamports = new BigNumber(balanceRaw);
        const estimatedFeeLamports = new BigNumber(3806080); // ~0.00380608 SOL
        const netLamports = BigNumber.max(
          lamports.minus(estimatedFeeLamports),
          0,
        );
        solanaBalance[orderKey] = netLamports;
      } else {
        // SPL tokens: keep smallest unit in store
        solanaBalance[orderKey] = new BigNumber(balanceRaw);
      }
    }
    set({ balances: { ...get().balances, ...solanaBalance } });
  },

  fetchAndSetSuiBalance: async (address: string) => {
    const { allAssets } = get();
    if (!allAssets) return;

    const suiAssets = Object.values(allAssets).filter((asset) =>
      isSui(asset.chain),
    );

    if (!suiAssets.length) return;
    const suiBalance: Record<string, BigNumber | undefined> = {};

    for (const asset of suiAssets) {
      const balanceRaw = await getSuiTokenBalance(
        address,
        asset,
        get().currentNetwork,
      );
      const orderKey = ChainAsset.from(asset).toString();
      // Keep raw smallest unit in store
      suiBalance[orderKey] = new BigNumber(balanceRaw);
    }
    set({ balances: { ...get().balances, ...suiBalance } });
  },

  // fetchAndSetBitcoinBalance: async (
  //   provider: IInjectedBitcoinProvider,
  //   address: string,
  // ) => {
  //   const { allAssets } = get();
  //   if (!allAssets || !provider) return;

  //   try {
  //     const balance = await provider.getBalance();
  //     if (!balance?.val?.total) return;

  //     const formattedBalance = new BigNumber(balance.val.confirmed);

  //     const _provider = new BitcoinProvider(get().currentNetwork);

  //     const feeRate = await _provider.getFeeRates();
  //     const utxos = await _provider.getUTXOs(address, Number(formattedBalance));
  //     const spendable = await getSpendableBalance(
  //       address,
  //       Number(formattedBalance),
  //       utxos.length,
  //       feeRate.fastestFee,
  //     );
  //     const maxSpendableBalance = spendable.ok ? spendable.val : 0;

  //     const btcBalance = Object.values(allAssets)
  //       .filter((asset) => isBitcoin(asset.chain))
  //       .reduce((acc, asset) => {
  //         acc[ChainAsset.from(asset).toString()] = new BigNumber(
  //           maxSpendableBalance,
  //         );
  //         return acc;
  //       }, {} as Record<string, BigNumber | undefined>);

  //     set({ balances: { ...get().balances, ...btcBalance } });
  //   } catch {
  //     /*empty*/
  //   }
  // },
}));
