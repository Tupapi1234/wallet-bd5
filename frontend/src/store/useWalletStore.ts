import { create } from 'zustand';
import { decryptData, encryptData } from '@/lib/crypto';
import { deriveAllWallets } from '@/lib/multichain-derivation';
import { getSolanaBalance, getSolanaTransactionHistory } from '@/lib/solana-service';
import { getBtcBalance, getBtcTransactionHistory } from '@/lib/btc-service';
import { getBnbBalance, getBnbTransactionHistory } from '@/lib/bnb-service';

export interface Transaction {
  id: string;
  type: 'send' | 'receive';
  chain: 'solana' | 'bitcoin' | 'bnb';
  asset: string;
  amount: number;
  amountUSD: number;
  recipient: string;
  sender: string;
  timestamp: string;
  status: 'confirmed' | 'pending' | 'failed';
  fee: number;
  feeUSD: number;
  hash: string;
}

export interface NFT {
  id: string;
  name: string;
  collection: string;
  chain: 'solana' | 'bnb';
  imageUrl: string;
  description: string;
  mintAddress: string;
}

export interface ConnectedDApp {
  id: string;
  name: string;
  url: string;
  icon: string;
  connectedAt: string;
}

interface WalletState {
  // Authentication State
  user: {
    uid: string;
    email: string;
    username: string | null;
  } | null;
  
  // Settings (Synchronizable)
  settings: {
    theme: 'dark' | 'light';
    language: 'es' | 'en';
    preferredCurrency: 'USD' | 'EUR';
  };
  
  // Local wallet addresses (Public keys only)
  walletAddresses: {
    solana: string | null;
    bitcoin: string | null;
    bnb: string | null;
  } | null;

  // Real on-chain balances
  solanaBalance: number | null;
  btcBalance: number | null;
  bnbBalance: number | null;
  isFetchingBalance: boolean;

  // Sensitive Volatile State (Exclusively in memory, never saved in plaintext)
  decryptedSeed: string | null;
  solanaPrivateKey: string | null;
  bitcoinPrivateKey: string | null;
  bnbPrivateKey: string | null;
  isUnlocked: boolean;

  // Encrypted Local Storage Payload
  encryptedSeedPayload: string | null;

  // Transactions Registry History
  transactions: Transaction[];

  // Web3 Assets & Connections (Fase 5 Features)
  nfts: NFT[];
  connectedDApps: ConnectedDApp[];

  // Store Actions
  setUser: (user: WalletState['user']) => void;
  updateSettings: (settings: Partial<WalletState['settings']>) => void;
  setWalletAddresses: (addresses: WalletState['walletAddresses']) => void;
  loadEncryptedWallet: (uid: string) => void;
  
  // Decentered Cryptographic Actions
  createWallet: (mnemonic: string, pin: string) => Promise<void>;
  importWallet: (mnemonic: string, pin: string) => Promise<void>;
  unlockWallet: (pin: string) => Promise<void>;
  lockWallet: () => void;
  logout: () => void;

  // Real on-chain data refresh
  refreshSolanaData: () => Promise<void>;
  refreshAllBalances: () => Promise<void>;

  // Transactions Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp' | 'status' | 'hash'>) => Promise<void>;

  // Web3 Hub Actions (Fase 5 Features)
  connectDApp: (dApp: Omit<ConnectedDApp, 'id' | 'connectedAt'>) => void;
  disconnectDApp: (id: string) => void;
  removeNFT: (id: string) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  user: null,
  settings: {
    theme: 'dark',
    language: 'es',
    preferredCurrency: 'USD',
  },
  walletAddresses: null,
  solanaBalance: null,
  btcBalance: null,
  bnbBalance: null,
  isFetchingBalance: false,
  decryptedSeed: null,
  solanaPrivateKey: null,
  bitcoinPrivateKey: null,
  bnbPrivateKey: null,
  isUnlocked: false,
  encryptedSeedPayload: null,
  
