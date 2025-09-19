import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ParsedAsset, ParsedChainInfo } from '../types/assetTypes';
import { useSwapStore } from '../hooks/store';
import { useAssetStore } from '../hooks/assetStore';
import { ChainsTooltip } from './ChainsToolTip';
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
// Removed modal wrapper from here; parent controls modal rendering

type Props = {
  onSelect: (asset: ParsedAsset) => void;
};

const AssetModal: React.FC<Props> = ({ onSelect }) => {
  const {
    setFilter,
    selectedFrom,
    selectedTo,
    modalOpenFor,
    isAssetModalOpen,
    closeAssetModal,
  } = useSwapStore();
  const { allAssets, chains } = useAssetStore();

  const [selectedChain, setSelectedChain] = useState<
    ParsedChainInfo | undefined
  >();
  const [searchInput, setSearchInput] = useState<string>('');
  const [hoveredChain, setHoveredChain] = useState<string>('');
  const [visibleChainsCount] = useState<number>(7);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showAllChains, setShowAllChains] = useState(false);

  // Simple mobile detection
  const isMobile =
    typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const network = Network.TESTNET; // Default to testnet for now

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
        a.chainDisplayName.toLowerCase().includes(name),
      );
      const indexB = order.findIndex((name) =>
        b.chainDisplayName.toLowerCase().includes(name),
      );
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return sortedChainsByOrder;
  }, [chains]);

  // Filter assets based on search and chain selection
  const filteredAssets = useMemo(() => {
    let assets = allAssets;

    // Filter by chain if selected
    if (selectedChain) {
      assets = assets.filter(
        (asset) => asset.chainId === selectedChain.chainId,
      );
    }

    // Filter by search input
    if (searchInput.trim()) {
      const searchLower = searchInput.toLowerCase();
      assets = assets.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(searchLower) ||
          asset.chainDisplayName.toLowerCase().includes(searchLower),
      );
    }

    // Exclude the other selected asset
    const otherAsset = modalOpenFor === 'from' ? selectedTo : selectedFrom;
    if (otherAsset) {
      assets = assets.filter(
        (asset) => asset.asset.toString() !== otherAsset.asset.toString(),
      );
    }

    return assets;
  }, [
    allAssets,
    selectedChain,
    searchInput,
    modalOpenFor,
    selectedFrom,
    selectedTo,
  ]);

  // Sort assets by chain order and then by symbol
  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
      // First sort by chain order
      const chainA = chains?.find((c) => c.chainId === a.chainId);
      const chainB = chains?.find((c) => c.chainId === b.chainId);

      if (chainA && chainB) {
        const indexA = orderedChains.findIndex(
          (c) => c.chainId === chainA.chainId,
        );
        const indexB = orderedChains.findIndex(
          (c) => c.chainId === chainB.chainId,
        );
        if (indexA !== indexB) {
          return indexA - indexB;
        }
      }

      // Then sort by symbol
      return a.symbol.localeCompare(b.symbol);
    });
  }, [filteredAssets, chains, orderedChains]);

  // Visible chains for the chain selector
  const visibleChains = useMemo(() => {
    return orderedChains.slice(0, visibleChainsCount);
  }, [orderedChains, visibleChainsCount]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    setFilter(value); // Keep the store in sync
  };

  const hideSidebar = () => setShowAllChains(false);

  const handleChainClick = (chain: ParsedChainInfo) => {
    if (selectedChain?.chainId === chain.chainId) {
      setSelectedChain(undefined);
    } else {
      setSelectedChain(chain);
    }
  };

  const handleAssetSelect = (asset: ParsedAsset) => {
    onSelect(asset);
    closeAssetModal();
  };

  const handleClose = () => {
    closeAssetModal();
    // onClose();
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isAssetModalOpen) {
      setSelectedChain(undefined);
      setSearchInput('');
      setFilter('');
      setHoveredChain('');
    }
  }, [isAssetModalOpen, setFilter]);

  // Focus input when modal opens
  useEffect(() => {
    if (isAssetModalOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isAssetModalOpen]);

  return (
    <>
      <AvailableChainsSidebar
        show={showAllChains}
        chains={[...orderedChains]}
        hide={hideSidebar}
        onClick={handleChainClick}
      />
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
          className={`left-auto top-60 z-30 flex flex-col gap-3 rounded-[20px] sm:min-w-[468px] ${
            isMobile ? '' : 'm-1'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-1">
            <Typography size="h4" weight="medium">
              {`Select token to ${modalOpenFor ? 'send' : 'receive'}`}
            </Typography>
            <CloseIcon
              className="hidden cursor-pointer sm:visible sm:block"
              onClick={handleClose}
            />
          </div>

          {/* Chain Filter */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-wrap gap-2">
              {visibleChains.map((chain, index) => (
                <button
                  key={chain.chainId}
                  className={`relative flex h-10 flex-1 min-w-0 items-center justify-center gap-2 rounded-xl border transition-all duration-200 ${
                    selectedChain?.chainId === chain.chainId
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                  onMouseEnter={() => setHoveredChain(chain.chainDisplayName)}
                  onMouseLeave={() => setHoveredChain('')}
                  onClick={() => handleChainClick(chain)}
                >
                  <img
                    src={chain.iconUrl}
                    alt={chain.chainDisplayName}
                    className="w-4 h-4 rounded-full flex-shrink-0"
                  />
                  <span className="text-xs font-medium truncate">
                    {chain.chainDisplayName.split(' ')[0]}
                  </span>
                  {hoveredChain === chain.chainDisplayName && (
                    <ChainsTooltip
                      chain={chain.chainDisplayName}
                      className={`${
                        network === Network.TESTNET
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
                  className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowAllChains(true)}
                >
                  <Typography size="h5" weight="regular">
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
          <div className="max-h-80 overflow-hidden">
            <GradientScroll height={272} gradientHeight={42}>
              <div className="p-2">
                <div className="mb-2 px-2">
                  <Typography
                    size="h5"
                    weight="medium"
                    className="text-gray-700"
                  >
                    {selectedChain
                      ? `Assets on ${selectedChain.chainDisplayName}`
                      : 'All Assets'}
                  </Typography>
                </div>

                {sortedAssets.length > 0 ? (
                  <div className="space-y-1">
                    {sortedAssets.map((asset) => (
                      <button
                        key={asset.asset.toString()}
                        onClick={() => handleAssetSelect(asset)}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 flex-shrink-0">
                            <TokenNetworkLogos
                              tokenLogo={asset.iconUrl}
                              chainLogo={
                                chains?.find((c) => c.chainId === asset.chainId)
                                  ?.iconUrl
                              }
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Typography
                              size="h5"
                              weight="medium"
                              className="text-gray-900 truncate"
                            >
                              {asset.symbol}
                            </Typography>
                            <Typography
                              size="h6"
                              weight="regular"
                              className="text-gray-500 truncate"
                            >
                              {asset.chainDisplayName}
                            </Typography>
                          </div>
                        </div>

                        <div className="flex flex-col items-end flex-shrink-0">
                          {asset.priceUsd > 0 && (
                            <Typography
                              size="h6"
                              weight="regular"
                              className="text-gray-500"
                            >
                              ${asset.priceUsd.toFixed(2)}
                            </Typography>
                          )}
                          <Typography
                            size="h6"
                            weight="regular"
                            className="text-gray-400"
                          >
                            {asset.decimals} decimals
                          </Typography>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Typography
                        size="h5"
                        weight="regular"
                        className="text-gray-500 mb-2"
                      >
                        No assets found
                      </Typography>
                      <Typography
                        size="h6"
                        weight="regular"
                        className="text-gray-400"
                      >
                        Try adjusting your search or chain filter
                      </Typography>
                    </div>
                  </div>
                )}
              </div>
            </GradientScroll>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default AssetModal;
