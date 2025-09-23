import axios from 'axios';
import { Chain } from 'viem';

type RPCValidationResult = {
  url: string;
  isWorking: boolean;
  blockNumber?: number;
  responseTime?: number;
};

export const testRPC = async (rpcUrl: string): Promise<RPCValidationResult> => {
  const startTime = Date.now();

  try {
    const response = await axios.post(
      rpcUrl,
      {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      },
      {
        timeout: 1000,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const responseTime = Date.now() - startTime;

    const { result } = response.data;
    if (typeof result === 'string' && result.startsWith('0x')) {
      return {
        url: rpcUrl,
        isWorking: true,
        blockNumber: parseInt(result, 16),
        responseTime,
      };
    }

    return { url: rpcUrl, isWorking: false };
  } catch {
    return { url: rpcUrl, isWorking: false };
  }
};

type ChainListRPC = {
  [chainId: number]: string[];
};

export const getChainListRPCs = async (): Promise<ChainListRPC> => {
  try {
    const { data } = await axios.get<
      {
        chainId: number;
        rpc: { url: string }[];
      }[]
    >('https://chainlist.org/rpcs.json');

    return data.reduce((acc, curr) => {
      acc[curr.chainId] = curr.rpc.map((rpc) => rpc.url);
      return acc;
    }, {} as ChainListRPC);
  } catch {
    return [];
  }
};

export const getWorkingRPCs = async (
  rpcs: string[],
  maxWorking: number = 5,
  maxConcurrent: number = 10,
): Promise<string[]> => {
  if (rpcs.length === 0) return [];

  const workingRPCs: string[] = [];

  for (
    let i = 0;
    i < rpcs.length && workingRPCs.length < maxWorking;
    i += maxConcurrent
  ) {
    const batch = rpcs.slice(i, i + maxConcurrent);
    const results = await Promise.all(batch.map((rpc) => testRPC(rpc)));

    const sorted = results
      .filter((res) => res.isWorking)
      .sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0));

    for (const { url } of sorted) {
      if (workingRPCs.length >= maxWorking) break;
      workingRPCs.push(url);
    }
  }

  return workingRPCs;
};

export const getRPCsForChain = async (
  chain: Chain,
  maxRPCsPerChain: number = 10,
): Promise<string[]> => {
  const rpcs = await getChainListRPCs();
  console.log('rpcs', rpcs);
  const reqRPCs = rpcs[chain.id];
  if (!reqRPCs || reqRPCs.length === 0) return [chain.rpcUrls.default.http[0]];
  return reqRPCs.slice(0, maxRPCsPerChain);
};

export const getAllWorkingRPCs = async (
  chains: Chain[],
): Promise<Record<number, string[]>> => {
  const rpcs = await getChainListRPCs();
  const results = await Promise.allSettled(
    chains.map(async (chain) => {
      const reqRpcs = rpcs[chain.id].slice(0, 10);
      const working = await getWorkingRPCs(reqRpcs);
      return { chainId: chain.id, working };
    }),
  );

  return results.reduce<Record<number, string[]>>((acc, result) => {
    if (result.status === 'fulfilled') {
      acc[result.value.chainId] = result.value.working;
    }
    return acc;
  }, {});
};
