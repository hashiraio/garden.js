import { Order, EvmOrderResponse } from '@gardenfi/orderbook';
import { AsyncResult, Err, IAuth, Network, Ok, Url } from '@gardenfi/utils';
import { ITronHTLC } from '../tronHTLC.types';
import { redeemOrderThroughRelayer } from '../../utils';

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
    const redeemResult = await redeemOrderThroughRelayer(
      order,
      secret,
      this.auth,
      this.url,
    );
    if (redeemResult.error) return Err(redeemResult.error);
    return Ok(redeemResult.val!);
  }

  async refund(): AsyncResult<string, string> {
    return Err('Refund is taken care of by the relayer');
  }
}
