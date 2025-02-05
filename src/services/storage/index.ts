import type { StorageInterface } from './interface';
import { SQLStorage } from './sql';

let storageInstance: StorageInterface | null = null;

export async function getStorage(userId: string, activeDeckId?: string): Promise<StorageInterface> {
  if (!storageInstance || storageInstance.userId !== userId || storageInstance.activeDeckId !== activeDeckId) {
    storageInstance = await SQLStorage.getInstance(userId, activeDeckId);
  }
  return storageInstance;
}

export type { StorageInterface };
export * from './interface'; 