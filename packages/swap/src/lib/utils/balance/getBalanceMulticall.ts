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
    const calls = tokenAddresses.map((token) =>
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
    console.log(calls, result);
    return result.reduce((acc, call, index) => {
      acc[tokenAddresses[index]] =
        call.status === 'success'
          ? new BigNumber(call.result.toString())
          : new BigNumber(0);
      return acc;
    }, {} as Record<string, BigNumber>);
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
  console.log(chainRpcs);
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