  transactions: [
    {
      id: 'tx_1',
      type: 'receive',
      chain: 'solana',
      asset: 'SOL',
      amount: 15.00,
      amountUSD: 1934.70,
      recipient: '8xFp5...4aZQ',
      sender: 'Gq7mY...9kPL',
      timestamp: '2026-05-28T14:32:00.000Z',
      status: 'confirmed',
      fee: 0.000005,
      feeUSD: 0.0006,
      hash: '5xY9aK8dH7eJ6fZ5gY4X3w2v1u0t9s8r7q6p5o4n3m2l1k0j9i8h7g6f5e4d3c2b1a'
    },
    {
      id: 'tx_2',
      type: 'send',
      chain: 'bitcoin',
      asset: 'BTC',
      amount: 0.005,
      amountUSD: 337.10,
      recipient: 'bc1qp6y8...7l3k',
      sender: 'bc1q9x7w...0y3g',
      timestamp: '2026-05-29T09:15:00.000Z',
      status: 'confirmed',
      fee: 0.00012,
      feeUSD: 8.09,
      hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6e5f6'
    },
    {
      id: 'tx_3',
      type: 'receive',
      chain: 'bnb',
      asset: 'BNB',
      amount: 0.50,
      amountUSD: 291.20,
      recipient: '0x9E7C...D170',
      sender: '0x5a1b...C8e9',
      timestamp: '2026-05-30T18:45:00.000Z',
      status: 'confirmed',
      fee: 0.00045,
      feeUSD: 0.26,
      hash: '0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f'
    }
  ],

  // Initial NFTs digital collections featuring high-end abstract CSS gradient descriptors
  nfts: [
    {
      id: 'nft_1',
      name: 'Solana Monkey Business #2890',
      collection: 'Solana Monkey Business',
      chain: 'solana',
      imageUrl: 'linear-gradient(135deg, #14F195 0%, #9945FF 100%)',
      description: 'Exclusive Pixel Monkey generated on the Solana Blockchain. Part of the SMB Gen2 Collection.',
      mintAddress: 'SMBqwK8dH7eJ6fZ5gY4X3w2v1u0t9s8r7q6p5o4n3m2'
    },
    {
      id: 'nft_2',
      name: 'DeGods #5621',
      collection: 'DeGods Solana',
      chain: 'solana',
      imageUrl: 'linear-gradient(135deg, #FF3B30 0%, #FF9500 100%)',
      description: 'Defi-focused collectible depicting detailed deity portraits. Fully native to Solana.',
      mintAddress: 'DeGods9kPL8h7g6f5e4d3c2b1a5xY9aK8dH7eJ6fZ5g'
    },
    {
      id: 'nft_3',
      name: 'Pancake Bunnies #108',
      collection: 'Pancake Bunnies',
      chain: 'bnb',
      imageUrl: 'linear-gradient(135deg, #FFB900 0%, #FF5000 100%)',
      description: 'Adorable generative bunny card celebrating BSC PancakeSwap farming milestones.',
      mintAddress: '0xPancake8f9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6'
    },
    {
      id: 'nft_4',
      name: 'CyberPunk BEP-721 #034',
      collection: 'CyberPunks BNB',
      chain: 'bnb',
      imageUrl: 'linear-gradient(135deg, #00C7FF 0%, #0040FF 100%)',
      description: 'Futuristic sci-fi profiles styled for BEP-721 BNB Smart Chain smart contracts.',
      mintAddress: '0xCPBEP3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b'
    }
  ],

  connectedDApps: [
    {
      id: 'dapp_1',
      name: 'Jupiter Exchange',
      url: 'https://jup.ag',
      icon: '⚡',
      connectedAt: '2026-06-01T15:20:00.000Z'
    }
  ],

