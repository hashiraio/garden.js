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
import { formatAmount } from '../utils/utils';

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

  // Visible chains for the chain selector (ensure selected chain is included)
  const visibleChains = useMemo(() => {
    const base = orderedChains.slice(0, visibleChainsCount);
    if (
      selectedChain &&
      !base.find((c) => c.chainId === selectedChain.chainId)
    ) {
      return [selectedChain, ...base.slice(0, visibleChainsCount - 1)];
    }
    return base;
  }, [orderedChains, visibleChainsCount, selectedChain]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    setFilter(value); // Keep the store in sync
  };

  const hideSidebar = () => setShowAllChains(false);

  const handleChainClick = (chain: ParsedChainInfo) => {
    if (selectedChain?.chainId === chain.chainId) setSelectedChain(undefined);
    else setSelectedChain(chain);
    setShowAllChains(false);
  };

  const handleAssetSelect = (asset: ParsedAsset) => {
    onSelect(asset);
    closeAssetModal();
    setShowAllChains(false);
  };

  const handleClose = () => {
    closeAssetModal();
    // onClose();
    setShowAllChains(false);
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
          <div className="flex w-full flex-wrap gap-3">
            <div className={`flex w-full ${isMobile ? 'gap-2' : 'gap-3'}`}>
              {visibleChains.map((chain, index) => (
                <button
                  key={chain.chainId}
                  className={`relative flex h-12 flex-1 items-center justify-center gap-2 overflow-visible rounded-xl outline-none duration-300 ease-in-out ${
                    !selectedChain || chain.chainId !== selectedChain.chainId
                      ? '!bg-white/50'
                      : '!bg-white'
                  }`}
                  onMouseEnter={() => setHoveredChain(chain.chainDisplayName)}
                  onMouseLeave={() => setHoveredChain('')}
                  onClick={() =>
                    selectedChain && chain.chainId === selectedChain.chainId
                      ? setSelectedChain(undefined)
                      : setSelectedChain(chain)
                  }
                >
                  <img
                    src={chain.iconUrl}
                    alt={chain.chainDisplayName}
                    className="h-5 w-5 rounded-full"
                  />
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
          <div className="flex h-[316px] flex-col overflow-auto rounded-2xl !bg-white">
            <div className="px-4 pb-2 pt-2">
              <Typography size="h5" weight="medium">
                {selectedChain
                  ? `Assets on ${selectedChain.chainDisplayName}`
                  : 'Assets'}
              </Typography>
            </div>
            <GradientScroll
              height={272}
              gradientHeight={42}
              onClose={!isAssetModalOpen}
            >
              {sortedAssets.length > 0 ? (
                <div className="space-y-1">
                  {sortedAssets.map((asset) => (
                    <button
                      key={asset.asset.toString()}
                      onClick={() => handleAssetSelect(asset)}
                      className="flex w-full cursor-pointer items-center justify-between !gap-2 !px-4 !py-1.5 hover:bg-[#f4f0fc]"
                    >
                      <div className="flex w-full items-center justify-start gap-2">
                        <div className={`w-10`}>
                          <TokenNetworkLogos
                            tokenLogo={asset.iconUrl}
                            chainLogo={
                              chains?.find((c) => c.chainId === asset.chainId)
                                ?.iconUrl
                            }
                          />
                        </div>
                        <Typography
                          className={`w-2/3 !text-start`}
                          size={'h5'}
                          breakpoints={{ sm: 'h4' }}
                          weight="regular"
                        >
                          {asset.symbol}
                        </Typography>
                      </div>
                      <div className="flex items-center gap-1">
                        {asset.priceUsd && (
                          <Typography
                            size={'h5'}
                            breakpoints={{
                              sm: 'h4',
                            }}
                            weight="regular"
                            className={`!text-mid-grey`}
                          >
                            {formatAmount(
                              Number(asset.priceUsd),
                              0,
                              Math.min(asset.decimals, 8),
                            )}
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
                    </button>
                  ))}
                </div>
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
