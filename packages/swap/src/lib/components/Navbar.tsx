import React, { useState } from 'react';
import {
  SwapHorizontalIcon,
  BlogIcon,
  Typography,
} from '@gardenfi/garden-book';
import { TabKey } from '../types/types';

type NavbarProps = {
  active?: TabKey;
  onChange?: (key: TabKey) => void;
  className?: string;
};

const tabs: Array<{
  key: TabKey;
  label: string;
  Icon: React.ComponentType<any>;
}> = [
  { key: 'swap', label: 'Swap', Icon: SwapHorizontalIcon },
  { key: 'history', label: 'History', Icon: BlogIcon },
];

export const Navbar: React.FC<NavbarProps> = ({
  active = 'swap',
  onChange,
  className,
}) => {
  const [current, setCurrent] = useState<TabKey>(active);

  function handleSelect(key: TabKey) {
    setCurrent(key);
    onChange?.(key);
  }

  const activeTab = tabs.find((t) => t.key === current);

  const tabWidth = 48;
  const tabGap = 2;
  const activeIndex = tabs.findIndex((t) => t.key === current);
  const pillLeft = activeIndex * (tabWidth + tabGap);

  return (
    <div className={`w-full flex items-center px-2 ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        <Typography size="h4" color="#473C75" weight="medium">
          {activeTab && <>{activeTab.label}</>}
        </Typography>
      </div>
      <div className="ml-auto relative">
        <div
          className="flex justify-center items-center gap-1 max-w-24 w-24 h-8 rounded-[38px] bg-white/30 relative"
          style={{ position: 'relative' }}
        >
          {/* Smooth pill, no entrance animation, no spring, just CSS transition */}
          <span
            className="absolute top-0 left-0 h-full w-12 rounded-full bg-white z-0"
            style={{
              transform: `translateX(${pillLeft}px)`,
              transition: 'transform 0.3s ease-in-out',
            }}
          />
          {tabs.map(({ key, Icon }) => {
            const isActive = current === key;
            return (
              <button
                key={key}
                className={`relative flex items-center justify-center px-4 py-1.5 w-12 rounded-[38px] overflow-hidden z-10 text-dark-grey h-full`}
                onClick={() => handleSelect(key)}
                disabled={isActive}
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
