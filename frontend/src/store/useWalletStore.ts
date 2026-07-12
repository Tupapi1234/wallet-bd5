import { create } from 'zustand';
import { decryptData, encryptData } from '@/lib/crypto';
import { deriveAllWallets } from '@/lib/multichain-derivation';
import { WalletUser, markWalletCreated } from '@/lib/auth-service';
import { getSolanaBalance, getSolanaTransactionHistory, getSolanaTokenBalances, SolanaTokenBalance, getSolanaNFTs } from '@/lib/solana-service';
import { getBtcBalance, getBtcTransactionHistory } from '@/lib/btc-service';
import { getBnbBalance, getBnbTransactionHistory } from '@/lib/bnb-service';
import { fetchLiveCryptoPrices } from '@/lib/price-service';

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
  user: WalletUser | null;
  
  // Settings (Synchronizable)
  settings: {
    theme: 'dark' | 'light';
    language: 'es' | 'en';
    preferredCurrency: 'USD' | 'EUR';
    autoLockTime: number; // in minutes
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
  splTokens: SolanaTokenBalance[];
  isFetchingBalance: boolean;

  // Sensitive Volatile State (Exclusively in memory, never saved in plaintext)
  decryptedSeed: string | null;
  isUnlocked: boolean;

  // Encrypted Local Storage Payload
  encryptedSeedPayload: string | null;

  cryptoPrices: Record<string, number>;
  isPollingPrices: boolean;

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
  refreshAllBalances: () => Promise<void>;
  refreshNFTs: () => Promise<void>;
  startPricePolling: () => void;

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
    autoLockTime: 5,
  },
  walletAddresses: null,
  solanaBalance: null,
  btcBalance: null,
  bnbBalance: null,
  splTokens: [],
  isFetchingBalance: false,
  decryptedSeed: null,
  isUnlocked: false,
  encryptedSeedPayload: null,
  cryptoPrices: {
    SOL: 135.20,
    BTC: 65420.50,
    BNB: 590.10,
    USDC: 1.00,
    USDT: 1.00,
    BONK: 0.000022
  },
  isPollingPrices: false,
  
  transactions: [],

  // NFTs are loaded from blockchain dynamically
  nfts: [],

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
    if (user) {
      const currentUser = get().user;
      if (currentUser?.hasWallet === true && user.hasWallet !== true) {
        user = { ...user, hasWallet: true };
      }
    }
    set({ user });
    if (user) {
      get().loadEncryptedWallet(user.uid);
      
      const storedSettings = localStorage.getItem(`aether_settings_${user.uid}`);
      if (storedSettings) {
        set((state) => ({ settings: { ...state.settings, ...JSON.parse(storedSettings) } }));
      }

      const storedTxs = localStorage.getItem(`aether_txs_${user.uid}`);
      if (storedTxs) {
        set({ transactions: JSON.parse(storedTxs) });
      }

      const storedNFTs = localStorage.getItem(`aether_nfts_${user.uid}`);
      if (storedNFTs) {
        set({ nfts: JSON.parse(storedNFTs) });
      }

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
      walletAddresses: null
    });
  },

  createWallet: async (mnemonic, pin) => {
    const user = get().user;
    if (!user) throw new Error("Debes iniciar sesión antes de crear una billetera.");

    const encryptedPayload = await encryptData(mnemonic.trim(), pin);
    localStorage.setItem(`aether_wallet_encrypted_${user.uid}`, encryptedPayload);

    const wallets = await deriveAllWallets(mnemonic);

    await markWalletCreated(user.uid);
    set({ user: { ...user, hasWallet: true } });

    set({
      encryptedSeedPayload: encryptedPayload,
      decryptedSeed: mnemonic,
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
    await get().createWallet(mnemonic, pin);
  },

  unlockWallet: async (pin) => {
    const { user, encryptedSeedPayload } = get();
    if (!user || !encryptedSeedPayload) {
      throw new Error("No hay billetera configurada para este usuario.");
    }

    const seed = await decryptData(encryptedSeedPayload, pin);
    const wallets = await deriveAllWallets(seed);

    set({
      decryptedSeed: seed,
      walletAddresses: {
        solana: wallets.solana.publicKey,
        bitcoin: wallets.bitcoin.address,
        bnb: wallets.bnb.address
      },
      isUnlocked: true
    });

    get().refreshAllBalances();
  },

  lockWallet: () => {
    set({
      decryptedSeed: null,
      walletAddresses: null,
      isUnlocked: false
    });
  },

  logout: () => {
    set({
      user: null,
      walletAddresses: null,
      decryptedSeed: null,
      isUnlocked: false,
      encryptedSeedPayload: null
    });
  },

  refreshAllBalances: async () => {
    const { walletAddresses } = get();
    if (!walletAddresses) return;

    set({ isFetchingBalance: true });
    
    // Also refresh NFTs asynchronously
    get().refreshNFTs();

    // Fetch all three chains + SPL tokens in parallel
    const [solResult, btcResult, bnbResult, splResult] = await Promise.allSettled([
      walletAddresses.solana ? getSolanaBalance(walletAddresses.solana) : Promise.resolve(null),
      walletAddresses.bitcoin ? getBtcBalance(walletAddresses.bitcoin) : Promise.resolve(null),
      walletAddresses.bnb ? getBnbBalance(walletAddresses.bnb) : Promise.resolve(null),
      walletAddresses.solana ? getSolanaTokenBalances(walletAddresses.solana) : Promise.resolve([]),
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
    if (splResult.status === "fulfilled") {
      set({ splTokens: splResult.value });
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

    set({ transactions: allTxs });
    if (user) {
      localStorage.setItem(`aether_txs_${user.uid}`, JSON.stringify(allTxs));
    }

    set({ isFetchingBalance: false });
  },

  refreshNFTs: async () => {
    const { walletAddresses } = get();
    if (walletAddresses?.solana) {
      try {
        const fetchedNFTs = await getSolanaNFTs(walletAddresses.solana);
        set({ nfts: fetchedNFTs });
        
        // Update local storage
        const user = get().user;
        if (user) {
          localStorage.setItem(`aether_nfts_${user.uid}`, JSON.stringify(fetchedNFTs));
        }
      } catch (err) {
        console.error("Error fetching NFTs:", err);
      }
    }
  },

  startPricePolling: () => {
    if (get().isPollingPrices) return;
    set({ isPollingPrices: true });

    const fetchPrices = async () => {
      const prices = await fetchLiveCryptoPrices();
      set({ cryptoPrices: prices });
    };

    // Fetch immediately
    fetchPrices();

    // Poll every 60 seconds
    setInterval(() => {
      fetchPrices();
    }, 60000);
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
