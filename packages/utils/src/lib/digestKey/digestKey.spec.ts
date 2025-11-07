import { describe, expect, it } from 'vitest';
import { DigestKey } from './digestKey';
import { getConfig } from '../config';

describe('DigestKey', () => {
  const config = getConfig();

  it('should be able to create a digest key', () => {
    const testDigestKey = config.digestKey;
    const digestKey = DigestKey.from(testDigestKey);
    expect(digestKey.val).toBeDefined();
    expect(digestKey.error).toBeUndefined();
    expect(digestKey.val?.digestKey).toBeTypeOf('string');
  });

  it('should not be able to create a digest key', () => {
    const digestKey = DigestKey.from('0xgardenfi');
    expect(digestKey.error).toBeDefined();
  });

  it('should be able to generate a random digest key', () => {
    const digestKey = DigestKey.generateRandom();
    expect(digestKey.val).toBeDefined();
    expect(digestKey.error).toBeUndefined();
    expect(digestKey.val?.digestKey).toBeTypeOf('string');
    expect(digestKey.val?.userId).toBeTypeOf('string');
  });

  it('should be able to create a digest key from config', () => {
    if (config.digestKey) {
      const digestKey = DigestKey.from(config.digestKey);
      expect(digestKey.val).toBeDefined();
      expect(digestKey.error).toBeUndefined();
      expect(digestKey.val?.digestKey).toBeTypeOf('string');
      expect(digestKey.val?.userId).toBeTypeOf('string');
    } else {
      console.log('No digest key found in config, skipping test');
    }
  });

  it('should validate digest key format correctly', () => {
    // Test with config digest key if available
    if (config.digestKey) {
      const digestKey = DigestKey.from(config.digestKey);
      expect(digestKey.val).toBeDefined();
      expect(digestKey.error).toBeUndefined();
    }

    // Test with invalid format
    const invalidDigestKey = DigestKey.from('invalid-key');
    expect(invalidDigestKey.error).toBeDefined();
  });
});
