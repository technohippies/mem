import { Database } from '@tableland/sdk';
import type { TablelandDeck, TablelandFlashcard } from '@/types/tableland';
import { ethers } from "ethers";
import type { Eip1193Provider } from 'ethers';
import type { ILitNodeClient } from '@lit-protocol/types';
import { SiweMessage } from 'siwe';
import type { Flashcard } from '@/types/models';
import { decryptToString } from '@lit-protocol/encryption';
import { LitNodeClient } from '@lit-protocol/lit-node-client';

// Table names - these are unique to your deployment
export const DECKS_TABLE = 'decks_v5_84532_103';

// Contract configuration
const DECK_PURCHASE_ADDRESS = "0xA26277f442eD2E41E70E4a06E3849807D972e4C3";

export class TablelandClient {
  private database: Database | null = null;
  private userAddress: string | null = null;
  private authSig: any = null;
  private litClient: LitNodeClient | null = null;

  constructor() {
    this.database = new Database();
  }

  initializeDatabase(database: Database) {
    this.database = database;
  }

  setLitClient(client: ILitNodeClient | null) {
    // Only update if we're getting a new client or explicitly clearing
    if (client) {
      // If we're getting a new client, ensure it's connected first
      if (!client.ready) {
        console.log('[TablelandClient] Received unready Lit client, connecting...');
        // Don't set the client until it's ready
        client.connect().then(() => {
          console.log('[TablelandClient] Lit client connected successfully');
          // Only set the client if it's ready
          if (client.ready) {
            this.litClient = client as LitNodeClient;
          }
        }).catch(err => {
          console.error('[TablelandClient] Failed to connect Lit client:', err);
          // Clear state on connection failure
          this.litClient = null;
          this.authSig = null;
        });
      } else {
        // Client is already ready
        console.log('[TablelandClient] Lit client initialized and ready');
        this.litClient = client as LitNodeClient;
      }
    } else if (this.litClient !== null) { // Only clear if we actually have a client
      // If we're clearing the client, just clean up our references
      console.log('[TablelandClient] Clearing Lit client state');
      this.litClient = null;
      this.authSig = null;
    }
  }

  async ensureLitClientInitialized() {
    if (!this.litClient) {
      throw new Error("Lit Protocol client not available. Please ensure you are connected to your wallet and try again.");
    }

    // If client exists but isn't ready, try to connect it
    if (!this.litClient.ready) {
      console.log('[TablelandClient] Lit client not ready, connecting...');
      try {
        await this.litClient.connect();
        // Verify the client is actually ready after connecting
        if (!this.litClient.ready) {
          throw new Error("Lit client failed to initialize properly");
        }
        console.log('[TablelandClient] Lit client connected successfully');
      } catch (err) {
        console.error('[TablelandClient] Failed to connect Lit client:', err);
        // Clear state on connection failure
        this.litClient = null;
        this.authSig = null;
        throw new Error("Failed to initialize Lit Protocol client. Please ensure you are connected to your wallet and try again.");
      }
    }

    return this.litClient;
  }

  private async getAuthSig(): Promise<any> {
    // If we have a valid auth signature and the client is ready, reuse it
    if (this.authSig && this.litClient?.ready) {
      return this.authSig;
    }

    const litClient = await this.ensureLitClientInitialized();

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as unknown as Eip1193Provider);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Get the latest blockhash for nonce
      const nonce = litClient.latestBlockhash || Date.now().toString();
      
      // Use Base Sepolia chain ID explicitly
      const chainId = 84532; // Base Sepolia

