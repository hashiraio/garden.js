// import {
//   AsyncResult,
//   checkAllowanceAndApprove,
//   Ok,
//   Err,
//   Fetcher,
//   APIResponse,
//   IAuth,
//   Url,
//   with0x,
// } from '@gardenfi/utils';
// import { encodeFunctionData, createWalletClient, custom } from 'viem';
// import {
//   EvmOrderResponse,
//   isEVM,
//   isEvmNativeToken,
//   Order,
//   isEvmOrderResponse,
//   EvmChain,
//   ChainAssetString,
//   ChainAsset,
// } from '@gardenfi/orderbook';
// import { IEVMHTLC } from '../htlc.types';
// import { getAssetInfoFromOrder } from '../../utils';
// import Privy, {
//   getUserEmbeddedEthereumWallet,
//   getEntropyDetailsFromUser,
//   PrivyEmbeddedWalletProvider,
// } from '@privy-io/js-sdk-core';
// import { PrivyEthereumEmbeddedWalletAccount } from '@privy-io/public-api';

// export class PrivyEVMRelay implements IEVMHTLC {
//   private url: Url;
//   private auth: IAuth;
//   // private wallet: PrivyEthereumEmbeddedWalletAccount;
//   // private provider: PrivyEmbeddedWalletProvider;
//   private privyClient: Privy;

//   constructor(
//     url: string | Url,
//     // wallet: PrivyEthereumEmbeddedWalletAccount,
//     // provider: PrivyEmbeddedWalletProvider,
//     privyClient: Privy,
//     auth: IAuth,
//   ) {
//     this.url = new Url(url.toString());
//     this.privyClient = privyClient;
//     this.auth = auth;
//     // this.wallet = wallet;
//     // this.provider = provider;
//   }

//   /**
//    * Factory method to create PrivyEVMRelay with proper wallet initialization
//    * @param url Garden API URL
//    * @param privyClient Privy instance
//    * @param auth Authentication instance
//    * @returns PrivyEVMRelay instance
//    */
//   static async create(
//     url: string | Url,
//     privyClient: Privy,
//     auth: IAuth,
//   ): Promise<AsyncResult<PrivyEVMRelay, string>> {
//     try {
//       // Get the current user from Privy
//       const userResponse = await privyClient.user.get();
//       if (!userResponse?.user) {
//         return Err('No authenticated user found. Please login first.');
//       }
//       const user = userResponse.user;

//       // Get the embedded Ethereum wallet
//       const wallet = getUserEmbeddedEthereumWallet(user);
//       if (!wallet) {
//         return Err('No embedded Ethereum wallet found for user.');
//       }

//       // Get entropy details for the wallet
//       const entropyDetails = getEntropyDetailsFromUser(user);
//       if (!entropyDetails) {
//         return Err('Failed to get entropy details for user.');
//       }
//       const { entropyId, entropyIdVerifier } = entropyDetails;

//       // Get the Ethereum provider
//       const provider = await privyClient.embeddedWallet.getEthereumProvider({
//         wallet,
//         entropyId,
//         entropyIdVerifier,
//       });

//       // Create the relay instance
//       // const relay = new PrivyEVMRelay(url, wallet, provider, auth);
//       // return Ok(relay);
//       return Ok(new PrivyEVMRelay(url, privyClient, auth));
//     } catch (error) {
//       return Err(`Failed to create PrivyEVMRelay: ${String(error)}`);
//     }
//   }

//   private async getProviderAndWalletFromPrivy(privyClient: Privy) {
//     const userResponse = await privyClient.user.get();
//     if (!userResponse?.user) {
//       return Err('No authenticated user found. Please login first.');
//     }
//     const user = userResponse.user;
//     const wallet = getUserEmbeddedEthereumWallet(user);
//     if (!wallet) {
//       return Err('No embedded Ethereum wallet found for user.');
//     }
//     const entropyDetails = getEntropyDetailsFromUser(user);
//     if (!entropyDetails) {
//       return Err('Failed to get entropy details for user.');
//     }
//     const { entropyId, entropyIdVerifier } = entropyDetails;
//     const provider = await privyClient.embeddedWallet.getEthereumProvider({
//       wallet,
//       entropyId,
//       entropyIdVerifier,
//     });
//     return { provider, wallet };
//   }

//   get htlcActorAddress(): string {
//     return this.wallet.address;
//   }

//   async initiate(order: Order | EvmOrderResponse): AsyncResult<string, string> {
//     if (isEvmOrderResponse(order)) {
//       return this.initiateWithCreateOrderResponse(order);
//     }

//     const walletAddress = this.htlcActorAddress;
//     if (!walletAddress) return Err('No EVM wallet address found');
//     if (
//       walletAddress.toLowerCase() !== order.source_swap.initiator.toLowerCase()
//     )
//       return Err('Account address and order initiator mismatch');
//     if (!isEVM(order.source_swap.chain))
//       return Err('Source chain is not an EVM chain');

