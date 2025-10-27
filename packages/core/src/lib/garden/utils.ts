import { ApiKey, DigestKey } from '@gardenfi/utils';

export const resolveDigestKey = (digestKey: string | DigestKey | undefined) => {
  if (!digestKey) return undefined;
  if (typeof digestKey === 'string') {
    const _digestKey = DigestKey.from(digestKey);
    if (!_digestKey.ok) throw new Error(_digestKey.error);
    return _digestKey.val;
  } else {
    return digestKey;
  }
};

export const resolveApiKey = (apiKey: string | ApiKey) => {
  if (typeof apiKey === 'string') {
    return new ApiKey(apiKey);
  } else {
    return apiKey;
  }
};
