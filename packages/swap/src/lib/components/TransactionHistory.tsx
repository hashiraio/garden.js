import React, { useEffect, useState, useMemo } from 'react';
import { Typography, Button } from '@gardenfi/garden-book';
import { useGarden } from '@gardenfi/react-hooks';
import { BlockchainType } from '@gardenfi/orderbook';
import transactionHistoryStore from '../hooks/transactionHistoryStore';
import Transactions from './transactions/Transactions';

type TransactionHistoryProps = {
  isOpen?: boolean;
};

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  isOpen = true,
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [connectedWallets, setConnectedWallets] = useState<
    Record<BlockchainType, string>
  >({
    bitcoin: '',
    evm: '',
    starknet: '',
    solana: '',
    sui: '',
  });

  const { garden } = useGarden();
  const { fetchTransactions, totalItems, transactions, loadMore } =
    transactionHistoryStore();

  const showLoadMore = useMemo(
    () => transactions.length < totalItems,
    [transactions.length, totalItems],
  );

  const orderbookUrl = 'https://testnet.api.garden.finance/v2';

  const handleLoadMore = async () => {
    if (!garden) return;
    setIsLoadingMore(true);
    try {
      await loadMore(orderbookUrl, connectedWallets);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!garden || !isOpen) return;

    // Set connected wallets based on garden state
    const wallets: Record<BlockchainType, string> = {
      bitcoin: '',
      evm: garden?.htlcs.evm?.htlcActorAddress || '',
      starknet: '',
      solana: '',
      sui: '',
    };

    setConnectedWallets(wallets);

    // Fetch completed transactions
    fetchTransactions(orderbookUrl, wallets);
  }, [garden, isOpen, fetchTransactions]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full w-full gap-3">
      <div className="scrollbar-hide flex flex-1 flex-col gap-5 overflow-y-auto items-center rounded-2xl pb-6 min-h-0">
        <div className="flex flex-col rounded-2xl w-full bg-white/50">
          <Typography size="h5" weight="medium" className="p-4">
            Transactions
          </Typography>
          <Transactions />
        </div>

        {showLoadMore && (
          <Button
            onClick={handleLoadMore}
            variant={isLoadingMore ? 'disabled' : 'secondary'}
            className="mx-auto min-h-10 w-1/4"
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
