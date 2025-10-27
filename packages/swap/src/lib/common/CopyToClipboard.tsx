import React from 'react';
import { CheckIcon, CopyIcon } from '@gardenfi/garden-book';
import { useState, FC } from 'react';

type CopyToClipboardProps = {
  text: string;
};

export const CopyToClipboard: FC<CopyToClipboardProps> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  return copied ? (
    <CheckIcon className="h-3 w-6" />
  ) : (
    <CopyIcon className="h-4 w-4 cursor-pointer" onClick={copyToClipboard} />
  );
};
