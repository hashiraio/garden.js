import React from 'react';
import { ParsedChainInfo } from '../types/assetTypes';
import {
  ArrowLeftIcon,
  GradientScroll,
  SearchIcon,
  Typography,
} from '@gardenfi/garden-book';
import { AnimatePresence, motion } from 'framer-motion';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { viewPortStore } from '../hooks/viewPortStore';

type SidebarProps = {
  show: boolean;
  chains: ParsedChainInfo[];
  hide: () => void;
  onClick: (chain: ParsedChainInfo) => void;
};

export const AvailableChainsSidebar = ({
  show,
  chains,
  hide,
  onClick,
}: SidebarProps) => {
  const [input, setInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = viewPortStore();

  const animationConfig = {
    initial: { x: '100%', opacity: 0 },
    animate: {
      x: show ? 0 : '100%',
      opacity: show ? 1 : 0,
    },
    transition: {
      type: 'tween',
      ease: 'easeInOut',
      stiffness: 200,
      damping: 25,
      mass: 0.8,
      duration: 0.4,
    },
  };

  const mobileAnimationConfig = {
    initial: { y: '100%', opacity: 0 },
    animate: {
      y: show ? 0 : '100%',
      opacity: show ? 1 : 0,
    },
    transition: {
      type: 'tween',
      ease: 'easeInOut',
      stiffness: 200,
      damping: 25,
      mass: 0.8,
      duration: 0.4,
    },
  };

  const filteredChains = useMemo(() => {
    if (!input)
      return chains.sort((a, b) =>
        a.chainDisplayName.localeCompare(b.chainDisplayName),
      );
    return chains
      .filter((c) =>
        c.chainDisplayName.toLowerCase().includes(input.toLowerCase()),
      )
      .sort((a, b) => a.chainDisplayName.localeCompare(b.chainDisplayName));
  }, [chains, input]);

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <AnimatePresence>
      <motion.div
        {...(isMobile ? mobileAnimationConfig : animationConfig)}
        className={`absolute left-0 top-0 z-50 w-full rounded-[16px] p-3 ${
          isMobile ? 'pt-7' : ''
        }`}
      >
        <div className="transition-left left-auto top-60 z-40 m-1 flex w-full flex-col gap-3 pr-2 duration-700 ease-cubic-in-out">
          <div className="flex items-center justify-between p-1">
            <Typography size="h4" weight="medium">
              Select chain
            </Typography>
            <ArrowLeftIcon onClick={hide} className="cursor-pointer" />
          </div>
          <div className="flex w-full items-center justify-between rounded-2xl bg-white/50 px-4 py-[10px]">
            <div className="flex flex-grow items-center">
              <Typography size="h4" weight="medium" className="gf-w-full">
                <input
                  ref={inputRef}
                  className="w-full bg-transparent outline-none placeholder:text-mid-grey focus:outline-none"
                  type="text"
                  value={input}
                  placeholder="Search chains"
                  onChange={handleSearch}
                />
              </Typography>
            </div>
            <SearchIcon />
          </div>
          <div
            className={`flex h-full max-h-[388px] flex-col overflow-auto rounded-2xl bg-white`}
          >
            <GradientScroll
              height={isMobile ? 384 : 376}
              gradientHeight={42}
              className="rounded-2xl"
            >
              <div className="flex w-full flex-col pb-2 pt-2">
                {filteredChains.length > 0 ? (
                  filteredChains.map((c) => {
                    return (
                      <div
                        key={c.chainId}
                        className="flex w-full cursor-pointer items-center justify-between hover:bg-off-white"
                        onClick={() => onClick(c)}
                      >
                        <div className="flex w-full items-center gap-4 px-[14px] py-2">
                          <img
                            src={c.iconUrl}
                            alt={c.chainDisplayName}
                            className={`h-5 w-5 rounded-full`}
                          />
                          <Typography
                            size={'h5'}
                            breakpoints={{ sm: 'h4' }}
                            weight="regular"
                          >
                            {c.chainDisplayName}
                          </Typography>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex min-h-[334px] w-full items-center justify-center">
                    <Typography
                      size="h4"
                      weight="medium"
                      className="text-center text-mid-grey"
                    >
                      No chains found.
                    </Typography>
                  </div>
                )}
              </div>
            </GradientScroll>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
