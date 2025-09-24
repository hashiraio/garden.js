import React from 'react';
import { Typography } from '@gardenfi/garden-book';
import { tabs } from '../constants/constants';
import { swapStore } from '../store/swapStore';
import { useGarden } from '@gardenfi/react-hooks';

export const Header: React.FC = () => {
  const { activeTab, setActiveTab } = swapStore();
  const pillLeft = (activeTab?.index || 0) * (48 + 2);
  const { pendingOrders } = useGarden();

  return (
    <div className={`w-full flex items-center px-2`}>
      <div className="flex items-center gap-2">
        <Typography size="h4" color="#473C75" weight="medium">
          {activeTab?.label}
        </Typography>
      </div>
      <div className="ml-auto relative">
        {pendingOrders.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 z-50 bg-rose rounded-full flex items-center justify-center text-xs font-bold text-white select-none">
            {pendingOrders.length}
          </div>
        )}
        <div
          className="flex justify-center cursor-pointer items-center gap-1 max-w-24 w-24 h-8 rounded-[38px] bg-white/30 relative"
          style={{ position: 'relative' }}
        >
          <span
            className="absolute top-0 left-0 h-full w-12 rounded-full bg-white z-0"
            style={{
              transform: `translateX(${pillLeft}px)`,
              transition: 'transform 0.3s ease-in-out',
            }}
          />
          {Object.entries(tabs).map(([key, { Icon, id }]) => {
            return (
              <button
                key={key}
                className={`relative flex items-center justify-center px-4 py-1.5 w-12 rounded-[38px] overflow-hidden z-10 text-dark-grey h-full`}
                onClick={() => setActiveTab(tabs[id])}
                type="button"
                style={{ position: 'relative' }}
              >
                <Icon className="h-4 w-4 " />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