  setUser: (user) => {
    set({ user });
    if (user) {
      get().loadEncryptedWallet(user.uid);
      
      // Load user specific settings from localStorage if they exist
      const storedSettings = localStorage.getItem(`aether_settings_${user.uid}`);
      if (storedSettings) {
        set((state) => ({ settings: { ...state.settings, ...JSON.parse(storedSettings) } }));
      }

      // Load user specific transactions from localStorage if they exist
      const storedTxs = localStorage.getItem(`aether_txs_${user.uid}`);
      if (storedTxs) {
        set({ transactions: JSON.parse(storedTxs) });
      }

      // Load user specific NFTs from localStorage if they exist
      const storedNFTs = localStorage.getItem(`aether_nfts_${user.uid}`);
      if (storedNFTs) {
        set({ nfts: JSON.parse(storedNFTs) });
      }

      // Load user specific dApps from localStorage if they exist
      const storedDApps = localStorage.getItem(`aether_dapps_${user.uid}`);
      if (storedDApps) {
        set({ connectedDApps: JSON.parse(storedDApps) });
      }
    }
  },

  updateSettings: (newSettings) =>
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      if (state.user) {
        localStorage.setItem(`aether_settings_${state.user.uid}`, JSON.stringify(updated));
      }
      return { settings: updated };
    }),

  setWalletAddresses: (walletAddresses) => set({ walletAddresses }),

  loadEncryptedWallet: (uid) => {
    if (typeof window === 'undefined') return;
    const payload = localStorage.getItem(`aether_wallet_encrypted_${uid}`);
    set({ 
      encryptedSeedPayload: payload,
      isUnlocked: false,
      decryptedSeed: null,
      solanaPrivateKey: null,
      bitcoinPrivateKey: null,
      bnbPrivateKey: null,
      walletAddresses: null
    });
  },

  createWallet: async (mnemonic, pin) => {
    const user = get().user;
    if (!user) throw new Error("Debes iniciar sesión antes de crear una billetera.");

    // Encrypt seed phrase locally using the user's PIN
    const encryptedPayload = await encryptData(mnemonic.trim(), pin);
    localStorage.setItem(`aether_wallet_encrypted_${user.uid}`, encryptedPayload);

    // Derive all three target network wallets in parallel
    const wallets = await deriveAllWallets(mnemonic);

    set({
      encryptedSeedPayload: encryptedPayload,
      decryptedSeed: mnemonic,
      solanaPrivateKey: wallets.solana.privateKeyBase58,
      bitcoinPrivateKey: wallets.bitcoin.privateKeyHex,
      bnbPrivateKey: wallets.bnb.privateKeyHex,
      walletAddresses: {
        solana: wallets.solana.publicKey,
        bitcoin: wallets.bitcoin.address,
        bnb: wallets.bnb.address
      },
      isUnlocked: true
    });

    get().refreshAllBalances();
  },

  importWallet: async (mnemonic, pin) => {
    // Importing works identically to creating: encrypt and store
    await get().createWallet(mnemonic, pin);
  },

  unlockWallet: async (pin) => {
    const { user, encryptedSeedPayload } = get();
    if (!user || !encryptedSeedPayload) {
      throw new Error("No hay billetera configurada para este usuario.");
    }

    // Decrypt the local payload with the user input PIN
    const seed = await decryptData(encryptedSeedPayload, pin);
    
    // Once decrypted, derive keys for all networks in parallel
    const wallets = await deriveAllWallets(seed);

    set({
      decryptedSeed: seed,
      solanaPrivateKey: wallets.solana.privateKeyBase58,
      bitcoinPrivateKey: wallets.bitcoin.privateKeyHex,
      bnbPrivateKey: wallets.bnb.privateKeyHex,
      walletAddresses: {
        solana: wallets.solana.publicKey,
        bitcoin: wallets.bitcoin.address,
        bnb: wallets.bnb.address
      },
      isUnlocked: true
    });

    // Fetch real Solana balance after unlocking
    get().refreshAllBalances();
  },

  lockWallet: () => {
    set({
      decryptedSeed: null,
      solanaPrivateKey: null,
      bitcoinPrivateKey: null,
      bnbPrivateKey: null,
      walletAddresses: null,
      isUnlocked: false
    });
  },

  logout: () => {
    set({
      user: null,
      walletAddresses: null,
      decryptedSeed: null,
      solanaPrivateKey: null,
      bitcoinPrivateKey: null,
      bnbPrivateKey: null,
      isUnlocked: false,
      encryptedSeedPayload: null
    });
  },

  refreshSolanaData: async () => {
    const { walletAddresses } = get();
    const solanaAddress = walletAddresses?.solana;
    if (!solanaAddress) return;

    set({ isFetchingBalance: true });
    try {
      const balance = await getSolanaBalance(solanaAddress);
      set({ solanaBalance: balance });

      // Fetch real transaction history from Solana network
      const onChainTxs = await getSolanaTransactionHistory(solanaAddress, 20);
      const mapped: Transaction[] = onChainTxs.map((tx) => ({
        id: tx.signature.slice(0, 12),
        type: tx.type,
        chain: 'solana',
        asset: 'SOL',
        amount: tx.amount,
        amountUSD: 0,
        recipient: tx.type === 'send' ? tx.otherAddress : solanaAddress,
        sender: tx.type === 'receive' ? tx.otherAddress : solanaAddress,
        timestamp: tx.blockTime
          ? new Date(tx.blockTime * 1000).toISOString()
          : new Date().toISOString(),
        status: tx.status,
        fee: tx.fee,
        feeUSD: 0,
        hash: tx.signature,
      }));

      if (mapped.length > 0) {
        const user = get().user;
        set({ transactions: mapped });
        if (user) {
          localStorage.setItem(`aether_txs_${user.uid}`, JSON.stringify(mapped));
        }
      }
    } catch (err) {
      console.error("Error al consultar la red Solana:", err);
    } finally {
      set({ isFetchingBalance: false });
    }
  },

  refreshAllBalances: async () => {
    const { walletAddresses } = get();
    if (!walletAddresses) return;

    set({ isFetchingBalance: true });

    // Fetch all three chains in parallel
    const [solResult, btcResult, bnbResult] = await Promise.allSettled([
      walletAddresses.solana ? getSolanaBalance(walletAddresses.solana) : Promise.resolve(null),
      walletAddresses.bitcoin ? getBtcBalance(walletAddresses.bitcoin) : Promise.resolve(null),
      walletAddresses.bnb ? getBnbBalance(walletAddresses.bnb) : Promise.resolve(null),
    ]);

    if (solResult.status === "fulfilled" && solResult.value !== null) {
      set({ solanaBalance: solResult.value });
    }
    if (btcResult.status === "fulfilled" && btcResult.value !== null) {
      set({ btcBalance: btcResult.value });
    }
    if (bnbResult.status === "fulfilled" && bnbResult.value !== null) {
      set({ bnbBalance: bnbResult.value });
    }

    // Fetch transaction history for all chains
    const user = get().user;
    const txResults = await Promise.allSettled([
      walletAddresses.solana ? getSolanaTransactionHistory(walletAddresses.solana, 15) : Promise.resolve([]),
      walletAddresses.bitcoin ? getBtcTransactionHistory(walletAddresses.bitcoin, 15) : Promise.resolve([]),
      walletAddresses.bnb ? getBnbTransactionHistory(walletAddresses.bnb, 15) : Promise.resolve([]),
    ]);

    const allTxs: Transaction[] = [];

    if (txResults[0].status === "fulfilled") {
      const solAddr = walletAddresses.solana!;
      txResults[0].value.forEach((tx) => {
        allTxs.push({
          id: tx.signature.slice(0, 12),
          type: tx.type,
          chain: "solana",
          asset: "SOL",
          amount: tx.amount,
          amountUSD: 0,
          recipient: tx.type === "send" ? tx.otherAddress : solAddr,
          sender: tx.type === "receive" ? tx.otherAddress : solAddr,
          timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : new Date().toISOString(),
          status: tx.status,
          fee: tx.fee,
          feeUSD: 0,
          hash: tx.signature,
        });
      });
    }

    if (txResults[1].status === "fulfilled") {
      const btcAddr = walletAddresses.bitcoin!;
      txResults[1].value.forEach((tx) => {
        allTxs.push({
          id: tx.txid.slice(0, 12),
          type: tx.type,
          chain: "bitcoin",
          asset: "BTC",
          amount: tx.amount,
          amountUSD: 0,
          recipient: tx.type === "send" ? tx.otherAddress : btcAddr,
          sender: tx.type === "receive" ? tx.otherAddress : btcAddr,
          timestamp: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : new Date().toISOString(),
          status: tx.status,
          fee: tx.fee,
          feeUSD: 0,
          hash: tx.txid,
        });
      });
    }

    if (txResults[2].status === "fulfilled") {
      const bnbAddr = walletAddresses.bnb!;
      txResults[2].value.forEach((tx) => {
        allTxs.push({
          id: tx.hash.slice(0, 12),
          type: tx.type,
          chain: "bnb",
          asset: "BNB",
          amount: tx.amount,
          amountUSD: 0,
          recipient: tx.type === "send" ? tx.otherAddress : bnbAddr,
          sender: tx.type === "receive" ? tx.otherAddress : bnbAddr,
          timestamp: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : new Date().toISOString(),
          status: tx.status,
          fee: tx.fee,
          feeUSD: 0,
          hash: tx.hash,
        });
      });
    }

    // Sort all transactions by date (newest first)
    allTxs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (allTxs.length > 0) {
      set({ transactions: allTxs });
      if (user) {
        localStorage.setItem(`aether_txs_${user.uid}`, JSON.stringify(allTxs));
      }
    }

    set({ isFetchingBalance: false });
  },

  addTransaction: async (tx) => {
    const user = get().user;
    if (!user) return;

    const id = 'tx_' + Math.random().toString(36).substring(2, 9);
    const hash = (tx.chain === 'bnb' ? '0x' : '') + Array.from({ length: 64 })
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('');
    const timestamp = new Date().toISOString();

    const newTx: Transaction = {
      ...tx,
      id,
      hash,
      timestamp,
      status: 'pending'
    };

    const updatedTxs = [newTx, ...get().transactions];
    
    set({ transactions: updatedTxs });
    localStorage.setItem(`aether_txs_${user.uid}`, JSON.stringify(updatedTxs));

    setTimeout(() => {
      const currentTxs = get().transactions;
      const modifiedTxs = currentTxs.map(t => {
        if (t.id === id) {
          return { ...t, status: 'confirmed' as const };
        }
        return t;
      });
      set({ transactions: modifiedTxs });
      localStorage.setItem(`aether_txs_${user.uid}`, JSON.stringify(modifiedTxs));
    }, 3500);
  },

  connectDApp: (dApp) => {
    const user = get().user;
    if (!user) return;

    const id = 'dapp_' + Math.random().toString(36).substring(2, 9);
    const connectedAt = new Date().toISOString();
    const newDApp: ConnectedDApp = {
      ...dApp,
      id,
      connectedAt
    };

    const updatedDApps = [newDApp, ...get().connectedDApps];
    set({ connectedDApps: updatedDApps });
    localStorage.setItem(`aether_dapps_${user.uid}`, JSON.stringify(updatedDApps));
  },

  disconnectDApp: (id) => {
    const user = get().user;
    if (!user) return;

    const updatedDApps = get().connectedDApps.filter(d => d.id !== id);
    set({ connectedDApps: updatedDApps });
    localStorage.setItem(`aether_dapps_${user.uid}`, JSON.stringify(updatedDApps));
  },

  removeNFT: (id) => {
    const user = get().user;
    if (!user) return;

    const updatedNFTs = get().nfts.filter(n => n.id !== id);
    set({ nfts: updatedNFTs });
    localStorage.setItem(`aether_nfts_${user.uid}`, JSON.stringify(updatedNFTs));
  }
}));
