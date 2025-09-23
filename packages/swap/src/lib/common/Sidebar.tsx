import React, { useEffect, useRef, FC, useCallback, ReactNode } from 'react';

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export const Sidebar: FC<SidebarProps> = ({ open, onClose, children }) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (sliderRef.current && !sliderRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [handleClickOutside]);

  return (
    <div
      className={`absolute left-0 top-0 z-50 h-full w-full bg-dark-grey transition-colors duration-500 ease-cubic-in-out ${
        open ? 'bg-opacity-40' : 'pointer-events-none bg-opacity-0'
      }`}
    >
      <div
        ref={sliderRef}
        className={`fixed top-0 flex flex-col bg-white/50 backdrop-blur-[20px] ${
          open ? 'right-0' : '-right-[100%]'
        } transition-right scrollbar-hide h-full w-full overflow-y-auto duration-500 ease-cubic-in-out`}
      >
        <div className="flex h-full w-full flex-col gap-5 px-6">{children}</div>
      </div>
    </div>
  );
};
