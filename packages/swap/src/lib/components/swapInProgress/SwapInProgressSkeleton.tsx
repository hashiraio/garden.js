import React from 'react';
export const SwapInProgressSkeleton = () => {
  return (
    <div className="flex animate-pulse flex-col gap-3 p-3">
      <div className="flex items-center justify-between p-1">
        <div className="h-6 w-24 rounded bg-gray-200" />
      </div>
      <div className="h-20 rounded-2xl bg-gray-200" />
      <div className="h-16 rounded-2xl bg-gray-200" />
      <div className="h-12 rounded-2xl bg-gray-200" />
    </div>
  );
};
