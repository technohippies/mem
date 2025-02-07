import { createContext, useContext, ReactNode } from 'react';
import { TablelandClient } from '@/db/tableland';

interface TablelandContextType {
  client: TablelandClient;
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

  return (
    <TablelandContext.Provider value={{ client }}>
      {children}
    </TablelandContext.Provider>
  );
}; 