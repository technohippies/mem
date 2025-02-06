import type { IEVMProvider } from "@useorbis/db-sdk";

interface Window {
  ethereum: IEVMProvider | Record<string, unknown> | undefined;
}

export {}; 