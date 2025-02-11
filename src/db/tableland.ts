import { Database } from '@tableland/sdk';
import type { TablelandDeck, TablelandFlashcard } from '@/types/tableland';
import { ethers } from "ethers";
import type { Eip1193Provider } from 'ethers';
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK } from '@lit-protocol/constants';
import { SiweMessage } from 'siwe';
import type { Flashcard } from '@/types/models';
import { decryptToString } from '@lit-protocol/encryption';

// Table names - these are unique to your deployment
export const DECKS_TABLE = 'decks_v5_84532_103';

// Contract configuration
const DECK_PURCHASE_ADDRESS = "0xa7Ca51c3B25Ea15c365d59540a42D8570546450f";

export class TablelandClient {
  private db: Database;
  private litClient: LitNodeClient | null = null;
  private userAddress: string | null = null;
  private authSig: any = null;

  constructor() {
    this.db = new Database();
    this.litClient = new LitNodeClient({
      litNetwork: LIT_NETWORK.DatilTest,
      debug: true,
      minNodeCount: 2,
      checkNodeAttestation: false
    });
  }

  private async getAuthSig(): Promise<any> {
    if (this.authSig) {
      return this.authSig;
    }

    if (!this.litClient) {
      throw new Error('Lit Protocol not initialized');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as unknown as Eip1193Provider);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Get the latest blockhash for nonce
      const nonce = await this.litClient.getLatestBlockhash();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

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

      // Don't try to format the signature, let Lit Protocol handle it
      this.authSig = {
        sig: signature,
        derivedVia: "web3.eth.personal.sign",
        signedMessage: messageToSign,
        address: address.toLowerCase()
      };

      // Log the full auth signature for debugging
      console.log('[TablelandClient] Generated auth signature:', {
        sigLength: signature.length,
        sigType: typeof signature,
        messageLength: messageToSign.length,
        fullSig: signature
      });

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

      this.db = new Database({
        signer,
      });

      if (!this.litClient) {
        this.litClient = new LitNodeClient({
          litNetwork: LIT_NETWORK.DatilTest,
          debug: true,
          minNodeCount: 2,
          checkNodeAttestation: false
        });
      }
      await this.litClient.connect();
      console.log('[TablelandClient] Connected successfully');
    } catch (error) {
      console.error('[TablelandClient] Failed to connect:', error);
      throw error;
    }
  }

  async hasPurchasedDeck(deckId: string): Promise<boolean> {
    try {
      await this.connect();
      
      if (!this.userAddress) {
        return false;
      }

      const provider = new ethers.BrowserProvider(window.ethereum as unknown as Eip1193Provider);
      const contract = new ethers.Contract(DECK_PURCHASE_ADDRESS, [
        "function hasPurchased(address buyer, uint256 deckId) public view returns (bool)"
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
    if (!this.litClient || !this.userAddress) {
      throw new Error('Lit Protocol not initialized');
    }

    try {
      console.log('[TablelandClient] Starting decryption process...', {
        deckId: deck.id,
        hasEncryptionKey: !!deck.encryption_key,
        hasAccessConditions: !!deck.access_conditions,
        contentLength: encryptedContent?.length,
        rawAccessConditions: deck.access_conditions,
        rawEncryptionKey: deck.encryption_key
      });
      
      // Parse access conditions if needed
      let accessConditions;
      try {
        // Handle both string and object formats
        if (typeof deck.access_conditions === 'string') {
          try {
            accessConditions = JSON.parse(deck.access_conditions);
          } catch (e) {
            console.error('[TablelandClient] Failed to parse access conditions string:', e);
            throw e;
          }
        } else {
          // If it's already an object/array, use it directly
          accessConditions = deck.access_conditions;
        }
        
        // Extract the inner accessControlConditions array
        if (Array.isArray(accessConditions) && accessConditions[0]?.accessControlConditions) {
          accessConditions = accessConditions[0].accessControlConditions;
        } else if (accessConditions.accessControlConditions) {
          accessConditions = accessConditions.accessControlConditions;
        }
        
        // Create the correct access control conditions for Lit Protocol
        accessConditions = [{
          accessControlConditions: [{
            contractAddress: DECK_PURCHASE_ADDRESS,
            standardContractType: "",
            chain: "baseSepolia",
            method: "eth_call",
            parameters: [
              DECK_PURCHASE_ADDRESS,
              `0x7506dfd0000000000000000000000000${this.userAddress?.toLowerCase().substring(2)}00000000000000000000000000000000000000000000000000000000000000${deck.id.toString().padStart(2, '0')}0000000000000000000000000000`
            ],
            returnValueTest: {
              comparator: "=",
              value: "0x0000000000000000000000000000000000000000000000000000000000000001"
            }
          }]
        }];
        
        
        console.log('[TablelandClient] Using access conditions:', JSON.stringify(accessConditions, null, 2));
      } catch (parseError) {
        console.error('[TablelandClient] Failed to parse access conditions:', {
          error: String(parseError),
          raw: deck.access_conditions,
          type: typeof deck.access_conditions
        });
        throw parseError;
      }

      // Get auth signature
      const authSig = await this.getAuthSig();
      console.log('[TablelandClient] Got auth signature:', {
        address: authSig.address,
        signedMessage: authSig.signedMessage.substring(0, 50) + '...'
      });

      // Add retry logic for decryption
      let retryCount = 0;
      const maxRetries = 3;
      let lastError;
      let symmetricKey;

      while (retryCount < maxRetries) {
        try {
          console.log('[TablelandClient] Attempting decryption with config:', {
            accessControlConditions: accessConditions,
            authSig: {
              sig: authSig.sig,
              derivedVia: authSig.derivedVia,
              signedMessage: authSig.signedMessage,
              address: authSig.address,
              sigType: typeof authSig.sig,
              sigLength: authSig.sig.length,
              isHexString: authSig.sig.startsWith('0x'),
              hexLength: authSig.sig.startsWith('0x') ? (authSig.sig.length - 2) / 2 : authSig.sig.length / 2
            },
            encryptionKeyLength: deck.encryption_key.length,
            encryptionKeyPreview: deck.encryption_key.substring(0, 50) + '...'
          });

          // Use the original signature without modification
          // The ethers library already formats it correctly as a 65-byte signature
          const sigBytes = ethers.getBytes(authSig.sig);
          
          console.log('[TablelandClient] Signature byte analysis:', {
            originalSigLength: authSig.sig.length,
            byteArrayLength: sigBytes.length,
            r: sigBytes.slice(0, 32),
            s: sigBytes.slice(32, 64),
            v: sigBytes[64],
            fullBytes: sigBytes
          });
          
          symmetricKey = await decryptToString({
            accessControlConditions: accessConditions[0].accessControlConditions,
            ciphertext: deck.encryption_key,
            dataToEncryptHash: deck.encryption_key,
            chain: "baseSepolia",
            authSig: {
              sig: authSig.sig,
              derivedVia: "web3.eth.personal.sign",
              signedMessage: authSig.signedMessage,
              address: authSig.address.toLowerCase()
            }
          }, this.litClient);
          break; // If successful, exit the retry loop
        } catch (error: any) {
          lastError = error;
          retryCount++;
          console.warn(`[TablelandClient] Decrypt attempt ${retryCount} failed:`, {
            error: String(error),
            status: error.response?.status,
            statusText: error.response?.statusText
          });
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }

      if (!symmetricKey) {
        throw new Error(`Failed to decrypt after ${maxRetries} attempts: ${lastError}`);
      }

      console.log('[TablelandClient] Got symmetric key:', {
        keyType: typeof symmetricKey,
        keyLength: symmetricKey?.length,
        isString: typeof symmetricKey === 'string',
        keyPreview: symmetricKey ? symmetricKey.substring(0, 32) + '...' : null
      });

      // Use symmetric key to decrypt the content
      console.log('[TablelandClient] Decrypting content with symmetric key...', {
        contentLength: encryptedContent.length,
        contentPreview: encryptedContent.substring(0, 50) + '...'
      });

      // Reset retry counter for content decryption
      retryCount = 0;
      let decryptedString;

      while (retryCount < maxRetries) {
        try {
          decryptedString = await decryptToString({
            accessControlConditions: accessConditions[0].accessControlConditions,
            ciphertext: encryptedContent,
            dataToEncryptHash: encryptedContent,
            chain: "baseSepolia",
            authSig: {
              sig: authSig.sig,
              derivedVia: "web3.eth.personal.sign",
              signedMessage: authSig.signedMessage,
              address: authSig.address.toLowerCase()
            }
          }, this.litClient);
          break; // If successful, exit the retry loop
        } catch (error: any) {
          lastError = error;
          retryCount++;
          console.warn(`[TablelandClient] Content decrypt attempt ${retryCount} failed:`, {
            error: String(error),
            status: error.response?.status,
            statusText: error.response?.statusText
          });
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }

      if (!decryptedString) {
        throw new Error(`Failed to decrypt content after ${maxRetries} attempts: ${lastError}`);
      }

      console.log('[TablelandClient] Successfully decrypted content:', {
        type: typeof decryptedString,
        length: decryptedString?.length,
        preview: decryptedString?.substring(0, 100) + '...',
        isValidJSON: (() => {
          try {
            JSON.parse(decryptedString);
            return true;
          } catch (e) {
            return false;
          }
        })()
      });

      // Validate JSON before returning
      try {
        JSON.parse(decryptedString); // Validate that it's valid JSON
        return decryptedString;
      } catch (error) {
        console.error('[TablelandClient] Failed to parse decrypted content as JSON:', {
          error: String(error),
          contentType: typeof decryptedString,
          contentLength: decryptedString?.length,
          contentPreview: decryptedString?.substring(0, 100) + '...'
        });
        throw new Error('Decrypted content is not valid JSON');
      }
    } catch (error) {
      console.error('[TablelandClient] Decryption error:', {
        error: String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        accessConditions: deck.access_conditions,
        encryptionKeyLength: deck.encryption_key?.length,
        contentLength: encryptedContent?.length
      });
      throw error;
    }
  }

  async tablelandToAppFlashcard(card: any): Promise<Flashcard> {
    return {
      id: card.id.toString(),
      deck_id: card.deck_id.toString(),
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
        hasEncryptionKey: !!data.encryption_key,
        hasAccessConditions: !!data.access_conditions,
        rawData: {
          keys: Object.keys(data),
          encrypted_content_preview: data.encrypted_content?.substring(0, 50) + '...',
          encryption_key_preview: data.encryption_key?.substring(0, 50) + '...',
          access_conditions: data.access_conditions
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

      // For paid decks, decrypt the content
      console.log('[TablelandClient] Processing paid deck, attempting decryption...', {
        price: deck.price,
        hasEncryptedContent: !!data.encrypted_content,
        contentLength: data.encrypted_content?.length
      });
      
      const decryptedContent = await this.decryptDeckContent(deck, data.encrypted_content);
      console.log('[TablelandClient] Decrypted content type:', {
        type: typeof decryptedContent,
        length: decryptedContent?.length,
        preview: decryptedContent?.substring(0, 100) + '...'
      });

      try {
        const flashcardsData = JSON.parse(decryptedContent);
        console.log('[TablelandClient] Parsed flashcards:', {
          hasFlashcards: !!flashcardsData.flashcards,
          flashcardsCount: flashcardsData.flashcards?.length,
          firstCard: flashcardsData.flashcards?.[0] ? {
            id: flashcardsData.flashcards[0].id,
            front: flashcardsData.flashcards[0].front_text?.substring(0, 50),
            back: flashcardsData.flashcards[0].back_text?.substring(0, 50)
          } : null
        });

        return Promise.all(flashcardsData.flashcards.map(async (card: any, index: number) => 
          this.tablelandToAppFlashcard({
            ...card,
            id: index + 1,
            deck_id: parseInt(deck.id)
          })
        ));
      } catch (parseError) {
        console.error('[TablelandClient] Failed to parse decrypted content:', {
          error: String(parseError),
          contentType: typeof decryptedContent,
          contentLength: decryptedContent?.length,
          contentPreview: decryptedContent?.substring(0, 100) + '...',
          isValidJSON: (() => {
            try {
              JSON.parse(decryptedContent);
              return true;
            } catch (e) {
              return false;
            }
          })()
        });
        throw parseError;
      }
    } catch (error) {
      console.error('[TablelandClient] Failed to get deck flashcards:', {
        error: String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        deckId: deck.id,
        flashcardsCid: deck.flashcards_cid,
        price: deck.price
      });
      throw error;
    }
  }

  async getAllDecks(): Promise<TablelandDeck[]> {
    await this.connect();
    console.log('[TablelandClient] Getting all decks');
    
    const { results } = await this.db
      .prepare(`SELECT * FROM ${DECKS_TABLE} ORDER BY id DESC`)
      .all<TablelandDeck>();

    return results;
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
      const { results } = await this.db
        .prepare(`SELECT * FROM ${DECKS_TABLE} WHERE id = ?`)
        .bind(deckId)
        .all<TablelandDeck>();
      return results[0] || null;
    } catch (error) {
      console.error('[TablelandClient] Failed to get deck:', error);
      throw error;
    }
  }

  async purchaseDeck(deckId: string, price: number, creatorAddress: string): Promise<void> {
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
        ["function purchaseDeck(uint256 deckId, address creator) external payable"],
        signer
      );

      // Convert price from our format (e.g. 7) to ETH (0.0007)
      const priceInEth = price / 10000;
      
      // Send transaction
      const tx = await contract.purchaseDeck(
        deckId,
        creatorAddress,
        { value: ethers.parseEther(priceInEth.toString()) }
      );

      // Wait for transaction to be mined
      await tx.wait();
      
      console.log('[TablelandClient] Purchase successful');
    } catch (error) {
      console.error('[TablelandClient] Purchase failed:', error);
      throw error;
    }
  }
}