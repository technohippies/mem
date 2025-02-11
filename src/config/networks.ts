import { LIT_NETWORK } from '@lit-protocol/constants';

// Network configuration for Lit Protocol
export const LIT_NETWORK_CONFIG = {
  litNetwork: LIT_NETWORK.DatilTest,
  debug: true,
  minNodeCount: 2,
  checkNodeAttestation: false
};

// Chain configuration
export const CHAIN_CONFIG = {
  name: "base-sepolia",
  chainId: 84532,
  contractAddress: "0xa7Ca51c3B25Ea15c365d59540a42D8570546450f" // DECK_PURCHASE_ADDRESS
}; 