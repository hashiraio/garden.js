/// <reference types="vite/client" />

declare namespace NodeJS {
    interface ProcessEnv {
        TEST_ENV?: 'staging' | 'testnet' | 'mainnet';
        // Staging environment
        STAGING_BASE_URL?: string;
        STAGING_ETHEREUM_URL?: string;
        STAGING_ARBITRUM_URL?: string;
        STAGING_STARKNET_URL?: string;

        // Testnet environment
        TESTNET_BASE_URL?: string;
        TESTNET_ETHEREUM_URL?: string;
        TESTNET_ARBITRUM_URL?: string;
        TESTNET_STARKNET_URL?: string;

        // Mainnet environment
        MAINNET_BASE_URL?: string;
        MAINNET_ETHEREUM_URL?: string;
        MAINNET_ARBITRUM_URL?: string;
        MAINNET_STARKNET_URL?: string;

        // Credentials
        PRIVATE_KEY?: string;
        BITCOIN_PRIVATE_KEY?: string;
        SUI_PRIVATE_KEY?: string;
        SOLANA_PRIV?: string;
        EVM_ADDRESS?: string;
        STARKNET_ADDRESS?: string;
        SOLANA_ADDRESS?: string;
        SUI_ADDRESS?: string;
        BTC_MAINNET?: string;
        BTC_TESTNET?: string;
        DIGEST_KEY?: string;
        API_KEY?: string;
    }
}