      // Create SIWE message
      const domain = window.location.hostname;
      const origin = window.location.origin;
      const statement = "Sign in to decrypt flashcards";
      const siweMessage = new SiweMessage({
        domain,
        address,
        statement,
        uri: origin,
        version: "1",
        chainId,
        nonce,
        expirationTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      const messageToSign = siweMessage.prepareMessage();
      const signature = await signer.signMessage(messageToSign);

      // Store auth signature
      this.authSig = {
        sig: signature,
        derivedVia: "web3.eth.personal.sign",
        signedMessage: messageToSign,
        address: address.toLowerCase()
      };

      return this.authSig;
    } catch (error) {
      console.error('[TablelandClient] Failed to get auth signature:', error);
      throw error;
    }
  }

  async connect(): Promise<void> {
    try {
      const ethereumProvider = window.ethereum as unknown as Eip1193Provider;
      const provider = new ethers.BrowserProvider(ethereumProvider);
      const signer = await provider.getSigner();
      this.userAddress = await signer.getAddress();

      this.database = new Database({
        signer,
      });

      console.log('[TablelandClient] Connected successfully');
    } catch (error) {
      console.error('[TablelandClient] Failed to connect:', error);
      throw error;
    }
  }

  async hasPurchasedDeck(deckId: string): Promise<boolean> {
    try {
      if (!this.userAddress) {
        await this.connect();
      }

      if (!this.userAddress) {
        return false;
      }

      const provider = new ethers.BrowserProvider(window.ethereum as unknown as Eip1193Provider);
      const contract = new ethers.Contract(DECK_PURCHASE_ADDRESS, [
        "function hasPurchased(address user, uint256 deckId) public view returns (bool)",
        "function getDeckPrice(uint256 deckId) external view returns (uint256)",
        "function purchaseDeck(uint256 deckId) external payable"
      ], provider);

      const result = await contract.hasPurchased(this.userAddress, deckId);
      console.log('[TablelandClient] hasPurchased check:', {
        userAddress: this.userAddress,
        deckId,
        result
      });
      return result;
    } catch (error) {
      console.error('[TablelandClient] Failed to check purchase status:', error);
      return false;
    }
  }

