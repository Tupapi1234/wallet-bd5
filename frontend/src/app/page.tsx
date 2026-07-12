"use client";

import { useEffect, useState } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { 
  getPersistedSession, 
  subscribeToAuth, 
  checkHasWallet,
  WalletUser 
} from "@/lib/auth-service";
import { 
  Coins, 
  ShieldCheck, 
  Wallet, 
  ArrowRight, 
  KeyRound, 
  Globe2, 
  Lock,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import {
  AuthView,
  VerifyEmailView,
  CreatePinView,
  ShowSeedView,
  ConfirmSeedView,
  ImportSeedView,
  EnterPinView,
  MultichainDashboardView
} from "@/components/views";

type ScreenState =
  | "splash"
  | "auth"
  | "verify-email"
  | "welcome"
  | "create-pin"
  | "show-seed"
  | "confirm-seed"
  | "import-seed"
  | "enter-pin"
  | "dashboard";

export default function AetherWalletApp() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>("splash");
  const [pendingMnemonic, setPendingMnemonic] = useState<string>("");
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isSplashDone, setIsSplashDone] = useState<boolean>(false);
  const [walletExists, setWalletExists] = useState<boolean>(false);
  const [walletCheckDone, setWalletCheckDone] = useState<boolean>(false);

  const { 
    user, 
    setUser, 
    settings, 
    updateSettings, 
    encryptedSeedPayload, 
    isUnlocked, 
    unlockWallet,
    createWallet,
    importWallet,
    loadEncryptedWallet,
    logout
  } = useWalletStore();

  // Suppress Firestore "client is offline" errors from Next.js dev overlay
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const FIREBASE_MSGS = ["client is offline", "Failed to get document", "FIRESTORE", "FirebaseError"];

    const suppress = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason);
      if (FIREBASE_MSGS.some(k => msg.includes(k))) e.preventDefault();
    };
    window.addEventListener("unhandledrejection", suppress);

    // Interceptar console.error para evitar que Next.js dev overlay lo muestre
    const origError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      const msg = args.map(String).join(" ");
      if (FIREBASE_MSGS.some(k => msg.includes(k))) return;
      origError(...args);
    };

    return () => {
      window.removeEventListener("unhandledrejection", suppress);
      console.error = origError;
    };
  }, []);

  // ==========================================
  // INITIAL SEQUENCE & AUTOLOGIN DETECTORS
  // ==========================================
  useEffect(() => {
    // 1. Splash screen — quick branding pause
    const splashTimer = setTimeout(() => {
      const persistedUser = getPersistedSession();
      // Only set persisted user if subscribeToAuth hasn't populated it yet
      const currentUser = useWalletStore.getState().user;
      
      if (persistedUser && !currentUser) {
        setUser(persistedUser);
        loadEncryptedWallet(persistedUser.uid);
      }
      setIsSplashDone(true);
    }, 1200);

    // 2. Active event listener to track Firebase user state shifts
    const unsubscribe = subscribeToAuth((liveUser) => {
      if (liveUser) {
        setUser(liveUser);
        loadEncryptedWallet(liveUser.uid);
      }
    });

    return () => {
      clearTimeout(splashTimer);
      unsubscribe();
    };
  }, []);

  // ==========================================
  // CHECK FIRESTORE FOR EXISTING WALLET WHEN WELCOME SCREEN IS SHOWN
  // ==========================================
  useEffect(() => {
    if (currentScreen === "welcome" && user?.uid && !walletCheckDone) {
      checkHasWallet(user.uid).then((exists) => {
        setWalletExists(exists);
        setWalletCheckDone(true);
      });
    }
  }, [currentScreen, user?.uid, walletCheckDone]);

  // ==========================================
  // DYNAMIC VIEW ROUTER ON AUTH / STORE CHANGES
  // ==========================================
  useEffect(() => {
    if (!isSplashDone) return;

    if (!user) {
      setCurrentScreen("auth");
      return;
    }

    // Block access if email is not verified (Firebase mode only)
    if (!user.emailVerified) {
      setCurrentScreen("verify-email");
      return;
    }

    // If user is loaded, verify if they already configured a wallet
    if (encryptedSeedPayload) {
      if (isUnlocked) {
        setCurrentScreen("dashboard");
      } else {
        setCurrentScreen("enter-pin");
      }
    } else {
      // If logged in but no wallet, show welcome creator options
      if (
        currentScreen !== "welcome" && 
        currentScreen !== "create-pin" && 
        currentScreen !== "show-seed" && 
        currentScreen !== "confirm-seed" && 
        currentScreen !== "import-seed"
      ) {
        setCurrentScreen("welcome");
      }
    }
  }, [isSplashDone, user, encryptedSeedPayload, isUnlocked]);

  // ==========================================
  // VIEW TRANSITION CONTROLLERS
  // ==========================================
  const handleAuthSuccess = (loggedUser: WalletUser) => {
    setUser(loggedUser);
    loadEncryptedWallet(loggedUser.uid);
  };

  const handleCreatePinSuccess = async (pin: string) => {
    try {
      if (isImporting) {
        await importWallet(pendingMnemonic, pin);
      } else {
        await createWallet(pendingMnemonic, pin);
      }
      setCurrentScreen("dashboard");
    } catch (e: any) {
      alert(e.message || "Error al inicializar billetera.");
    }
  };

  const handleShowSeedSuccess = (mnemonic: string) => {
    setPendingMnemonic(mnemonic);
    setCurrentScreen("confirm-seed");
  };

  const handleConfirmSeedSuccess = () => {
    setIsImporting(false);
    setCurrentScreen("create-pin");
  };

  const handleImportSeedSuccess = (mnemonic: string) => {
    setPendingMnemonic(mnemonic);
    setIsImporting(true);
    setCurrentScreen("create-pin");
  };

  const handleUnlockSuccess = async (pin: string) => {
    await unlockWallet(pin);
    setCurrentScreen("dashboard");
  };

  // ==========================================
  // RENDER COMPONENT DISPATCHER
  // ==========================================
  const renderScreen = () => {
    switch (currentScreen) {
      case "splash":
        return (
          <div className="flex-1 flex flex-col justify-between items-center px-8 py-16 text-foreground bg-background">
            {/* Ambient Background Blur Lights */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none animate-pulse-slow"></div>
            <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none"></div>

            <div></div>

            <div className="flex flex-col items-center gap-6 animate-fade-in relative z-10">
              <div className="relative flex justify-center items-center w-24 h-24 rounded-[32px] bg-gradient-to-tr from-indigo-600 to-indigo-400 p-[2px] shadow-[0_15px_40px_-5px_rgba(99,102,241,0.4)] animate-bounce-slow">
                <div className="w-full h-full bg-background rounded-[30px] flex justify-center items-center">
                  <Coins className="w-12 h-12 text-indigo-400 animate-pulse-slow" />
                </div>
                {/* Orbit rings */}
                <div className="absolute w-28 h-28 border border-indigo-500/20 rounded-full animate-[spin_8s_linear_infinite]"></div>
                <div className="absolute w-36 h-36 border border-emerald-500/10 rounded-full animate-[spin_12s_linear_infinite_reverse]"></div>
              </div>
              
              <div className="text-center">
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                  AETHER
                </h1>
                <p className="text-xs text-indigo-400 font-semibold tracking-[0.25em] uppercase mt-1">
                  Decentralized Wallet
                </p>
              </div>
            </div>

            <div className="w-full max-w-[200px] flex flex-col items-center gap-4 relative z-10">
              <div className="h-[3px] w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 w-1/2 rounded-full animate-[loading_2s_ease-in-out_infinite]"></div>
              </div>
              <p className="text-xs text-gray-500 animate-pulse">
                {settings.language === "es" ? "Estableciendo conexión segura..." : "Establishing secure link..."}
              </p>
            </div>
          </div>
        );

      case "auth":
        return <AuthView onSuccess={handleAuthSuccess} language={settings.language} />;

      case "verify-email":
        return (
          <VerifyEmailView
            email={user?.email || ""}
            onVerified={() => setCurrentScreen(encryptedSeedPayload ? "enter-pin" : "welcome")}
            onLogout={() => { logout(); setCurrentScreen("auth"); }}
            language={settings.language}
          />
        );

      case "welcome":
        return (
          <div className="flex-1 flex flex-col justify-between p-6 bg-background text-foreground animate-fade-in relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Header Language Picker */}
            <div className="flex justify-between items-center pt-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex justify-center items-center border border-indigo-500/30">
                  <Coins className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="font-extrabold text-sm tracking-wide">AETHER</span>
              </div>

              <button 
                onClick={() => updateSettings({ language: settings.language === "es" ? "en" : "es" })}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:bg-white/10 transition flex items-center gap-1.5"
              >
                <Globe2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                {settings.language === "es" ? "EN" : "ES"}
              </button>
            </div>

            {/* Welcome message */}
            <div className="my-auto flex flex-col items-center text-center px-4 relative z-10">
              <div className="w-16 h-16 rounded-[22px] bg-indigo-600/10 flex justify-center items-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5 mb-8 animate-bounce-slow">
                <Wallet className="w-8 h-8 text-indigo-400" />
              </div>
              
              <h2 className="text-3xl font-extrabold leading-tight text-foreground mb-3">
                {settings.language === "es" ? "Tus activos. Tu control." : "Your assets. Your control."}
              </h2>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs leading-relaxed">
                {settings.language === "es" 
                  ? "Crea o importa una billetera descentralizada segura para Solana y gestiona todo localmente."
                  : "Create or import a secure decentralized wallet for Solana and manage everything locally."}
              </p>
            </div>

            {/* Interactive Actions Buttons */}
            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-white/[0.04] backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex justify-center items-center shrink-0">
                  <ShieldCheck className="w-5.5 h-5.5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {settings.language === "es" ? "100% Descentralizado y Seguro" : "100% Decentralized & Secure"}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-normal">
                    {settings.language === "es" 
                      ? "Las claves privadas y la semilla se encriptan exclusivamente en tu dispositivo."
                      : "Private keys and seed phrase are strictly encrypted on your local hardware."}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {walletExists && (
                  <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs leading-relaxed text-center shadow-lg shadow-orange-500/5 backdrop-blur-md">
                    <Lock className="w-4 h-4 mx-auto mb-1.5 opacity-80" />
                    {settings.language === "es"
                      ? "Hemos detectado que ya tienes una billetera asociada a este correo. Por seguridad, la creación de nuevas billeteras está deshabilitada. Por favor, restáurala usando tu frase semilla."
                      : "We detected an existing wallet associated with this email. For security, creating new wallets is disabled. Please restore it using your seed phrase."}
                  </div>
                )}
                
                <button 
                  onClick={() => {
                    if (!walletExists) setCurrentScreen("show-seed");
                  }}
                  disabled={walletExists}
                  className={`w-full py-4 px-6 rounded-2xl font-semibold text-foreground flex justify-center items-center gap-2 transition-all duration-300 ${
                    walletExists
                      ? "bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-500 cursor-not-allowed opacity-70"
                      : "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)] group active:scale-[0.98]"
                  }`}
                >
                  {walletExists && <Lock className="w-4 h-4" />}
                  <span>
                    {settings.language === "es" ? "Crear nueva billetera" : "Create new wallet"}
                  </span>
                  {!walletExists && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>
                
                <button 
                  onClick={() => setCurrentScreen("import-seed")}
                  className="w-full py-4 px-6 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/10 font-semibold text-foreground flex justify-between items-center transition-all duration-300 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-400" />
                    <span>
                      {settings.language === "es" ? "Importar billetera existente" : "Import existing wallet"}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="text-center">
                <p className="text-[10px] text-gray-600 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-gray-600" />
                  {settings.language === "es" 
                    ? "Encriptación local AES-256 de nivel militar" 
                    : "Military-grade local AES-256 Encryption"}
                </p>
              </div>
            </div>
          </div>
        );

      case "create-pin":
        return <CreatePinView onSuccess={handleCreatePinSuccess} language={settings.language} />;

      case "show-seed":
        return <ShowSeedView onSuccess={handleShowSeedSuccess} language={settings.language} />;

      case "confirm-seed":
        return (
          <ConfirmSeedView 
            mnemonic={pendingMnemonic}
            onSuccess={handleConfirmSeedSuccess}
            onBack={() => setCurrentScreen("show-seed")}
            language={settings.language}
          />
        );

      case "import-seed":
        return (
          <ImportSeedView 
            onSuccess={handleImportSeedSuccess}
            onBack={() => setCurrentScreen("welcome")}
            language={settings.language}
          />
        );

      case "enter-pin":
        return <EnterPinView onSuccess={handleUnlockSuccess} language={settings.language} />;

      case "dashboard":
        return <MultichainDashboardView language={settings.language} />;

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-background text-foreground">
      {/* Dynamic light effects shared across screens */}
      {currentScreen !== "splash" && currentScreen !== "welcome" && (
        <>
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        </>
      )}

      {/* Screen Dispatcher */}
      {renderScreen()}

      <style jsx global>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-pulse-slow {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 99px;
        }
      `}</style>
    </div>
  );
}
