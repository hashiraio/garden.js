import { jwtDecode } from 'jwt-decode';

export const with0x = (str: string): `0x${string}` => {
  if (str.startsWith('0x')) return str as `0x${string}`;
  return `0x${str}`;
};

/**
 * Includes `Bearer ` in the Authorization header
 * @param authToken
 * @returns Authorization header
 */
export const Authorization = (authToken: string) => `Bearer ${authToken}`;

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const parseJwt = <T>(token: string): T | undefined => {
  try {
    return jwtDecode(token) as T;
  } catch {
    return;
  }
};

export enum Network {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  LOCALNET = 'localnet',
}

export enum Environment {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  LOCALNET = 'localnet',
}

export const add0x = (str: string): `0x${string}` => {
  if (str.startsWith('0x')) return str as `0x${string}`;
  return `0x${str}`;
};

export function hexToU32Array(
  hexString: string,
  endian: 'big' | 'little' = 'big',
): number[] {
  hexString = hexString.replace('0x', '');

  if (hexString.length !== 64) {
    throw new Error('Invalid hash length');
  }

  const result: number[] = [];

  for (let i = 0; i < 8; i++) {
    const chunk = hexString.slice(i * 8, (i + 1) * 8);

    const bytes = chunk.match(/.{2}/g)!;

    if (endian === 'little') {
      bytes.reverse();
    }

    const finalHex = bytes.join('');
    result.push(parseInt(finalHex, 16));
  }

  return result;
}

export function trim0x(str: string) {
  if (str.startsWith('0x')) return str.slice(2);
  return str;
}

export const hasKeys = (obj: any, keys: string[]) =>
  obj && typeof obj === 'object' && keys.every((k) => k in obj);
