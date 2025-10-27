import { existsSync } from 'fs';
import { join } from 'path';

export interface TestConfig {
  EVM_PRIVATE_KEY: string;
  EVM_PRIVATE_KEY_2: string;
  STARKNET_PRIVATE_KEY: string;
  STARKNET_ADDRESS: string;
  SOLANA_PRIV: number[];
  SUI_PRIVATE_KEY: string;
  BITCOIN_PRIVATE_KEY: string;
  BITCOIN_MNEMONIC: string;
  API_KEY: string;
  TEST_RPC_URL: string;
  TEST_ORDERBOOK_STAGE: string;
  TEST_STAGE_AUTH: string;
  TEST_STAGE_QUOTE: string;
  TEST_STAGE_EVM_RELAY: string;
  TEST_SOLANA_RELAY: string;
  TEST_RELAY_URL: string;
}

let config: TestConfig | null = null;

/**
 * Loads the test configuration from test.config.ts
 * @returns The test configuration object
 * @throws Error if configuration file is missing or invalid
 */
export function loadTestConfig(): TestConfig {
  if (config) {
    return config;
  }

  const configPath = join(process.cwd(), 'test.config.ts');

  if (!existsSync(configPath)) {
    throw new Error(`
Test configuration file not found!

Please create a test.config.ts file by copying the template:
1. Copy test.config.template.ts to test.config.ts
2. Fill in your actual test values
3. Make sure test.config.ts is in your .gitignore

Template location: ${join(process.cwd(), 'test.config.template.ts')}
Expected config location: ${configPath}
    `);
  }

  try {
    // Clear require cache to ensure fresh import
    delete require.cache[require.resolve(configPath)];
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const configModule = require(configPath);
    config = configModule.TEST_CONFIG;

    if (!config) {
      throw new Error('TEST_CONFIG export not found in test.config.ts');
    }

    return config;
  } catch (error) {
    throw new Error(
      `Failed to load test configuration: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

/**
 * Gets a specific configuration value with optional fallback
 * @param key The configuration key
 * @param fallback Optional fallback value
 * @returns The configuration value or fallback
 */
export function getTestConfigValue<K extends keyof TestConfig>(
  key: K,
  fallback?: TestConfig[K],
): TestConfig[K] {
  const config = loadTestConfig();
  const value = config[key];

  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(
      `Test configuration value for '${key}' is missing or empty`,
    );
  }

  return value;
}

/**
 * Resets the cached configuration (useful for testing)
 */
export function resetTestConfig(): void {
  config = null;
}
