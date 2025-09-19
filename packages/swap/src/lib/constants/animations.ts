import { Variants } from 'motion/react';

export const delayedFadeAnimation: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
};

export const expandWithDelayAnimation: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: 'auto',
    transition: {
      duration: 0.4,
      opacity: { delay: 0.23, ease: 'easeOut' },
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.2,
      height: { delay: 0.23, ease: 'easeOut' },
      ease: 'easeOut',
    },
  },
};

export const detailsExpandAnimation: Variants = {
  hidden: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    transition: { duration: 0.3, delay: 0.2, ease: 'easeOut' },
  },
  visible: {
    opacity: 1,
    height: 'auto',
    marginTop: '12px',
    pointerEvents: 'auto',
    transition: { duration: 0.3, delay: 0.2, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    transition: { duration: 0.3, delay: 0.2, ease: 'easeOut' },
  },
};

export const addressExpandAnimation: Variants = {
  hidden: {
    opacity: 0,
    height: 0,
    marginBottom: '0',
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
    marginBottom: '12px',
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
    marginBottom: '0',
    pointerEvents: 'none' as const,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
      opacity: { duration: 0.2, ease: 'easeOut' },
    },
  },
};

export const expandAnimation: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: 'auto',
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.15,
      ease: 'easeInOut',
    },
  },
};
