# @gardenfi/orderbook

The `@gardenfi/orderbook` package manages the orderbook for cross-chain atomic swaps. It provides APIs for creating orders, retrieving order information, managing matched orders, and subscribing to real-time order updates. The package handles order lifecycle management, pagination for large order datasets, and supports filtering orders by various criteria including user address, transaction hash, and order status.

## Installation

```
yarn add @gardenfi/orderbook
```

## Usage

```typescript
import { Orderbook } from '@gardenfi/orderbook';
import { Url } from '@gardenfi/utils';

// Initialize the orderbook with the API URL
const orderbook = new Orderbook(new Url('<ORDERBOOK_API_URL>'));

// Get matched orders for a user
const matchedOrdersResult = await orderbook.getMatchedOrders(
  '<USER_ADDRESS>', // user address
  'pending', // status: 'all' | 'pending' | 'fulfilled'
  {
    page: 1,
    per_page: 10,
  },
);

if (matchedOrdersResult.ok) {
  console.log('Matched orders:', matchedOrdersResult.val.data);
} else {
  console.error('Error fetching matched orders:', matchedOrdersResult.error);
}
```
