import React from 'react';

import { useId, useRef, ChangeEvent, useMemo } from 'react';
import { Typography } from '@gardenfi/garden-book';
import { isBitcoin } from '@gardenfi/orderbook';
import { AnimatePresence, motion } from 'motion/react';
import { validateBTCAddress } from '@gardenfi/core';
import { Environment } from '@gardenfi/utils';
// import { useBitcoinWallet } from '@gardenfi/wallet-connectors';
import { swapStore } from '../../store/swapStore';

export const InputAddress = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const tooltipId = useId();
  const {
    inputAsset,
    btcAddress: storedBtcAddress,
    setBtcAddress,
    currentNetwork,
    showBtcAddress,
  } = swapStore();

  // const { account: walletBtcAddress } = useBitcoinWallet();
  const walletBtcAddress = '';

  const isRecoveryAddress = useMemo(
    () => !!(inputAsset && isBitcoin(inputAsset.chain)),
    [inputAsset],
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    // Allow alphanumeric characters and common Bitcoin address characters
    if (!/^[a-zA-Z0-9]$/.test(input.at(-1) || '')) {
      input = input.slice(0, -1);
    }
    setBtcAddress(input);
  };

  // Use stored address if available, otherwise use wallet address
  const displayAddress = storedBtcAddress || walletBtcAddress || '';

  // Validate Bitcoin address
  const isValidAddress = useMemo(() => {
    if (!storedBtcAddress) return true; // Empty is valid (not required yet)
    return validateBTCAddress(
      storedBtcAddress,
      currentNetwork as unknown as Environment,
    );
  }, [storedBtcAddress, currentNetwork]);

  return (
    <AnimatePresence mode="wait">
      {showBtcAddress && (
        <motion.div
          variants={{
            hidden: {
              opacity: 0,
              height: 0,
              pointerEvents: 'none' as const,
              transition: {
                duration: 0.3,
                ease: 'easeOut',
                height: { duration: 0.2, ease: 'easeOut' },
              },
            },
            visible: {
              opacity: 1,
              height: 'auto',
              pointerEvents: 'auto' as const,
              transition: {
                duration: 0.3,
                ease: 'easeOut',
                height: { duration: 0.2, ease: 'easeOut' },
              },
            },
            exit: {
              opacity: 0,
              height: 0,
              pointerEvents: 'none' as const,
              transition: {
                duration: 0.3,
                ease: 'easeOut',
                opacity: { duration: 0.2, ease: 'easeOut' },
              },
            },
          }}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="mt-3"
        >
          <div className="flex flex-col gap-2 rounded-2xl bg-white p-4">
            <Typography
              data-tooltip-id={isRecoveryAddress ? tooltipId : ''}
              size="h5"
              weight="medium"
              onClick={() => inputRef.current!.focus()}
              className="w-fit"
            >
              {isRecoveryAddress ? 'Refund' : 'Receive'} address
            </Typography>
            <Typography size="h3" weight="regular">
              <input
                ref={inputRef}
                className={`w-full outline-none placeholder:text-mid-grey ${
                  !isValidAddress && storedBtcAddress ? 'text-red-500' : ''
                }`}
                type="text"
                value={displayAddress}
                placeholder="Your Bitcoin address"
                onChange={handleChange}
              />
              {/* {isRecoveryAddress && (
                <Tooltip
                  id={tooltipId}
                  place="right"
                  content="In case your swap expires, your Bitcoin will be automatically refunded to this address."
                  multiline={true}
                />
              )} */}
            </Typography>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
