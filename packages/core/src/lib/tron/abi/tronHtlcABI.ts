export const tronHtlcAbi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'HTLC__DuplicateOrder',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__HTLCAlreadyInitialized',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__IncorrectSecret',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__InvalidInitiatorSignature',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__InvalidRedeemerSignature',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__OrderFulfilled',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__OrderNotExpired',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__OrderNotInitiated',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__SameFunderAndRedeemer',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__SameInitiatorAndRedeemer',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__ZeroAddressInitiator',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__ZeroAddressRedeemer',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__ZeroAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'HTLC__ZeroTimelock',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidShortString',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'str',
        type: 'string',
      },
    ],
    name: 'StringTooLong',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [],
    name: 'EIP712DomainChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderID',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'secretHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Initiated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderID',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'secretHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'destinationData',
        type: 'bytes',
      },
    ],
    name: 'InitiatedWithDestinationData',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderID',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'secretHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'secret',
        type: 'bytes',
      },
    ],
    name: 'Redeemed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderID',
        type: 'bytes32',
      },
    ],
    name: 'Refunded',
    type: 'event',
  },
  {
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      {
        internalType: 'bytes1',
        name: 'fields',
        type: 'bytes1',
      },
      {
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'version',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'chainId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'verifyingContract',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'salt',
        type: 'bytes32',
      },
      {
        internalType: 'uint256[]',
        name: 'extensions',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_token',
        type: 'address',
      },
    ],
    name: 'initialise',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'redeemer',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'timelock',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'secretHash',
        type: 'bytes32',
      },
      {
        internalType: 'bytes',
        name: 'destinationData',
        type: 'bytes',
      },
    ],
    name: 'initiate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'initiator',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'redeemer',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'timelock',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'secretHash',
        type: 'bytes32',
      },
    ],
    name: 'initiateOnBehalf',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'initiator',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'redeemer',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'timelock',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'secretHash',
        type: 'bytes32',
      },
      {
        internalType: 'bytes',
        name: 'destinationData',
        type: 'bytes',
      },
    ],
    name: 'initiateOnBehalf',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'initiator',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'redeemer',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'timelock',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'secretHash',
        type: 'bytes32',
      },
      {
        internalType: 'bytes',
        name: 'signature',
        type: 'bytes',
      },
    ],
    name: 'initiateWithSignature',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderID',
        type: 'bytes32',
      },
      {
        internalType: 'bytes',
        name: 'signature',
        type: 'bytes',
      },
    ],
    name: 'instantRefund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderID',
        type: 'bytes32',
      },
    ],
    name: 'instantRefundDigest',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isInitialized',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'orders',
    outputs: [
      {
        internalType: 'address',
        name: 'initiator',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'redeemer',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'initiatedAt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'timelock',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'fulfilledAt',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderID',
        type: 'bytes32',
      },
      {
        internalType: 'bytes',
        name: 'secret',
        type: 'bytes',
      },
    ],
    name: 'redeem',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderID',
        type: 'bytes32',
      },
    ],
    name: 'refund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
