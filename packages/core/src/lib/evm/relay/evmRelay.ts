import {
  AsyncResult,
  checkAllowanceAndApprove,
  Ok,
  Err,
  Fetcher,
  trim0x,
  waitForTransactionReceipt,
  APIResponse,
  IAuth,
  Url,
  with0x,
} from '@gardenfi/utils';
import { WalletClient, createPublicClient, getContract, http } from 'viem';
import {
  EvmOrderResponse,
  isEVM,
  isEvmNativeToken,
  Order,
  isEvmOrderResponse,
  EvmChain,
  ChainAsset,
} from '@gardenfi/orderbook';
import { AtomicSwapABI } from '../abi/atomicSwap';
import { IEVMHTLC } from '../htlc.types';
import {
  evmToViemChainMap,
  getChainNameFromChainId,
  switchOrAddNetwork,
} from './../../switchOrAddNetwork';
import { nativeHTLCAbi } from '../abi/nativeHTLC';
import { getAssetInfoFromOrder } from '../../utils';

export class EvmRelay implements IEVMHTLC {
  private url: Url;
  private auth: IAuth;
  private wallet: WalletClient;

  constructor(url: string | Url, wallet: WalletClient, auth: IAuth) {
    this.url = new Url(url.toString());
    this.auth = auth;
    this.wallet = wallet;
  }

  get htlcActorAddress(): string {
    if (!this.wallet.account) throw new Error('No account found');
    return this.wallet.account.address;
  }

  // ---------------------- INITIATE ----------------------
  async initiate(order: Order | EvmOrderResponse): AsyncResult<string, string> {
    if (isEvmOrderResponse(order)) {
      return this.initiateWithCreateOrderResponse(order);
    }
    if (!this.wallet.account) return Err('No account found');
    if (
      this.wallet.account.address.toLowerCase() !==
      order.source_swap.initiator.toLowerCase()
    )
      return Err('Account address and order initiator mismatch');
    if (!isEVM(order.source_swap.chain))
      return Err('Source chain is not an EVM chain');

    const evmChain = order.source_swap.chain as EvmChain;
    const _walletClient = await switchOrAddNetwork(evmChain, this.wallet);
    if (!_walletClient.ok) return Err(_walletClient.error);
    this.wallet = _walletClient.val.walletClient;
    if (!this.wallet.account) return Err('No account found');

    const { source_swap } = order;

    if (
      !source_swap.amount ||
      !source_swap.redeemer ||
      !source_swap.timelock ||
      !source_swap.secret_hash
    )
      return Err('Invalid order');

    const secretHash = with0x(source_swap.secret_hash);
    const timelock = BigInt(source_swap.timelock);
    const redeemer = with0x(source_swap.redeemer);
    const amount = BigInt(source_swap.amount);

    const assetInfo = await getAssetInfoFromOrder(
      order.source_swap.asset,
      this.url,
    );
    if (!assetInfo.ok) return Err(assetInfo.error);
    const { htlcAddress, tokenAddress } = assetInfo.val;

    const asset = ChainAsset.fromString(order.source_swap.asset);

    if (isEvmNativeToken(asset.getChain(), asset.getSymbol())) {
      return this._initiateOnNativeHTLC(
        secretHash,
        timelock,
        amount,
        redeemer,
        htlcAddress,
      );
    } else {
      return this._initiateOnErc20HTLC(
        secretHash,
        timelock,
        amount,
        redeemer,
        htlcAddress,
        tokenAddress,
        order.order_id,
      );
    }
  }

  private async _initiateOnNativeHTLC(
    secretHash: `0x${string}`,
    timelock: bigint,
    amount: bigint,
    redeemer: `0x${string}`,
    asset: string,
  ): AsyncResult<string, string> {
    if (!this.wallet.account) return Err('No account found');

    try {
      const contract = getContract({
        address: with0x(asset),
        abi: nativeHTLCAbi,
        client: this.wallet,
      });

      const txHash = await contract.write.initiate(
        [redeemer, timelock, amount, secretHash],
        {
          account: this.wallet.account,
          chain: this.wallet.chain,
          value: amount,
        },
      );

      return Ok(txHash);
    } catch (error) {
      return Err('Failed to initiate on native HTLC', String(error));
    }
  }