//     const evmChain = order.source_swap.chain as EvmChain;

//     // Switch to the correct network using Privy wallet
//     try {
//       const chainId = this.getChainIdFromEvmChain(evmChain);
//       await this.provider.request({
//         method: 'wallet_switchEthereumChain',
//         params: [{ chainId: `0x${chainId.toString(16)}` }],
//       });
//     } catch (error) {
//       return Err(`Failed to switch network: ${String(error)}`);
//     }

//     const { source_swap } = order;

//     if (
//       !source_swap.amount ||
//       !source_swap.redeemer ||
//       !source_swap.timelock ||
//       !source_swap.secret_hash
//     )
//       return Err('Invalid order');

//     const secretHash = with0x(source_swap.secret_hash);
//     const timelock = BigInt(source_swap.timelock);
//     const redeemer = with0x(source_swap.redeemer);
//     const amount = BigInt(source_swap.amount);

//     const assetInfo = await getAssetInfoFromOrder(
//       order.source_swap.asset,
//       this.url,
//     );
//     if (!assetInfo.ok) return Err(assetInfo.error);
//     const { htlcAddress, tokenAddress } = assetInfo.val;

//     const asset = ChainAsset.fromString(
//       order.source_swap.asset as ChainAssetString,
//     );

//     if (isEvmNativeToken(asset.getChain(), asset.getSymbol())) {
//       return this._initiateOnNativeHTLC(
//         secretHash,
//         timelock,
//         amount,
//         redeemer,
//         htlcAddress,
//       );
//     } else {
//       return this._initiateOnErc20HTLC(
//         secretHash,
//         timelock,
//         amount,
//         redeemer,
//         htlcAddress,
//         tokenAddress,
//         order.order_id,
//       );
//     }
//   }

//   private async _initiateOnNativeHTLC(
//     secretHash: `0x${string}`,
//     timelock: bigint,
//     amount: bigint,
//     redeemer: `0x${string}`,
//     htlcAddress: string,
//   ): AsyncResult<string, string> {
//     try {
//       // For native tokens, we need to construct the contract call data
//       // This is a simplified version - you may need to adjust based on your HTLC contract ABI
//       const data = this.encodeInitiateCall(
//         redeemer,
//         timelock,
//         amount,
//         secretHash,
//       );
//       const providerResult = await this.getProviderAndWalletFromPrivy(
//         this.privyClient,
//       );
//       if ('error' in providerResult) {
//         return Err(providerResult.error);
//       }
//       const { provider } = providerResult;

//       const txHash = await provider.request({
//         method: 'eth_sendTransaction',
//         params: [
//           {
//             to: with0x(htlcAddress),
//             value: `0x${amount.toString(16)}`,
//             data: with0x(data),
//           },
//         ],
//       });

//       return Ok(txHash as string);
//     } catch (error) {
//       return Err('Failed to initiate on native HTLC: ' + String(error));
//     }
//   }

//   private async _initiateOnErc20HTLC(
//     secretHash: `0x${string}`,
//     timelock: bigint,
//     amount: bigint,
//     redeemer: `0x${string}`,
//     htlcAddress: string,
//     tokenAddress: string,
//     orderId: string,
//   ): AsyncResult<string, string> {
//     try {
//       const auth = await this.auth.getAuthHeaders();
//       if (!auth.ok) return Err(auth.error);

//       // Handle ERC20 approval if needed
//       // Create a viem WalletClient from the Privy provider
//       const walletClient = createWalletClient({
//         account: this.wallet.address as `0x${string}`,
//         transport: custom(this.provider),
//       });

//       const approval = await checkAllowanceAndApprove(
//         Number(amount),
//         tokenAddress,
//         htlcAddress,
//         walletClient,
//       );
//       if (!approval.ok) return Err(approval.error);

//       // Get current chain ID
//       const chainId = (await this.provider.request({
//         method: 'eth_chainId',
//         params: [],
//       })) as string;

//       // Sign typed data for ERC20 HTLC initiation
//       const signature = await this.provider.request({
//         method: 'eth_signTypedData_v4',
//         params: [
//           this.htlcActorAddress,
//           JSON.stringify({
//             domain: {
//               name: 'AtomicSwap',
//               version: '1',
//               chainId: parseInt(chainId, 16),
//               verifyingContract: htlcAddress,
//             },
//             types: {
//               EIP712Domain: [
//                 { name: 'name', type: 'string' },
//                 { name: 'version', type: 'string' },
//                 { name: 'chainId', type: 'uint256' },
//                 { name: 'verifyingContract', type: 'address' },
//               ],
//               Initiate: [
//                 { name: 'redeemer', type: 'address' },
//                 { name: 'timelock', type: 'uint256' },
//                 { name: 'amount', type: 'uint256' },
//                 { name: 'secretHash', type: 'bytes32' },
//               ],
//             },
//             primaryType: 'Initiate',
//             message: {
//               redeemer,
//               timelock: timelock.toString(),
//               amount: amount.toString(),
//               secretHash,
//             },
//           }),
//         ],
//       });

