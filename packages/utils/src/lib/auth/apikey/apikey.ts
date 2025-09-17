import { AsyncResult, Err, Ok, Result } from '../../result/result';
import { AuthHeaderEnum, AuthHeader, IAuth } from '../auth.types';

export class ApiKey implements IAuth {
  private readonly _apiKey: string;

  constructor(apiKey: string) {
    this._apiKey = apiKey;
  }

  async getToken(): AsyncResult<string, string> {
    const verify = this.verifyToken();
    if (verify.error) return Err(verify.error);

    if (verify.val) return Ok(this._apiKey);

    return Err('Token verification failed');
  }

  verifyToken(): Result<boolean, string> {
    if (this._apiKey.length === 64) {
      return Ok(true);
    }
    return Err('Invalid API key length');
  }

  private decodeBase64UrlSafe(base64Url: string) {
    // Convert from URL-safe Base64 to standard Base64
    let base64 = base64Url.replace(/_/g, '/').replace(/-/g, '+');

    // Ensure proper padding
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    // Decode Base64
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  private extractData(bytes: Uint8Array) {
    const DELIMITER = new TextEncoder().encode('::'); // Adjust if needed

    // Find the delimiter position
    const delimiterPos = bytes.findIndex((_, i) =>
      bytes.slice(i, i + DELIMITER.length).every((b, j) => b === DELIMITER[j]),
    );

    if (delimiterPos === -1) {
      return Err('Invalid format: delimiter not found');
    }

    // Extract expiry timestamp (first 8 bytes)
    const expiryBytes = bytes.slice(0, 8);
    const expiryTimestamp = new DataView(expiryBytes.buffer).getBigUint64(
      0,
      false,
    );

    // Extract signature (bytes after delimiter)
    const sigBytes = bytes.slice(delimiterPos + DELIMITER.length);

    return Ok({
      expiryTimestamp: new Date(Number(expiryTimestamp) * 1000),
      signature: Array.from(sigBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
    });
  }

  async getAuthHeaders(): AsyncResult<AuthHeader, string> {
    const token = await this.getToken();
    if (token.ok) return Ok({ [AuthHeaderEnum.ApiKey]: token.val });

    return Err(token.error ?? 'Failed to get auth token');
  }
}
