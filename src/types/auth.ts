export interface AuthState {
  isInitializing: boolean;
  isConnected: boolean;
  isCeramicConnected: boolean;
  userAddress: string | null;
}

export interface AuthContextValue extends AuthState {
  connect: (address: string) => Promise<void>;
  disconnect: () => Promise<void>;
  connectCeramic: () => Promise<void>;
} 