  private async decryptDeckContent(deck: TablelandDeck, encryptedContent: string): Promise<string> {
    await this.ensureLitClientInitialized();
    
    if (!this.userAddress) {
      throw new Error('Not connected to wallet');
    }

    // After ensureLitClientInitialized(), we know litClient is not null
    const litClient = this.litClient!;

    try {
      console.log('[TablelandClient] Starting decryption process...', {
        deckId: deck.id,
        hasEncryptionKey: !!deck.encryption_key,
        hasAccessConditions: !!deck.access_conditions,
        contentLength: encryptedContent?.length,
        accessConditions: deck.access_conditions
      });

      // Get auth signature if we don't have one
      if (!this.authSig) {
        this.authSig = await this.getAuthSig();
      }

      // Handle access conditions - they might already be parsed
      let accessControlConditions;
      try {
        // Check if access_conditions is already an array
        if (Array.isArray(deck.access_conditions)) {
          accessControlConditions = deck.access_conditions;
        } else {
          // Try to parse if it's a string
          accessControlConditions = JSON.parse(deck.access_conditions);
        }

        // Update the parameters array to use the current deck ID
        if (accessControlConditions?.[0]?.accessControlConditions?.[0]) {
          accessControlConditions[0].accessControlConditions[0].parameters = [deck.id.toString()];
        }

        console.log('[TablelandClient] Access conditions:', {
          raw: deck.access_conditions,
          parsed: accessControlConditions,
          type: typeof accessControlConditions,
          isArray: Array.isArray(accessControlConditions),
          hasAccessControlConditions: !!accessControlConditions?.[0]?.accessControlConditions,
          firstCondition: accessControlConditions?.[0],
          firstConditionDetails: {
            chain: accessControlConditions?.[0]?.accessControlConditions?.[0]?.chain,
            contractAddress: accessControlConditions?.[0]?.accessControlConditions?.[0]?.contractAddress,
            standardContractType: accessControlConditions?.[0]?.accessControlConditions?.[0]?.standardContractType,
            method: accessControlConditions?.[0]?.accessControlConditions?.[0]?.method,
            parameters: accessControlConditions?.[0]?.accessControlConditions?.[0]?.parameters,
            returnValueTest: accessControlConditions?.[0]?.accessControlConditions?.[0]?.returnValueTest,
            fullCondition: JSON.stringify(accessControlConditions?.[0]?.accessControlConditions?.[0], null, 2)
          }
        });
      } catch (e) {
        console.error('[TablelandClient] Failed to process access conditions:', {
          error: e,
          raw: deck.access_conditions,
          type: typeof deck.access_conditions
        });
        throw new Error('Invalid access conditions format');
      }

      // Validate access conditions structure
      if (!accessControlConditions?.[0]?.accessControlConditions) {
        console.error('[TablelandClient] Invalid access conditions structure:', {
          conditions: accessControlConditions,
          firstItem: accessControlConditions?.[0]
        });
        throw new Error('Invalid access conditions structure');
      }

      // Get the chain from the access conditions
      const chain = accessControlConditions[0].accessControlConditions[0]?.chain;
      if (!chain) {
        throw new Error('No chain specified in access conditions');
      }

      console.log('[TablelandClient] Using chain from access conditions:', chain);

      const decryptConfig = {
        accessControlConditions: accessControlConditions[0].accessControlConditions,
        ciphertext: encryptedContent,
        dataToEncryptHash: deck.encryption_key,
        chain,
        authSig: this.authSig
      };

      console.log('[TablelandClient] Attempting decryption with config:', {
        accessControlConditions: decryptConfig.accessControlConditions,
        authSig: {
          address: this.authSig.address,
          signedMessage: this.authSig.signedMessage,
          sig: this.authSig.sig
        },
        encryptionKey: deck.encryption_key,
        chain: decryptConfig.chain,
        fullAccessConditions: JSON.stringify(accessControlConditions[0].accessControlConditions, null, 2)
      });

      // Use the access conditions exactly as they are in the deck
      const decryptedString = await decryptToString(decryptConfig, litClient);

      // Log the decrypted content for debugging
      console.log('[TablelandClient] Raw decrypted content:', {
        type: typeof decryptedString,
        length: decryptedString?.length,
        preview: decryptedString?.substring(0, 100),
        isString: typeof decryptedString === 'string',
        isObject: typeof decryptedString === 'object',
        constructor: decryptedString?.constructor?.name
      });

      // Handle case where decryptedString is an object
      const contentToProcess = typeof decryptedString === 'object' ? 
        JSON.stringify(decryptedString) : decryptedString;

      // Validate that we got a string back
      if (typeof contentToProcess !== 'string') {
        throw new Error(`Decryption failed - invalid response type: ${typeof contentToProcess}`);
      }

      // Validate that the string is not empty
      if (!contentToProcess) {
        throw new Error('Decryption failed - empty response');
      }

      // Try to parse as JSON to validate format
      try {
        JSON.parse(contentToProcess);
      } catch (e) {
        console.error('[TablelandClient] Invalid JSON in decrypted content:', {
          error: e,
          contentPreview: contentToProcess.substring(0, 200)
        });
        throw new Error('Decryption produced invalid JSON');
      }

      console.log('[TablelandClient] Successfully decrypted content');
      return contentToProcess;
    } catch (error) {
      console.error('[TablelandClient] Decryption error:', error);
      throw error;
    }
  }

  async tablelandToAppFlashcard(card: any): Promise<Flashcard> {
    return {
      id: card.id?.toString() || '',
      deck_id: card.deck_id?.toString() || '',
      front: card.front_text || '',
      back: card.back_text || '',
      front_language: card.front_language || 'eng',
      back_language: card.back_language || 'eng',
      sort_order: card.sort_order || 0,
      audio_tts_cid: card.audio_tts_cid || null,
      front_image_cid: card.front_image_cid || null,
      back_image_cid: card.back_image_cid || null,
      notes: card.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Optional encryption fields
      front_text_key: card.front_text_key || null,
      back_text_key: card.back_text_key || null,
      audio_tts_key: card.audio_tts_key || null,
      front_image_key: card.front_image_cid_key || null,
      back_image_key: card.back_image_cid_key || null,
      notes_key: card.notes_key || null,
    };
  }

