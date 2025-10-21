import { Order, EvmOrderResponse } from '@gardenfi/orderbook';
import {
  APIResponse,
  AsyncResult,
  Err,
  Fetcher,
  IAuth,
  Network,
  Ok,
  trim0x,
  Url,
} from '@gardenfi/utils';
import { ITronHTLC } from '../tronHTLC.types';

export class TronRelay implements ITronHTLC {
  private url: Url;
  private auth: IAuth;

  constructor(relayerUrl: string | Url, network: Network, auth: IAuth) {
    this.url = relayerUrl instanceof Url ? relayerUrl : new Url(relayerUrl);
    this.auth = auth;
  }

  get htlcActorAddress(): string {
    return '';
  }

  async initiate(order: Order | EvmOrderResponse): AsyncResult<string, string> {
    return Ok('');
  }

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
          retryCount: 10,
          retryDelay: 2000,
        },
      );

      if (res.error) return Err(res.error);
      return res.result ? Ok(res.result) : Err('Redeem: No result found');
    } catch (error) {
      return Err(String(error));
    }
  }

  async refund(): AsyncResult<string, string> {
    return Err('Refund is taken care of by the relayer');
  }
}
