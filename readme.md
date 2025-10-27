[![NPM Version](https://img.shields.io/npm/v/%40gardenfi%2Fcore?style=for-the-badge&logo=npm&label=core&color=B1D8B7)](https://www.npmjs.com/package/@gardenfi/core) [![NPM Version](https://img.shields.io/npm/v/%40gardenfi%2Forderbook?style=for-the-badge&logo=npm&label=orderbook&color=B1D8B7)](https://www.npmjs.com/package/@gardenfi/orderbook) [![NPM Version](https://img.shields.io/npm/v/%40gardenfi%2Freact-hooks?style=for-the-badge&logo=npm&label=react-hooks&color=B1D8B7)](https://www.npmjs.com/package/@gardenfi/react-hooks) [![NPM Version](https://img.shields.io/npm/v/%40gardenfi%2Futils?style=for-the-badge&logo=npm&label=utils&color=B1D8B7)](https://www.npmjs.com/package/@gardenfi/utils) [![NPM Version](https://img.shields.io/npm/v/%40gardenfi%2Fwallet-connectors?style=for-the-badge&logo=npm&label=wallet-connectors&color=B1D8B7)](https://www.npmjs.com/package/@gardenfi/wallet-connectors)

# Garden SDK

The Garden SDK is a set of typescript packages that allow you to bridge Bitcoin across multiple blockchain networks including EVM-based chains, Solana, Starknet, and Sui. It is an abstraction over the Garden APIs, allowing developers to easily integrate Garden components into their dApps.

## Packages

- [`@gardenfi/utils`](./packages/utils/README.md) : Provides shared utility functions.
- [`@gardenfi/wallet-connectors`](./packages/wallet-connectors/README.md) : Provides wallet adapters for Bitcoin wallet connectivity.
- [`@gardenfi/orderbook`](./packages/orderbook/README.md) : Allows you to create orders and listen to them.
- [`@gardenfi/core`](./packages/core/README.md) : Allows you to interact with orders once you setup your wallets.
- [`@gardenfi/react-hooks`](./packages/react-hooks/README.md) :React context and hooks for integrating Garden SDK with your UI.
- [`@gardenfi/swap`](./packages/swap/README.md) : React component for embedding a cross-chain swap UI in your dApp.

## Docs

Check out our [docs](https://docs.garden.finance/developers/sdk) to learn more about Garden and how to build on it.

## Dependency Graph

```
@gardenfi/utils
|   └── @gardenfi/wallet-connectors
└── @gardenfi/orderbook
    └── @gardenfi/core
            └── @gardenfi/react-hooks
                    └── @gardenfi/swap
```

## Getting Started

This repository utilizes a Yarn workspace. To begin setting up the environment, follow these steps:

```bash
# fork and clone the repository
git clone https://github.com/your-username/garden.js.git
cd garden.js

# install dependencies
yarn

#build the project
yarn build

#build a specific package
yarn workspace @gardenfi/<package_name> build

#start development server
yarn dev
```

## Usage

To integrate the Garden SDK packages into your project based on your requirement, use the following command:

```bash
yarn add @gardenfi/<package_name>
```

## Contributing

### Make a contribution

- Follow a consistent branch naming convention:

  | Type     | Purpose                            | Example              |
  | -------- | ---------------------------------- | -------------------- |
  | `feat/`  | Introducing a new feature          | feat/secret-manager  |
  | `fix/`   | Bug fix or patch                   | fix/order-expiry-bug |
  | `chore/` | Minor update, refactor, or cleanup | chore/update-readme  |

  Test your updates locally to ensure everything works as expected.

- Commit and push changes

  ```bash
  git add .
  git commit -m "<COMMIT_MSG>"
  git push origin "<YOUR_BRANCH_NAME>"
  ```

- open a Pull Request to the `main` branch and fill in a clear description of your changes.

### Contribution Tips

- Keep PRs small and focused.
- Follow existing code style and conventions.
- Add meaningful commit messages and PR titles.
- Include screenshots or demos if applicable.
