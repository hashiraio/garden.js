import { Retry } from './../retry';
import { safeParseJson } from './safeParseJson';

export class Fetcher {
  private static async _postWithFallback<T>(
    input: string[],
    init?: RequestInit,
  ): Promise<T> {
    let err = '';
    for (const url of input) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          ...init,
        });
        if (res.status >= 500) {
          err = await (res.text() || res.json());
          continue;
        }
        return await this.parse<T>(res);
      } catch (error) {
        err = parseError(error);
        continue;
      }
    }
    throw new Error(err || 'All APIs failed');
  }

  /**
   * Asynchronously sends a POST request to multiple URLs with fallback logic.
   *
   * @param {string[]} input - array of URLs to send the POST request to
   * @param {RequestInit} [init] - optional request initialization options
   * @return {Promise<T>} a Promise that resolves to the parsed response data
   */
  static async postWithFallback<T>(
    input: string[],
    init?: Request,
  ): Promise<T> {
    return await defaultRetrier(init).retry(() =>
      this._postWithFallback(input, init),
    );
  }

  private static async _getWithFallback<T>(
    input: string[],
    init?: RequestInit,
  ): Promise<T> {
    let err = '';
    for (const url of input) {
      try {
        const res = await fetch(url, init);

        if (res.status >= 500) {
          err = await (res.text() || res.json());
          continue;
        }
        return await this.parse<T>(res);
      } catch (error) {
        err = parseError(error);
        continue;
      }
    }
    throw new Error(err || 'All APIs failed');
  }

  /**
   * Asynchronously sends a POST request to multiple URLs with fallback mechanism.
   *
   * @param {string[]} input - An array of URLs to retrieve data from.
   * @param {RequestInit} [init] - Optional request options.
   * @return {Promise<T>} A promise that resolves to the retrieved data.
   */
  static async getWithFallback<T>(input: string[], init?: Request): Promise<T> {
    return await defaultRetrier(init).retry(() =>
      this._getWithFallback(input, init),
    );
  }

  private static async _get<T>(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<T> {
    return await this.parse<T>(await fetch(input, init));
  }

  /**
   * Asynchronously retrieves data of type T from the specified URL or RequestInfo, with optional initialization options.
   *
   * @param {RequestInfo | URL} input - The URL or RequestInfo to fetch data from
   * @param {RequestInit} init - Optional initialization options for the fetch request
   * @return {Promise<T>} The retrieved data of type T
   */
  static async get<T>(input: RequestInfo | URL, init?: Request): Promise<T> {
    return await defaultRetrier(init).retry(() => this._get(input, init));
  }

  private static async _post<T>(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<T> {
    return await this.parse<T>(
      await fetch(input, {
        method: 'POST',
        ...init,
      }),
    );
  }

  /**
   * Asynchronously sends a POST request to the specified URL or RequestInfo, with optional initialization options.
   */
  static async post<T>(input: RequestInfo | URL, init?: Request): Promise<T> {
    return await defaultRetrier(init).retry(() => this._post(input, init));
  }

  private static async _patch<T>(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<T> {
    return await this.parse<T>(
      await fetch(input, {
        method: 'PATCH',
        ...init,
      }),
    );
  }

  static async patch<T>(input: RequestInfo | URL, init?: Request): Promise<T> {
    return await defaultRetrier(init).retry(() => this._patch(input, init));
  }

  /**
   * Parses the response and returns the result as the specified type.
   *
   * @param {Response} res - the response object to be parsed
   * @return {Promise<T>} the parsed result of type T
   */
  private static async parse<T>(res: Response): Promise<T> {
    const resText = await res.text();
    if (res.status >= 200 && res.status < 300) {
      return safeParseJson(resText) as T;
    }
    throw new Error(resText);
  }
}

export type Request = RequestInit & {
  retryCount?: number;
  retryDelay?: number;
};

function parseError(error: any): string {
  return error?.message || error?.toString() || 'unknown error';
}

const defaultRetrier = (init?: Request) =>
  new Retry(init?.retryCount ?? 2, init?.retryDelay ?? 1000);
