import { Order, EvmOrderResponse } from '@gardenfi/orderbook';
import { AsyncResult, Ok } from '@gardenfi/utils';
import { ITronHTLC } from '../tronHTLC.types';

export class TronRelay implements ITronHTLC {
  get htlcActorAddress(): string {
    return '';
  }

  async initiate(order: Order | EvmOrderResponse): AsyncResult<string, string> {
    return Ok('');
  }

  async redeem(order: Order, secret: string): AsyncResult<string, string> {
    return Ok('');
  }

  async refund(order: Order): AsyncResult<string, string> {
    return Ok('');
  }
}
