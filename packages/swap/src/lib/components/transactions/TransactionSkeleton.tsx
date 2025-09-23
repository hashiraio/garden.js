import React, { FC } from 'react';
import { motion } from 'framer-motion';

export const TransactionsSkeleton: FC = () => {
  const renderSkeletonRow = () => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-4">
        <div className="h-5 w-24 animate-pulse rounded-md bg-gray-200" />
        <div className="h-5 w-6 animate-pulse rounded-full bg-gray-200" />
        <div className="h-5 w-24 animate-pulse rounded-md bg-gray-200" />
      </div>
      <div className="flex justify-between">
        <div className="h-4 w-28 animate-pulse rounded-md bg-gray-200" />
        <div className="h-4 w-20 animate-pulse rounded-md bg-gray-200" />
      </div>
    </div>
  );

  return (
    <motion.div layout className="flex flex-col">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className={`bg-white/50 p-4 ${index === 3 ? 'rounded-b-2xl' : ''}`}
        >
          {renderSkeletonRow()}
        </div>
      ))}
    </motion.div>
  );
};
