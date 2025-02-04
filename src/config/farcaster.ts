import { optimism } from 'wagmi/chains';

export const FARCASTER_CONFIG = {
  domain: 'anki.farcaster.xyz',
  siweUri: 'https://anki.farcaster.xyz',
  rpcUrl: import.meta.env.VITE_FARCASTER_RPC_URL || optimism.rpcUrls.default.http[0],
  version: '1',
  chainId: optimism.id,
  timeout: 30000,
}; 