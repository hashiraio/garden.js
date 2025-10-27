import { ChainAsset } from '../chainAsset/chainAsset';

export function parseAssetNameSymbol(
  input: string | undefined,
  assetId?: string | ChainAsset,
  fallbackSymbol?: string,
): { name: string; symbol: string } {
  const raw = (input ?? '').trim();
  if (!raw) return { name: '', symbol: fallbackSymbol?.trim() || '' };

  const parts = raw.split(':');
  if (parts.length >= 2) {
    const name = parts[0]?.trim() || '';
    const symbol =
      parts.slice(1).join(':').trim() || fallbackSymbol?.trim() || '';
    return { name, symbol };
  }

  let derivedSymbol = '';

  if (assetId) {
    try {
      const chainAsset =
        typeof assetId === 'string' ? ChainAsset.from(assetId) : assetId;
      derivedSymbol = chainAsset.symbol.toUpperCase();
    } catch {
      /* empty */
    }
  }

  return { name: raw, symbol: derivedSymbol || fallbackSymbol?.trim() || '' };
}
