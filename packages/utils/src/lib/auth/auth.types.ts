import { AsyncResult, Result } from '../result/result';
import { IStore } from '../store/store.interface';

export type SiweOpts = {
  domain?: string;
  store?: IStore;
  signingStatement?: string;
};

export enum AuthHeaderEnum {
  Authorization = 'Authorization',
  ApiKey = 'garden-app-id',
}

export type AuthHeader =
  | Record<AuthHeaderEnum.ApiKey, string>
  | Record<AuthHeaderEnum.Authorization, string>;

export interface IAuth {
  /**
   * Get a token from store if available or fetch from the wallet
   * @returns verified token
   */
  getToken(): AsyncResult<string, string>;
  /**
   * Verify the token expiry and account
   * @param token The token to verify
   * @param account The account to verify the token against
   */
  verifyToken(token: string, account: string): Result<boolean, string>;

  /**
   * Retrieves the authentication token and formats it into the appropriate header object.
   * Example: For API keys, returns { 'api-key': apiKey }
   * Example: For SIWE, returns { Authorization: 'Bearer token' }
   * @returns An AsyncResult containing the formatted auth header object or an error message
   */
  getAuthHeaders(): AsyncResult<AuthHeader, string>;
}
