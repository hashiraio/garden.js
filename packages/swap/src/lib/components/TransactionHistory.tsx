import React from 'react';
import { useGarden } from '@gardenfi/react-hooks';

const TransactionHistory = () => {
  const { pendingOrders, garden } = useGarden();
  return <div>TransactionHistory</div>;
};

export default TransactionHistory;
