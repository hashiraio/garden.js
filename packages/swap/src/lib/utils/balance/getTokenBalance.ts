import { STARKNET_CONFIG } from '@gardenfi/core';
import { isStarknet, isSui } from '@gardenfi/orderbook';
import { Network } from '@gardenfi/utils';
import { ParsedAsset } from 'src/lib/types/types';
import BigNumber from 'bignumber.js';
import { RpcProvider, Contract } from 'starknet';
import { Connection, PublicKey } from '@solana/web3.js';
import { getFullnodeUrl } from '@mysten/sui/client';
import { getSuiTotalGasFee } from './getNetworkFees';

const erc20ABI = [
  {
    members: [
      {
        name: 'low',
        offset: 0,
        type: 'felt',
      },
      {
        name: 'high',
        offset: 1,
        type: 'felt',
      },
    ],
    name: 'Uint256',
    size: 2,
    type: 'struct',
  },
  {
    inputs: [
      {
        name: 'account',
        type: 'felt',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: 'balance',
        type: 'Uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

// Returns RAW base units (lamports for SOL, smallest unit for SPL tokens)
export const getSolanaTokenBalance = async (
  address: string,
  asset: ParsedAsset,
  network: Network,
): Promise<string> => {
  try {
    const endpoint =
      network === Network.TESTNET
        ? 'https://api.devnet.solana.com'
        : 'https://solana-rpc.publicnode.com';

    const connection = new Connection(endpoint);

    const publicKey =
      typeof address === 'string' ? new PublicKey(address) : address;

    if (asset.tokenAddress === '') {
      // Native SOL balance in lamports (raw)
      const balance = await connection.getBalance(publicKey);
      return balance.toString();
    }

    let tokenMint: PublicKey;
    try {
      tokenMint = new PublicKey(asset.tokenAddress);
    } catch (err) {
      console.error('Invalid token mint address', {
        address: asset.tokenAddress,
        error: err,
      });
      return '0';
    }

    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      mint: tokenMint,
    });

    if (tokenAccounts.value.length === 0) return '0';
    const balance = await connection.getTokenAccountBalance(
      tokenAccounts.value[0].pubkey,
    );
    // Return raw amount string (already in smallest unit per SPL metadata)
    return balance.value.amount;
  } catch (error) {
    console.error('Error fetching Solana token balance:', error);
    return '0';
  }
};

// Returns RAW base units as string
export const getStarknetTokenBalance = async (
  address: string,
  asset: ParsedAsset,
  network: Network,
): Promise<string> => {
  if (!isStarknet(asset.chain)) return '0';

  try {
    const provider = new RpcProvider({
      nodeUrl: STARKNET_CONFIG[network as keyof typeof STARKNET_CONFIG].nodeUrl,
    });

    const erc20Contract = new Contract(erc20ABI, asset.tokenAddress, provider);

    const balance = await erc20Contract['balanceOf'](address);
    if (!balance) return '0';
    const lowValue = balance.balance.low.toString();
    const highValue = balance.balance.high.toString();

    // Convert hex strings to BigNumber
    const low = new BigNumber(lowValue);
    const high = new BigNumber(highValue);

    // Calculate total value: low + (high << 128)
    const shift128 = new BigNumber(2).pow(128);
    const totalBalance = low.plus(high.multipliedBy(shift128));

    // Return raw base units to avoid precision loss and let UI format
    return totalBalance.toString(10);
  } catch (error) {
    console.error('Error fetching Starknet balance:', error);
    return '0';
  }
};

// export const getTokenBalance = async (address: string, asset: Asset) => {
//   if (isEvmNativeToken(asset.chain, asset.tokenAddress))
//     return getNativeBalance(address, asset);

//   const balanceOfABI = {
//     inputs: [{ name: '_owner', type: 'address' }],
//     name: 'balanceOf',
//     outputs: [{ name: 'balance', type: 'uint256' }],
//     stateMutability: 'view',
//     type: 'function',
//   };

//   if (isBitcoin(asset.chain) || !isEVM(asset.chain)) return 0;
//   let _chain = evmToViemChainMap[asset.chain];
//   if (!_chain) return 0;

//   if (_chain.id === 1) {
//     const updatedChain = {
//       ..._chain,
//       rpcUrls: {
//         default: {
//           http: ['https://eth-mainnet.public.blastapi.io'],
//         },
//       },
//     };
//     _chain = updatedChain;
//   }

//   const data = encodeFunctionData({
//     abi: [balanceOfABI],
//     functionName: 'balanceOf',
//     args: [address],
//   });

//   const publicClient = createPublicClient({
//     chain: _chain,
//     transport: http(),
//   });

//   try {
//     const result = await publicClient.call({
//       to: with0x(asset.tokenAddress),
//       data,
//     });
//     if (!result.data) return 0;

//     // Decode the result to get the balance
//     const balance = decodeFunctionResult({
//       abi: [balanceOfABI],
//       functionName: 'balanceOf',
//       data: result.data,
//     });

//     const balanceInDecimals = new BigNumber(balance as string)
//       .dividedBy(10 ** asset.decimals)
//       .toNumber();

//     return balanceInDecimals;
//   } catch (e) {
//     console.error('Error fetching token balance:', e);
//     return 0;
//   }
// };

// export const getNativeBalance = async (address: string, asset: Asset) => {
//   try {
//     if (
//       isBitcoin(asset.chain) ||
//       !isEVM(asset.chain) ||
//       !isEvmNativeToken(asset.chain, asset.tokenAddress)
//     )
//       return 0;
//     const _chain = evmToViemChainMap[asset.chain];
//     if (!_chain) return 0;

//     const publicClient = createPublicClient({
//       chain: _chain,
//       transport: http(),
//     });

//     const balance = await publicClient.getBalance({
//       address: address as `0x${string}`,
//     });

//     const balanceInDecimals = formatAmount(balance, asset.decimals, 8);

//     return balanceInDecimals;
//   } catch (error) {
//     console.error('Error fetching native balance:', error);
//     return 0;
//   }
// };

// Returns RAW base units as string (mist for SUI)
export const getSuiTokenBalance = async (
  address: string,
  asset: ParsedAsset,
  network: Network,
): Promise<string> => {
  if (!isSui(asset.chain)) return '0';

  const suiRpcUrl = getFullnodeUrl(network);

  async function suiRpcCall(method: string, params: any[]) {
    const res = await fetch(suiRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  }

  try {
    if (
      asset.tokenAddress === 'primary' ||
      asset.tokenAddress === '0x2::sui::SUI'
    ) {
      const BUFFER_FEE_IN_MIST = 5_000_000;
      const result = await suiRpcCall('suix_getBalance', [
        address,
        '0x2::sui::SUI',
      ]);

      const totalBalance = new BigNumber(result.totalBalance ?? 0);
      const totalGasCost = new BigNumber(
        await getSuiTotalGasFee(address, totalBalance.toString(10), network),
      );

      const net = BigNumber.max(
        totalBalance.minus(BUFFER_FEE_IN_MIST).minus(totalGasCost),
        0,
      );
      return net.toString(10);
    } else {
      const result = await suiRpcCall('suix_getAllBalances', [address]);

      const token = Array.isArray(result)
        ? result.find(
            (b: any) =>
              b.coinType === asset.tokenAddress ||
              b.coinType === asset.tokenAddress.replace(/^0x/, '0x'),
          )
        : undefined;
      if (!token) return '0';
      // Return smallest unit
      return String(token.totalBalance ?? '0');
    }
  } catch (error) {
    console.error('Error fetching Sui token balance:', error);
    return '0';
  }
};
