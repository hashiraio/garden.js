import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@gardenfi/garden-book';
import { useGarden } from '@gardenfi/react-hooks';
import { BlockchainType } from '@gardenfi/orderbook';
import { transactionHistoryStore } from '../../store/transactionHistoryStore';
import { Transactions } from './Transactions';
import { swapStore } from '../../store/swapStore';
import { useAddresses } from '../../hooks/useAddresses';
import { BUFFER_HEIGHT, HEIGHTS } from '../../constants/constants';

type TransactionHistoryProps = {
  isOpen?: boolean;
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  isOpen = true,
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const {
    evmAddress,
    bitcoinAddress,
    solanaAddress,
    suiAddress,
    starknetAddress,
  } = useAddresses();
  const [connectedWallets, setConnectedWallets] = useState<
    Record<BlockchainType, string>
  >({
    bitcoin: '',
    evm: '',
    starknet: '',
    solana: '',
    sui: '',
    tron: '',
  });

  const { garden } = useGarden();
  const { fetchTransactions, totalItems, transactions, loadMore } =
    transactionHistoryStore();

  const { showFeesAndRateDetails, showBtcAddress } = swapStore();

  const showLoadMore = useMemo(
    () => transactions.length < totalItems,
    [transactions.length, totalItems],
  );

  const handleLoadMore = async () => {
    if (!garden) return;
    setIsLoadingMore(true);
    try {
      await loadMore(garden, connectedWallets);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!garden || !isOpen) return;

    const wallets: Record<BlockchainType, string> = {
      bitcoin: bitcoinAddress || '',
      evm: evmAddress || '',
      starknet: starknetAddress || '',
      solana: solanaAddress || '',
      sui: suiAddress || '',
      tron: '',
    };

    setConnectedWallets(wallets);

    // Fetch completed transactions
    fetchTransactions(garden, wallets);
  }, [garden, isOpen, fetchTransactions]);

  if (!isOpen) return null;

  const newHeight =
    (showFeesAndRateDetails
      ? showBtcAddress
        ? HEIGHTS.large
        : HEIGHTS.medium
      : HEIGHTS.small) - BUFFER_HEIGHT.small;

  return (
    <div className="flex flex-col h-full w-full gap-3 overflow-y-auto">
      <div
        className="scrollbar-hide flex flex-1 flex-col gap-5 overflow-y-auto h-full items-center rounded-2xl pb-6"
        style={{ minHeight: newHeight }}
      >
        <div className="flex flex-col rounded-2xl w-full bg-white/50">
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
