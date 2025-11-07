export type Testenvironment = 'staging' | 'testnet' | 'mainnet';

export interface Config {
    baseUrl: string;
    ethereum: string;
    arbitrum: string;
    starknet: string;
    privkey: string;
    bitcoinPrivateKey: string;
    suiPrivateKey: string;
    solanaPrivateKey: string;
    evmAddress: string;
    starknetAddress: string;
    solanaAddress: string;
    suiAddress: string;
    bitcoinMainnetAddress: string;
    bitcoinTestnetAddress: string;
    digestKey: string;
    apiKey: string;
}

const environments = {
    staging: {
        baseUrl: process.env.STAGING_BASE_URL ?? 'https://testnet.api.hashira.io',
        ethereum: process.env.STAGING_ETHEREUM_URL ?? 'https://eth-sepolia.public.blastapi.io',
        arbitrum: process.env.STAGING_ARBITRUM_URL ?? 'https://api.zan.top/arb-sepolia',
        starknet: process.env.STAGING_STARKNET_URL ?? 'https://starknet-sepolia.drpc.org',
    },
    testnet: {
        baseUrl: process.env.TESTNET_BASE_URL ?? 'https://testnet.api.garden.finance',
        ethereum: process.env.TESTNET_ETHEREUM_URL ?? 'https://eth-sepolia.public.blastapi.io',
        arbitrum: process.env.TESTNET_ARBITRUM_URL ?? 'https://api.zan.top/arb-sepolia',
        starknet: process.env.TESTNET_STARKNET_URL ?? 'https://starknet-sepolia.drpc.org',
    },
    mainnet: {
        baseUrl: process.env.MAINNET_BASE_URL ?? 'https://api.garden.finance',
        ethereum: process.env.MAINNET_ETHEREUM_URL ?? 'https://eth.llamarpc.com',
        arbitrum: process.env.MAINNET_ARBITRUM_URL ?? 'https://arbitrum-one.rpc.grove.city/v1/01fdb492',
        starknet: process.env.MAINNET_STARKNET_URL ?? 'https://starknet.drpc.org',
    },
};

export function getEnvironment(): Testenvironment {
    const envVar = process.env.TEST_ENV;
    if (envVar === 'mainnet' || envVar === 'testnet' || envVar === 'staging') {
        return envVar;
    }

    const args = process.argv.slice(2);

    if (args.includes('--mainnet')) {
        return 'mainnet';
    }
    if (args.includes('--testnet')) {
        return 'testnet';
    }
    if (args.includes('--staging')) {
        return 'staging';
    }

    return 'testnet';
}

export function getConfig(): Config {
    const env = getEnvironment();
    const envConfig = environments[env];

    return {
        ...envConfig,
        privkey: process.env.PRIVATE_KEY ?? '',
        bitcoinPrivateKey: process.env.BITCOIN_PRIVATE_KEY ?? '',
        suiPrivateKey: process.env.SUI_PRIVATE_KEY ?? '',
        solanaPrivateKey: process.env.SOLANA_PRIV ?? '',
        evmAddress: process.env.EVM_ADDRESS ?? '',
        starknetAddress: process.env.STARKNET_ADDRESS ?? '',
        solanaAddress: process.env.SOLANA_ADDRESS ?? '',
        suiAddress: process.env.SUI_ADDRESS ?? '',
        bitcoinMainnetAddress: process.env.BTC_MAINNET ?? '',
        bitcoinTestnetAddress: process.env.BTC_TESTNET ?? '',
        digestKey: process.env.DIGEST_KEY ?? '',
        apiKey: process.env.API_KEY ?? '',
    };
}
