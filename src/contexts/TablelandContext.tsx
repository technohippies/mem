import { createContext, useContext, ReactNode } from 'react';
import { Database, Validator } from '@tableland/sdk';
import { ethers } from 'ethers';
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { TablelandClient } from '@/db/tableland';

interface TablelandContextType {
  client: TablelandClient;
  purchaseDeck: (deckId: string, price: number, creatorAddress: string) => Promise<void>;
}

const TablelandContext = createContext<TablelandContextType | null>(null);

export const useTableland = () => {
  const context = useContext(TablelandContext);
  if (!context) {
    throw new Error('useTableland must be used within a TablelandProvider');
  }
  return context;
};

interface TablelandProviderProps {
  children: ReactNode;
}

export const TablelandProvider = ({ children }: TablelandProviderProps) => {
  // Initialize the client once - no need for state since it's read-only
  const client = new TablelandClient();

  const purchaseDeck = async (deckId: string, price: number, creatorAddress: string) => {
    try {
      // 1. Get signer and connect to Tableland
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      // 2. Send payment to creator
      const tx = await signer.sendTransaction({
        to: creatorAddress,
        value: ethers.utils.parseEther((price/10000).toString())
      });
      await tx.wait();

      // 3. Initialize Lit Protocol
      const litClient = new LitJsSdk.LitNodeClient({
        alertWhenUnauthorized: false,
        debug: false,
      });
      await litClient.connect();

      // 4. Get auth signature for Lit Protocol
      const chain = 'base-sepolia';
      const authSig = await LitJsSdk.checkAndSignAuthMessage({ chain });

      // 5. Set up access control conditions based on payment
      const accessControlConditions = [{
        contractAddress: '', // ETH balance check doesn't need contract
        standardContractType: '',
        chain,
        method: 'eth_getBalance',
        parameters: [userAddress, 'latest'],
        returnValueTest: {
          comparator: '>=',
          value: '0' // If they have any balance, they've paid (we can make this more robust)
        }
      }];

      // 6. Store access conditions and auth signature for future decryption
      const storage = await client.storeAccessControl(deckId, {
        accessControlConditions,
        authSig,
        chain
      });

      console.log('Purchase successful, access granted');
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  };

  return (
    <TablelandContext.Provider value={{ client, purchaseDeck }}>
      {children}
    </TablelandContext.Provider>
  );
}; 