//       const headers: Record<string, string> = {
//         ...auth.val,
//         'Content-Type': 'application/json',
//       };

//       const res = await Fetcher.patch<APIResponse<string>>(
//         this.url
//           .endpoint('/v2/orders')
//           .endpoint(orderId)
//           .addSearchParams({ action: 'initiate' }),
//         {
//           body: JSON.stringify({
//             signature,
//           }),
//           headers,
//         },
//       );

//       if (res.error) return Err(res.error);
//       return Ok(res.result || 'Initiate hash not found');
//     } catch (error) {
//       return Err('Failed to initiate ERC20 HTLC: ' + String(error));
//     }
//   }

//   private async initiateWithCreateOrderResponse(
//     order: EvmOrderResponse,
//   ): AsyncResult<string, string> {
//     const chainId = order.initiate_transaction.chain_id;

//     try {
//       // Switch to the correct network
//       await this.provider.request({
//         method: 'wallet_switchEthereumChain',
//         params: [{ chainId: `0x${chainId.toString(16)}` }],
//       });

//       if (order.approval_transaction) {
//         const approvalResult = await this.executeApprovalTransaction(order);
//         if (approvalResult.error) {
//           return Err(`Approval failed: ${approvalResult.error}`);
//         }
//       }

//       const { typed_data } = order;

//       const signature = await this.provider.request({
//         method: 'eth_signTypedData_v4',
//         params: [
//           this.htlcActorAddress,
//           JSON.stringify({
//             domain: typed_data.domain,
//             types: typed_data.types,
//             message: typed_data.message,
//             primaryType: typed_data.primaryType,
//           }),
//         ],
//       });

//       const headers: Record<string, string> = {
//         ...(await this.auth.getAuthHeaders()).val,
//         'Content-Type': 'application/json',
//       };

//       const res = await Fetcher.patch<APIResponse<string>>(
//         this.url
//           .endpoint('/v2/orders')
//           .endpoint(order.order_id)
//           .addSearchParams({ action: 'initiate' }),
//         {
//           body: JSON.stringify({
//             signature,
//           }),
//           headers,
//         },
//       );

//       if (res.error) return Err(res.error);
//       if (!res.result) return Err('Initiate failed: Result is undefined');
//       return Ok(res.result);
//     } catch (error) {
//       return Err('Failed to initiate: ' + String(error));
//     }
//   }

//   private async executeApprovalTransaction(
//     order: EvmOrderResponse,
//   ): AsyncResult<string, string> {
//     if (!order.approval_transaction) {
//       return Ok('No approval transaction required');
//     }

//     try {
//       const approvalTx = order.approval_transaction;

//       const txHash = await this.provider.request({
//         method: 'eth_sendTransaction',
//         params: [
//           {
//             to: with0x(approvalTx.to),
//             data: with0x(approvalTx.data),
//             value: `0x${Number(approvalTx.value).toString(16)}`,
//           },
//         ],
//       });

//       return Ok(txHash as string);
//     } catch (error: any) {
//       return Err(
//         'Failed to execute approval: ' + (error?.message || String(error)),
//       );
//     }
//   }

//   private getChainIdFromEvmChain(evmChain: EvmChain): number {
//     // Map EvmChain to chain ID - you may need to adjust this based on your chain definitions
//     const chainIdMap: Record<string, number> = {
//       ethereum: 1,
//       polygon: 137,
//       arbitrum: 42161,
//       optimism: 10,
//       base: 8453,
//       bsc: 56,
//     };

//     return chainIdMap[evmChain] || 1; // Default to Ethereum mainnet
//   }

//   private encodeInitiateCall(
//     redeemer: `0x${string}`,
//     timelock: bigint,
//     amount: bigint,
//     secretHash: `0x${string}`,
//   ): string {
//     // Proper ABI encoding for HTLC initiate function
//     const htlcAbi = [
//       {
//         type: 'function',
//         name: 'initiate',
//         stateMutability: 'payable',
//         inputs: [
//           { name: 'redeemer', type: 'address' },
//           { name: 'timelock', type: 'uint256' },
//           { name: 'amount', type: 'uint256' },
//           { name: 'secretHash', type: 'bytes32' },
//         ],
//         outputs: [],
//       },
//     ] as const;

//     return encodeFunctionData({
//       abi: htlcAbi,
//       functionName: 'initiate',
//       args: [redeemer, timelock, amount, secretHash],
//     });
//   }

//   // Placeholder implementations for interface compliance
//   async redeem(order: Order, secret: string): AsyncResult<string, string> {
//     return Err('Redeem not implemented in PrivyEVMRelay');
//   }

//   async refund(order: Order): AsyncResult<string, string> {
//     return Err('Refund not implemented in PrivyEVMRelay');
//   }
// }
