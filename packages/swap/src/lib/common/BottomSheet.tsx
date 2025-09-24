import React from 'react';
import { FC, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const BottomSheet: FC<{
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
}> = ({ open, onClose, children }) => {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };
  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: '0%' }}
          exit={{
            opacity: 0,
            x: '100%',
          }}
          transition={{
            type: 'spring',
            stiffness: 250,
            damping: 30,
          }}
          className="absolute top-0 left-0 p-3 w-full h-full bg-white/50 backdrop-blur-md rounded-t-2xl z-[99]"
          onClick={(e) => {
            handleOverlayClick(e);
            e.stopPropagation();
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
