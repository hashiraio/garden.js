import React from 'react';
import { Typography } from '@gardenfi/garden-book';
import { Tab } from '../types/types';
import { tabs } from '../constants/constants';

type NavbarProps = {
  activeTab?: Tab;
  onChange?: React.Dispatch<React.SetStateAction<Tab>>;
};

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onChange }) => {
  const toggle = () => {
    onChange?.((p: Tab) => (p.id === tabs.swap.id ? tabs.history : tabs.swap));
  };

  const pillLeft = (activeTab?.index || 0) * (48 + 2);

  return (
    <div className={`w-full flex items-center px-2`}>
      <div className="flex items-center gap-2">
        <Typography size="h4" color="#473C75" weight="medium">
          {activeTab?.label}
        </Typography>
      </div>
      <div className="ml-auto relative">
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
          {Object.entries(tabs).map(([key, { Icon }]) => {
            return (
              <button
                key={key}
                className={`relative flex items-center justify-center px-4 py-1.5 w-12 rounded-[38px] overflow-hidden z-10 text-dark-grey h-full`}
                onClick={toggle}
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
