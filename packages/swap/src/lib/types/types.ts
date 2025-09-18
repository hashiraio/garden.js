export type ApiAsset = {
  id: string;
  chain: string;
  icon: string | null;
  htlc: { address: string; schema: string } | null;
  token: { address: string; schema: string | null } | null;
  decimals: number;
  min_amount: string;
  max_amount: string;
  price: number;
};

export type TabKey = 'swap' | 'history';

export type ParsedAsset = {
  id: string;
  chainKey: string; // e.g., "bitcoin_testnet" or "evm:11155111"
  chainDisplayName: string; // e.g., "Bitcoin Testnet"
  symbol: string; // e.g., "BTC"
  iconUrl: string | null;
  decimals: number;
  priceUsd: number;
  minAmountRaw: string;
  maxAmountRaw: string;
};

export function parseAssetId(assetId: string): {
  chainKey: string;
  symbol: string;
} {
  // Format examples: "bitcoin_testnet:btc", "ethereum_sepolia:wbtc", "evm:11155111", "solana:103:sol" (chain field may have colon)
  const parts = assetId.split(':');
  if (parts.length < 2) {
    return { chainKey: assetId, symbol: assetId.toUpperCase() };
  }
  const symbol = parts[parts.length - 1].toUpperCase();
  const chainKey = parts.slice(0, parts.length - 1).join(':');
  return { chainKey, symbol };
}

export function formatChainName(chainKey: string): string {
  // Handle keys like "bitcoin_testnet", "solana:103", "evm:421614"
  if (chainKey.includes(':')) {
    const [name, tag] = chainKey.split(':');
    const prettyName = capitalizeWords(name.replace(/[_-]/g, ' '));
    if (!tag || /^[0-9]+$/.test(tag)) {
      return prettyName;
    }
    return `${prettyName} ${capitalizeWords(tag.replace(/[_-]/g, ' '))}`;
  }

  const hasTestnet = /_testnet$/i.test(chainKey);
  const base = chainKey.replace(/[_-]/g, ' ').replace(/_testnet$/i, '');
  const prettyBase = capitalizeWords(base);
  return hasTestnet ? `${prettyBase} Testnet` : prettyBase;
}

export function toParsedAsset(a: ApiAsset): ParsedAsset {
  const { chainKey, symbol } = parseAssetId(a.id);
  return {
    id: a.id,
    chainKey,
    chainDisplayName: formatChainName(chainKey),
    symbol,
    iconUrl: a.icon ?? null,
    decimals: a.decimals,
    priceUsd: a.price,
    minAmountRaw: a.min_amount,
    maxAmountRaw: a.max_amount,
  };
}

function capitalizeWords(input: string): string {
  return input
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