  async getDeckFlashcards(deck: TablelandDeck): Promise<TablelandFlashcard[]> {
    if (!deck.flashcards_cid) {
      return [];
    }

    try {
      // Fetch flashcards data from IPFS
      console.log('[TablelandClient] Fetching from IPFS:', deck.flashcards_cid);
      const response = await fetch(`https://public.w3ipfs.storage/ipfs/${deck.flashcards_cid}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch flashcards from IPFS: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[TablelandClient] IPFS data:', {
        hasEncryptedContent: !!data.encrypted_content,
        encryptedContentLength: data.encrypted_content?.length,
        hasEncryptionKey: !!deck.encryption_key,
        hasAccessConditions: !!deck.access_conditions,
        rawData: {
          keys: Object.keys(data),
          encrypted_content_preview: data.encrypted_content?.substring(0, 50) + '...'
        }
      });
      
      // If the deck is free, return the flashcards directly
      if (deck.price === 0) {
        console.log('[TablelandClient] Processing free deck...');
        return Promise.all(data.flashcards.map(async (card: any, index: number) => 
          this.tablelandToAppFlashcard({
            ...card,
            id: index + 1,
            deck_id: parseInt(deck.id)
          })
        ));
      }

      // For paid decks, check if user has purchased it
      const hasPurchased = await this.hasPurchasedDeck(deck.id.toString());
      if (!hasPurchased) {
        throw new Error('You need to purchase this deck to view its content');
      }

      // For paid decks, ensure Lit is initialized
      await this.ensureLitClientInitialized();

      // For paid decks, decrypt the content
      console.log('[TablelandClient] Processing paid deck, attempting decryption...', {
        price: deck.price,
        hasEncryptedContent: !!data.encrypted_content,
        contentLength: data.encrypted_content?.length,
        encryptionKey: deck.encryption_key
      });
      
      const decryptedContent = await this.decryptDeckContent(deck, data.encrypted_content);
      console.log('[TablelandClient] Decrypted content:', {
        type: typeof decryptedContent,
        length: decryptedContent?.length,
        preview: decryptedContent?.substring(0, 100) + '...'
      });

      try {
        const flashcardsData = JSON.parse(decryptedContent);
        console.log('[TablelandClient] Parsed flashcards:', {
          hasFlashcards: !!flashcardsData.flashcards,
          flashcardsCount: flashcardsData.flashcards?.length,
          firstCard: flashcardsData.flashcards?.[0]
        });

        // Map the decrypted flashcards to our app format
        return Promise.all(flashcardsData.flashcards.map(async (card: any, index: number) => {
          const mappedCard = await this.tablelandToAppFlashcard({
            ...card,
            id: index + 1,
            deck_id: parseInt(deck.id)
          });
          
          console.log(`[TablelandClient] Mapped card ${index + 1}/${flashcardsData.flashcards.length}:`, {
            original: card,
            mapped: mappedCard
          });
          
          return mappedCard;
        }));
      } catch (parseError) {
        console.error('[TablelandClient] Failed to parse decrypted content:', parseError);
        throw parseError;
      }
    } catch (error) {
      console.error('[TablelandClient] Failed to get deck flashcards:', error);
      throw error;
    }
  }

  async getAllDecks(): Promise<TablelandDeck[]> {
    try {
      if (!this.userAddress) {
        await this.connect();
      }

      if (!this.database) {
        await this.connect();
      }

      if (!this.database) {
        throw new Error('Database not initialized');
      }

      console.log('[TablelandClient] Getting all decks');
      
      const { results } = await this.database
        .prepare(`SELECT * FROM ${DECKS_TABLE} ORDER BY id DESC`)
        .all<TablelandDeck>();

      return results;
    } catch (error) {
      console.error('[TablelandClient] Failed to get all decks:', error);
      throw error;
    }
  }

  async getFlashcards(deckId: number): Promise<TablelandFlashcard[]> {
    const deck = await this.getDeck(deckId);
    if (!deck) {
      throw new Error('Deck not found');
    }
    return this.getDeckFlashcards(deck);
  }

  async getDeck(deckId: number): Promise<TablelandDeck | null> {
    try {
      if (!this.userAddress) {
        await this.connect();
      }

      if (!this.database) {
        await this.connect();
      }

      if (!this.database) {
        throw new Error('Database not initialized');
      }

      const { results } = await this.database
        .prepare(`SELECT * FROM ${DECKS_TABLE} WHERE id = ?`)
        .bind(deckId)
        .all<TablelandDeck>();
      return results[0] || null;
    } catch (error) {
      console.error('[TablelandClient] Failed to get deck:', error);
      throw error;
    }
  }

  async purchaseDeck(deckId: string): Promise<void> {
    try {
      await this.connect();
      
      if (!this.userAddress) {
        throw new Error('Not connected');
      }

      const provider = new ethers.BrowserProvider(window.ethereum as unknown as Eip1193Provider);
      const signer = await provider.getSigner();
      
      // Create contract instance
      const contract = new ethers.Contract(
        DECK_PURCHASE_ADDRESS,
        [
          "function getDeckPrice(uint256 deckId) external view returns (uint256)",
          "function purchaseDeck(uint256 deckId) external payable"
        ],
        signer
      );

      // Get the deck price (this will be in wei)
      const price = await contract.getDeckPrice(deckId);
      console.log('[TablelandClient] Got deck price:', {
        deckId,
        priceWei: price.toString(),
        priceEth: ethers.formatEther(price)
      });
      
      // Send transaction with exact price
      const tx = await contract.purchaseDeck(
        deckId,
        { value: price }
      );

      // Wait for transaction to be mined
      await tx.wait();
      
      console.log('[TablelandClient] Purchase successful');
    } catch (error) {
      console.error('[TablelandClient] Purchase failed:', error);
      throw error;
    }
  }

  async setDeckPrice(deckId: string, price: number, creator: string): Promise<void> {
    try {
      await this.connect();
      
      if (!this.userAddress) {
        throw new Error('Not connected');
      }

      const provider = new ethers.BrowserProvider(window.ethereum as unknown as Eip1193Provider);
      const signer = await provider.getSigner();
      
      // Create contract instance
      const contract = new ethers.Contract(
        DECK_PURCHASE_ADDRESS,
        [
          "function setDeckPrice(uint256 deckId, uint256 price, address creator) external",
          "function owner() external view returns (address)"
        ],
        signer
      );

      // Check if caller is owner
      const owner = await contract.owner();
      if (owner.toLowerCase() !== this.userAddress.toLowerCase()) {
        throw new Error('Only contract owner can set deck prices');
      }

      // Convert Tableland price (e.g. 7 for 0.0007 ETH) to wei
      // 7 * 10^14 = 0.0007 ETH in wei
      const priceInWei = ethers.getBigInt(price) * ethers.getBigInt(10 ** 14);
      
      console.log('[TablelandClient] Setting price:', {
        deckId,
        tablelandPrice: price,
        priceInWei: priceInWei.toString(),
        priceInEth: ethers.formatEther(priceInWei)
      });
      
      // Set the price
      const tx = await contract.setDeckPrice(deckId, priceInWei, creator);
      await tx.wait();
      
      console.log('[TablelandClient] Price set successfully:', {
        deckId,
        price: priceInWei.toString(),
        creator
      });
    } catch (error) {
      console.error('[TablelandClient] Failed to set deck price:', error);
      throw error;
    }
  }
}