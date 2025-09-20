import { describe, expect, it } from 'vitest';
import { Assets } from './asset';

describe('Asset', () => {
  it('should be defined', () => {
    console.log('Chains config :', Assets);
    expect(Assets).toBeDefined();
  });
});
