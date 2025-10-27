import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ParsedAsset, ParsedChainInfo } from '../../types/types';
import { swapStore } from '../../store/swapStore';
import { assetInfoStore } from '../../store/assetStore';
import { ChainsTooltip } from '../../common/ChainsToolTip';
import {
  GradientScroll,
  CloseIcon,
  SearchIcon,
  TokenNetworkLogos,
  Typography,
} from '@gardenfi/garden-book';
import { AnimatePresence, motion } from 'framer-motion';
import { AvailableChainsSidebar } from './AvailableChainsSidebar';
import { Network } from '@gardenfi/utils';
import { formatAmount } from '../../utils/utils';
import { IOType, HEIGHTS, BUFFER_HEIGHT } from '../../constants/constants';
import { ChainAsset } from '@gardenfi/orderbook';
import { useAddresses } from '../../hooks/useAddresses';

type Props = {
  onSelect: (asset: ParsedAsset) => void;
};

const AssetModal: React.FC<Props> = ({ onSelect }) => {
  const {
    inputAsset,
    outputAsset,
    currentNetwork,
    showFeesAndRateDetails,
    showBtcAddress,
  } = swapStore();
  const {
    allAssets,
    chains,
    modalOpenFor,
    isAssetModalOpen,
    closeAssetModal,
    balances,
  } = assetInfoStore();

  const {
    evmAddress,
    bitcoinAddress,
    starknetAddress,
    suiAddress,
    solanaAddress,
  } = useAddresses();

  const [selectedChain, setSelectedChain] = useState<
    ParsedChainInfo | undefined
  >();
  const [searchInput, setSearchInput] = useState<string>('');
  const [results, setResults] = useState<ParsedAsset[]>();
  const [searchResults, setSearchResults] = useState<ParsedAsset[]>();
  const [hoveredChain, setHoveredChain] = useState<string>('');
  const [visibleChainsCount] = useState<number>(5);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showAllChains, setShowAllChains] = useState(false);

  // Simple mobile detection
  const isMobile =
    typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  const height =
    (showFeesAndRateDetails
      ? showBtcAddress
        ? HEIGHTS.large
        : HEIGHTS.medium
      : HEIGHTS.small) - BUFFER_HEIGHT.large;

  // Chain ordering for display
  const orderedChains = useMemo(() => {
    const order: string[] = [
      'bitcoin',
      'ethereum',
      'solana',
      'base',
      'arbitrum',
      'starknet',
    ];

    if (!chains) return [];

    const sortedChainsByOrder = [...chains].sort((a, b) => {
      const indexA = order.findIndex((name) =>
        a.chainName.toLowerCase().includes(name),
      );
      const indexB = order.findIndex((name) =>
        b.chainName.toLowerCase().includes(name),
      );
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return sortedChainsByOrder;
  }, [chains]);

  const comparisonToken = useMemo(
    () => (modalOpenFor === IOType.input ? outputAsset : inputAsset),
    [modalOpenFor, inputAsset, outputAsset],
  );

  const sortedResults = useMemo(() => {
    const assetsToSort = searchInput ? searchResults : results;
    if (!assetsToSort && orderedChains.length === 0) return [];
    return (
      assetsToSort &&
      assetsToSort
        .sort((a, b) => {
          const chainA = chains?.find((c) => c.chain === a.chain);
          const chainB = chains?.find((c) => c.chain === b.chain);
          if (chainA && chainB) {
            const indexA = orderedChains.findIndex(
              (c) => c.chain === chainA.chain,
            );
            const indexB = orderedChains.findIndex(
              (c) => c.chain === chainB.chain,
            );
            return indexA - indexB;
          }
          return 0;
        })
        .filter(
          (asset) => !selectedChain || asset.chain === selectedChain.chain,
        )
        .map((asset) => {
          const network = chains?.find((c) => c.chain === asset.chain);
          const chainAssetKey = ChainAsset.from(asset).toString();
          const balance = balances?.[chainAssetKey];
          const fiatRate = asset.price ?? 0;
          const formattedBalance =
            balance && asset && balance.toString() === '0'
              ? ''
              : balance
              ? formatAmount(
                  balance.toString(),
                  asset.decimals,
                  Math.min(asset.decimals, 8),
                )
              : undefined;

          const fiatBalance =
            formattedBalance &&
            (Number(formattedBalance) * Number(fiatRate)).toFixed(5);

          return {
            asset,
            network,
            formattedBalance,
            fiatBalance,
          };
        })
    );
  }, [
    searchResults,
    results,
    orderedChains,
    chains,
    selectedChain,
    balances,
    searchInput,
  ]);

  const isAnyWalletConnected =
    !!evmAddress ||
    !!bitcoinAddress ||
    !!starknetAddress ||
    !!solanaAddress ||
    !!suiAddress;

  const fiatBasedSortedResults = useMemo(() => {
    if (!isAnyWalletConnected) return sortedResults;
    return (
      sortedResults &&
      [...sortedResults].sort((a, b) => {
        const aFiat = a.fiatBalance ? Number(a.fiatBalance) : 0;
        const bFiat = b.fiatBalance ? Number(b.fiatBalance) : 0;
        return bFiat - aFiat;
      })
    );
  }, [sortedResults, isAnyWalletConnected]);

  // Visible chains for the chain selector (ensure selected chain is included)
  const visibleChains = useMemo(() => {
    const base = orderedChains.slice(0, visibleChainsCount);
    if (selectedChain && !base.find((c) => c.chain === selectedChain.chain)) {
      return [selectedChain, ...base.slice(0, visibleChainsCount - 1)];
    }
    return base;
  }, [orderedChains, visibleChainsCount, selectedChain]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!results) return;
    const inputValue = e.target.value.toLowerCase();
    setSearchInput(inputValue);

    if (!inputValue) {
      setSearchResults(undefined);
      return;
    }
    setSearchResults(
      results.filter(
        (asset) =>
          asset.name?.toLowerCase().includes(inputValue) ||
          asset.symbol?.toLowerCase().includes(inputValue),
      ),
    );
  };

  const hideSidebar = () => setShowAllChains(false);

  const handleChainClick = (chain: ParsedChainInfo) => {
    if (selectedChain?.chain === chain.chain) setSelectedChain(undefined);
    else setSelectedChain(chain);
    setShowAllChains(false);
  };

  const handleAssetSelect = (asset: ParsedAsset) => {
    onSelect(asset);
    closeAssetModal();
    setTimeout(() => {
      setSelectedChain(undefined);
      setSearchInput('');
    }, 700);
    setShowAllChains(false);
  };

  const handleClose = () => {
    closeAssetModal();
    setTimeout(() => {
      setSelectedChain(undefined);
      setSearchInput('');
    }, 700);
    setShowAllChains(false);
  };

  useEffect(() => {
    if (!allAssets) return;
    const otherAsset = modalOpenFor === IOType.input ? outputAsset : inputAsset;
    if (!otherAsset || modalOpenFor === IOType.input) {
      setResults([...allAssets]);
    } else {
      // Filter out the other selected asset
      const filteredAssets = allAssets.filter(
        (asset) =>
          `${asset.chain}-${asset.symbol}` !==
          `${otherAsset.chain}-${otherAsset.symbol}`,
      );
      setResults([...filteredAssets, otherAsset]);
    }
  }, [allAssets, comparisonToken, modalOpenFor]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isAssetModalOpen) {
      setShowAllChains(false);
      closeAssetModal();
    }
  }, [closeAssetModal, isAssetModalOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isAssetModalOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isAssetModalOpen]);

  return (
    <>
      {showAllChains && (
        <AvailableChainsSidebar
          show={showAllChains}
          chains={[...orderedChains]}
          hide={hideSidebar}
          onClick={handleChainClick}
        />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key="assetModal"
          initial={{ opacity: 1 }}
          animate={{ opacity: showAllChains ? 0 : 1 }}
          transition={{
            duration: showAllChains ? 0.32 : 0.45,
            delay: showAllChains ? 0 : 0.25,
            ease: 'easeOut',
          }}
          className={`left-auto top-60 z-30 flex flex-col gap-3 rounded-[20px] w-full`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-1">
            <Typography size="h4" weight="medium">
              {`Select token to ${
                modalOpenFor === IOType.input ? 'send' : 'receive'
              }`}
            </Typography>
            <CloseIcon
              className="hidden cursor-pointer sm:visible sm:block"
              onClick={handleClose}
            />
          </div>

          {/* Chain Filter */}
          <div className="flex w-full flex-wrap gap-3">
            <div className={`flex w-full ${isMobile ? 'gap-2' : 'gap-3'}`}>
              {visibleChains.map((chain, index) => (
                <button
                  key={chain.chainId}
                  className={`relative flex h-12 flex-1 items-center justify-center gap-2 overflow-visible rounded-xl outline-none duration-300 ease-in-out ${
                    !selectedChain || chain.chain !== selectedChain.chain
                      ? '!bg-white/50'
                      : '!bg-white'
                  }`}
                  onMouseEnter={() => setHoveredChain(chain.chainName)}
                  onMouseLeave={() => setHoveredChain('')}
                  onClick={() =>
                    selectedChain && chain.chain === selectedChain.chain
                      ? setSelectedChain(undefined)
                      : setSelectedChain(chain)
                  }
                >
                  <img
                    src={chain.iconUrl}
                    alt={chain.chainName}
                    className="h-5 w-5 rounded-full"
                  />
                  {hoveredChain === chain.chainName && (
                    <ChainsTooltip
                      chain={chain.chainName}
                      className={`${
                        currentNetwork === Network.TESTNET
                          ? index === 0
                            ? 'translate-x-7'
                            : orderedChains.length - visibleChainsCount === 0 &&
                              index === visibleChainsCount - 1 &&
                              !!isMobile
                            ? '-translate-x-4'
                            : ''
                          : ''
                      }`}
                    />
                  )}
                </button>
              ))}
              {orderedChains.length > visibleChainsCount && (
                <button
                  className={`h-12 w-12 cursor-pointer flex items-center justify-center rounded-xl !bg-white/50 p-4 duration-300 ease-in-out`}
                  onClick={() => setShowAllChains(true)}
                >
                  <Typography
                    size="h4"
                    weight="regular"
                    className="!flex !cursor-pointer !items-center !text-mid-grey !text-center"
                  >
                    +{orderedChains.length - visibleChainsCount}
                  </Typography>
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="flex w-full items-center justify-between rounded-2xl bg-white/50 px-4 py-[10px]">
            <div className="flex flex-grow items-center">
              <Typography size="h4" weight="regular" className="gf-w-full">
                <input
                  ref={inputRef}
                  className="w-full bg-transparent outline-none placeholder:text-mid-grey focus:outline-none"
                  type="text"
                  value={searchInput}
                  placeholder="Search assets"
                  onChange={handleSearch}
                />
              </Typography>
            </div>
            <SearchIcon />
          </div>

          {/* Asset List */}
          <div className="flex h-full flex-col overflow-auto rounded-2xl !bg-white">
            <div className="px-4 pb-2 pt-2">
              <Typography size="h5" weight="medium">
                {selectedChain
                  ? `Assets on ${selectedChain.chainName}`
                  : 'Assets'}
              </Typography>
            </div>
            <GradientScroll
              height={height}
              gradientHeight={42}
              onClose={!isAssetModalOpen}
            >
              {fiatBasedSortedResults && fiatBasedSortedResults.length > 0 ? (
                fiatBasedSortedResults?.map(
                  ({ asset, network, formattedBalance }) => {
                    return (
                      <div
                        key={`${asset.chain}-${asset.symbol}`}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-1.5 hover:bg-[#f4f0fc]"
                        onClick={() => handleAssetSelect(asset)}
                      >
                        <div className="flex w-full items-center gap-2">
                          <div className={`w-10`}>
                            <TokenNetworkLogos
                              tokenLogo={asset.icon}
                              chainLogo={network?.iconUrl}
                            />
                          </div>
                          <Typography
                            className={`w-2/3`}
                            size={'h5'}
                            breakpoints={{ sm: 'h4' }}
                            weight="regular"
                          >
                            {asset.name}
                          </Typography>
                        </div>
                        <div className="flex items-center gap-1">
                          {formattedBalance && (
                            <Typography
                              size={'h5'}
                              breakpoints={{
                                sm: 'h4',
                              }}
                              weight="regular"
                              className={`!text-mid-grey`}
                            >
                              {formattedBalance}
                            </Typography>
                          )}
                          <Typography
                            size={'h5'}
                            breakpoints={{
                              sm: 'h4',
                            }}
                            weight="regular"
                            className={`!text-mid-grey`}
                          >
                            {asset.symbol}
                          </Typography>
                        </div>
                      </div>
                    );
                  },
                )
              ) : (
                <div className="flex min-h-[274px] w-full items-center justify-center">
                  <Typography size="h4" weight="regular">
                    No assets found.
                  </Typography>
                </div>
              )}
            </GradientScroll>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default AssetModal;