  private async _initiateOnErc20HTLC(
    secretHash: `0x${string}`,
    timelock: bigint,
    amount: bigint,
    redeemer: `0x${string}`,
    htlcAddress: string,
    tokenAddress: string,
    orderId: string,
  ): AsyncResult<string, string> {
    if (!this.wallet.account) return Err('No account found');

    try {
      const auth = await this.auth.getAuthHeaders();
      if (!auth.ok) return Err(auth.error);

      const atomicSwap = getContract({
        address: with0x(htlcAddress),
        abi: AtomicSwapABI,
        client: this.wallet,
      });

      const approval = await checkAllowanceAndApprove(
        Number(amount),
        tokenAddress,
        htlcAddress,
        this.wallet,
      );
      if (!approval.ok) return Err(approval.error);

      const domain = await atomicSwap.read.eip712Domain();

      const signature = await this.wallet.signTypedData({
        account: this.wallet.account,
        domain: {
          name: domain[1],
          version: domain[2],
          chainId: Number(domain[3]),
          verifyingContract: domain[4],
        },
        types: {
          Initiate: [
            { name: 'redeemer', type: 'address' },
            { name: 'timelock', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
            { name: 'secretHash', type: 'bytes32' },
          ],
        },
        primaryType: 'Initiate',
        message: {
          redeemer,
          timelock,
          amount,
          secretHash,
        },
      });
      const headers: Record<string, string> = {
        ...auth.val,
        'Content-Type': 'application/json',
      };
      const res = await Fetcher.patch<APIResponse<string>>(
        this.url
          .endpoint('/v2/orders')
          .endpoint(orderId)
          .addSearchParams({ action: 'initiate' }),
        {
          body: JSON.stringify({
            signature,
          }),
          headers,
        },
      );
      if (res.error) return Err(res.error);
      const receipt = await waitForTransactionReceipt(
        this.wallet,
        res.result as `0x${string}`,
      );
      if (receipt.val && receipt.val.status === 'success') {
        return Ok(res.result ? res.result : 'Initiate hash not found');
      } else {
        return Err('Init failed: Transaction receipt not successful');
      }
    } catch (error) {
      console.log('init error :', error);
      return Err(String(error));
    }
  }

  // ---------------------- INITIATE WITH CREATE ORDER RESPONSE ----------------------
  private async initiateWithCreateOrderResponse(
    order: EvmOrderResponse,
  ): AsyncResult<string, string> {
    const chainId = order.initiate_transaction.chain_id;

    const chainName = getChainNameFromChainId(chainId);
    if (!chainName) {
      return Err(`Unsupported chain ID: ${chainId}`);
    }

    const _walletClient = await switchOrAddNetwork(chainName, this.wallet);
    if (!_walletClient.ok) return Err(_walletClient.error);
    this.wallet = _walletClient.val.walletClient;

    if (!this.wallet.account) return Err('No account found');
    try {
      // Native Initiate
      if (order.typed_data === null) {
        const tx = order.initiate_transaction;
        if (!tx)
          return Err('No initiate_transaction found for native initiate');
        const txHash = await this.wallet.sendTransaction({
          account: this.wallet.account,
          to: with0x(tx.to),
          value: BigInt(tx.value),
          data: with0x(tx.data),
          gas: BigInt(tx.gas_limit),
          chain: this.wallet.chain,
        });

        const receipt = await waitForTransactionReceipt(this.wallet, txHash);
        if (receipt.val && receipt.val.status !== 'success') {
          return Err('Native initiate transaction failed');
        }

        return Ok(txHash);
      }

      // Erc20 Initiate
      if (order.approval_transaction) {
        const approvalResult = await this.executeApprovalTransaction(order);
        if (approvalResult.error) {
          return Err(`Approval failed: ${approvalResult.error}`);
        }
        console.log('Approval transaction completed:', approvalResult.val);
      }

      // Erc20 Initiate with Approval
      const { typed_data } = order;

      const signature = await this.wallet.signTypedData({
        account: this.wallet.account,
        domain: typed_data.domain,
        types: typed_data.types,
        primaryType: typed_data.primaryType,
        message: typed_data.message,
      });
      const headers: Record<string, string> = {
        ...(await this.auth.getAuthHeaders()).val,
        'Content-Type': 'application/json',
      };
      const res = await Fetcher.patch<APIResponse<string>>(
        this.url
          .endpoint('/v2/orders')
          .endpoint(order.order_id)
          .addSearchParams({ action: 'initiate' }),
        {
          body: JSON.stringify({
            signature,
          }),
          headers,
        },
      );
      if (res.error) return Err(res.error);
      if (!res.result) return Err('Initiate failed: Result is undefined');
      return Ok(res.result);
    } catch (error) {
      console.error('initiateWithCreateOrderResponse error:', error);
      return Err('Failed to initiate: ' + String(error));
    }
  }

  private async executeApprovalTransaction(
    order: EvmOrderResponse,
  ): AsyncResult<string, string> {
    if (!this.wallet.account) return Err('No account found');

    if (!order.approval_transaction) {
      return Ok('No approval transaction required');
    }

    try {
      const approvalTx = order.approval_transaction;

      const txHash = await this.wallet.sendTransaction({
        account: this.wallet.account,
        to: with0x(approvalTx.to),
        value: BigInt(approvalTx.value),
        data: with0x(approvalTx.data),
        gas: BigInt(approvalTx.gas_limit),
        chain: this.wallet.chain,
      });

      const receipt = await waitForTransactionReceipt(this.wallet, txHash);

      if (receipt.val && receipt.val.status !== 'success') {
        return Err('Approval transaction failed');
      }

      return Ok(txHash);
    } catch (error: any) {
      console.error('executeApprovalTransaction error:', error);
      return Err(
        'Failed to execute approval: ' + (error?.message || String(error)),
      );
    }
  }

  // ---------------------- REDEEM ----------------------
  async redeem(order: Order, secret: string): AsyncResult<string, string> {
    try {
      const headers = await this.auth.getAuthHeaders();
      if (!headers.ok) return Err(headers.error);
      const res = await Fetcher.patch<APIResponse<string>>(
        this.url
          .endpoint('/v2/orders')
          .endpoint(order.order_id)
          .addSearchParams({ action: 'redeem' }),
        {
          body: JSON.stringify({
            secret: trim0x(secret),
          }),
          headers: {
            ...headers.val,
            'Content-Type': 'application/json',
          },
        },
      );

      if (res.error) return Err(res.error);

      const viemChain =
        evmToViemChainMap[
          order.destination_swap.chain as keyof typeof evmToViemChainMap
        ];

      const evmProvider = createPublicClient({
        chain: viemChain,
        transport: http(),
      });
      const receipt = await evmProvider.waitForTransactionReceipt({
        hash: res.result as `0x${string}`,
        confirmations: 1,
        timeout: 300000,
      });
      if (receipt && receipt.status === 'success') {
        return Ok(res.result ? res.result : 'Redeem hash not found');
      } else {
        return Err('Redeem failed: Transaction receipt not successful');
      }
    } catch (error) {
      return Err(String(error));
    }
  }

  // ---------------------- REDEEM ----------------------
  async refund(): AsyncResult<string, string> {
    return Err('Refund not supported');
  }
}
