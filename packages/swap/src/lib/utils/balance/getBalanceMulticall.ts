import { evmToViemChainMap } from '@gardenfi/core';
import { EVMChains, isEvmNativeToken } from '@gardenfi/orderbook';
import BigNumber from 'bignumber.js';
import { createPublicClient, erc20Abi, Hex, http, multicall3Abi } from 'viem';
import { MULTICALL_CONTRACT_ADDRESSES } from '../../constants/constants';

export const getBalanceMulticall = async (
  tokenAddresses: Hex[],
  address: Hex,
  chain: EVMChains,
  workingRPCs: Record<number, string[]>,
): Promise<Record<string, BigNumber | undefined>> => {
  const viemChain = evmToViemChainMap[chain];
  if (!viemChain || tokenAddresses.length === 0) return {};

  // Filter out empty or invalid token addresses
  const validTokenAddresses = tokenAddresses.filter(
    (addr) => addr && addr.trim() !== '' && addr !== '0x' && addr.length === 42,
  );

  if (validTokenAddresses.length === 0) {
    console.log('No valid token addresses to process');
    return {};
  }

  const multicallAddress =
    viemChain.contracts?.multicall3?.address ??
    MULTICALL_CONTRACT_ADDRESSES[viemChain.id];

  if (!multicallAddress) {
    console.error(
      "multicall contract address doesn't exist for the chain id " +
        viemChain.id,
    );
    throw Error("multicall contract address doesn't exist.");
  }

  const fetchBalances = async (
    client: ReturnType<typeof createPublicClient>,
  ) => {
    const calls = validTokenAddresses.map((token) =>
      isEvmNativeToken(chain, token)
        ? {
            address: multicallAddress as Hex,
            abi: multicall3Abi,
            functionName: 'getEthBalance' as const,
            args: [address],
          }
        : {
            address: token,
            abi: erc20Abi,
            functionName: 'balanceOf' as const,
            args: [address],
          },
    );

    const result = await client.multicall({
      contracts: calls,
      multicallAddress: multicallAddress as Hex,
    });

    const balances: Record<string, BigNumber> = {};

    // Map results back to valid token addresses
    result.forEach((call, index) => {
      const tokenAddress = validTokenAddresses[index];
      balances[tokenAddress] =
        call.status === 'success'
          ? new BigNumber(call.result.toString())
          : new BigNumber(0);
    });

    // Also create entries for invalid addresses with 0 balance
    tokenAddresses.forEach((addr) => {
      if (!validTokenAddresses.includes(addr)) {
        balances[addr] = new BigNumber(0);
      }
    });

    return balances;
  };

  const getDefaultRpcUrl = (): string => {
    switch (viemChain.id) {
      case 80094:
      case 80084:
        return 'https://rpc.berachain-apis.com';
      case 1:
        return 'https://eth-mainnet.nodereal.io/v1/1659dfb40aa24bbb8153a677b98064d7';
      default:
        return viemChain.rpcUrls.default.http[0];
    }
  };
  const chainRpcs = workingRPCs[viemChain.id];

  for (const rpcUrl of chainRpcs) {
    try {
      const defaultClient = createPublicClient({
        transport: http(rpcUrl),
        chain: viemChain,
      });
      return await fetchBalances(defaultClient);
    } catch {
      // continue to next fallback
    }
  }

  try {
    const defaultRpcUrl = getDefaultRpcUrl();
    const defaultClient = createPublicClient({
      transport: http(defaultRpcUrl),
      chain: viemChain,
    });
    return await fetchBalances(defaultClient);
  } catch {
    return {};
  }
};
