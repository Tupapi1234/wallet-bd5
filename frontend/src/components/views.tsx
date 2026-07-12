"use client";

import React, { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "next-themes";
import { ProfileView } from "./ProfileView";
import { SolanaIcon, BitcoinIcon, BnbIcon, UsdcIcon, UsdtIcon, BonkIcon } from "./CryptoIcons";
import { useWalletStore, Transaction, NFT, ConnectedDApp } from "@/store/useWalletStore";
import {
  registerUser,
  loginUser,
  resendVerificationEmail,
  checkEmailVerified,
  WalletUser
} from "@/lib/auth-service";
import { generate12WordMnemonic, isValidMnemonic } from "@/lib/bip39-util";
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Lock, 
  ShieldAlert,
  HelpCircle,
  KeyRound,
  RotateCcw,
  LogOut,
  ChevronRight,
  User,
  Mail,
  Fingerprint,
  Info,
  CheckCircle2,
  DollarSign,
  Languages,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Shield,
  Layers,
  ArrowRight,
  Clock,
  ExternalLink,
  Settings,
  Globe,
  Trash2,
  FileCode,
  Wallet,
  ArrowLeft,
  QrCode,
  X,
  CreditCard,
  Zap
} from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
// ==========================================
// DRAG TO SCROLL CUSTOM HOOK
// ==========================================
function useDragToScroll() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDown = useRef(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);
  const hasDragged = useRef(false);
  const cleanups = useRef<(() => void)[]>([]);

  const ref = React.useCallback((node: HTMLDivElement | null) => {
    // Clean up previous event listeners
    cleanups.current.forEach((cb) => cb());
    cleanups.current = [];

    if (!node) {
      containerRef.current = null;
      return;
    }

    containerRef.current = node;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click

      const target = e.target as HTMLElement;
      // Do not drag if clicking interactive elements
      if (target.closest("input") || target.closest("textarea") || target.closest("select") || target.closest("button") || target.closest("a")) {
        return;
      }

      isDown.current = true;
      hasDragged.current = false;
      startY.current = e.pageY;
      scrollTop.current = node.scrollTop;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown.current) return;
      
      const walk = e.pageY - startY.current;
      
      if (Math.abs(walk) > 5) {
        hasDragged.current = true;
        // Only apply drag-scroll once we've confirmed the user is dragging
        node.scrollTop = scrollTop.current - walk * 1.2;
      }
    };

    const handleMouseUp = () => {
      if (!isDown.current) return;
      isDown.current = false;
    };

    const handleClickCapture = (e: MouseEvent) => {
      if (hasDragged.current) {
        e.preventDefault();
        e.stopPropagation();
        hasDragged.current = false;
      }
    };

    node.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    node.addEventListener("click", handleClickCapture, true);

    cleanups.current = [
      () => node.removeEventListener("mousedown", handleMouseDown),
      () => window.removeEventListener("mousemove", handleMouseMove),
      () => window.removeEventListener("mouseup", handleMouseUp),
      () => node.removeEventListener("click", handleClickCapture, true),
    ];
  }, []);

  return { ref };
}

// ==========================================
// 1. AUTHENTICATION VIEW (Register & Login)
// ==========================================
interface AuthViewProps {
  onSuccess: (user: WalletUser) => void;
  language: "es" | "en";
}

interface VerifyEmailViewProps {
  email: string;
  onVerified: () => void;
  onLogout: () => void;
  language: "es" | "en";
}

export function VerifyEmailView({ email, onVerified, onLogout, language }: VerifyEmailViewProps) {
  const [checking, setChecking] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const verified = await checkEmailVerified();
      if (verified) {
        clearInterval(interval);
        onVerified();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [onVerified]);

  const handleResend = async () => {
    try {
      await resendVerificationEmail();
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      setError(language === "es" ? "Error al reenviar el correo." : "Error resending email.");
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    const verified = await checkEmailVerified();
    setChecking(false);
    if (verified) {
      onVerified();
    } else {
      setError(language === "es" ? "Correo aún no verificado. Revisa tu bandeja." : "Email not verified yet. Check your inbox.");
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="w-16 h-16 rounded-[22px] bg-indigo-600/10 flex justify-center items-center border border-indigo-500/20 mb-6">
        <Mail className="w-8 h-8 text-indigo-400" />
      </div>
      <h2 className="text-xl font-black mb-2">
        {language === "es" ? "Verifica tu correo" : "Verify your email"}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-1">
        {language === "es" ? "Enviamos un enlace de verificación a:" : "We sent a verification link to:"}
      </p>
      <p className="text-sm font-bold text-indigo-400 mb-6">{email}</p>
      <p className="text-xs text-gray-500 text-center mb-6">
        {language === "es"
          ? "Abre tu correo, haz clic en el enlace y luego vuelve aquí."
          : "Open your email, click the link, then come back here."}
      </p>
      {error && <p className="text-xs text-red-400 mb-4">{error}</p>}
      {resent && <p className="text-xs text-emerald-400 mb-4">{language === "es" ? "¡Correo reenviado!" : "Email resent!"}</p>}
      <button
        onClick={handleCheck}
        disabled={checking}
        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm transition mb-3 disabled:opacity-50"
      >
        {checking ? (language === "es" ? "Verificando..." : "Checking...") : (language === "es" ? "Ya verifiqué mi correo" : "I verified my email")}
      </button>
      <button
        onClick={handleResend}
        className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 font-bold text-sm transition mb-3"
      >
        {language === "es" ? "Reenviar correo" : "Resend email"}
      </button>
      <button onClick={onLogout} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-300 transition mt-2">
        {language === "es" ? "Cerrar sesión" : "Log out"}
      </button>
    </div>
  );
}

export function AuthView({ onSuccess, language }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const user = await loginUser(email, password);
        onSuccess(user);
      } else {
        if (!username.trim()) {
          throw new Error(language === "es" ? "El nombre de usuario es obligatorio." : "Username is required.");
        }
        
        // Validación Alfanumérica y Carácter Especial
        const strongPasswordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).+$/;
        if (!strongPasswordRegex.test(password)) {
          throw new Error(language === "es" ? "La contraseña debe contener al menos una letra, un número y un carácter especial (ej. @, #, -, .)." : "Password must contain at least one letter, one number, and one special character (e.g. @, #, -, .).");
        }
        if (password.length < 6) {
          throw new Error(language === "es" ? "La contraseña debe tener al menos 6 caracteres." : "Password must be at least 6 characters long.");
        }

        const user = await registerUser(email, password, username);
        onSuccess(user);
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || (language === "es" ? "Ha ocurrido un error inesperado." : "An unexpected error occurred.");
      
      // Traducir errores comunes de Firebase
      if (err.code === "auth/email-already-in-use") {
        errorMessage = language === "es" ? "Este correo electrónico ya está registrado." : "This email is already in use.";
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        errorMessage = language === "es" ? "Credenciales incorrectas." : "Invalid credentials.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          {isLogin 
            ? (language === "es" ? "Iniciar Sesión" : "Welcome Back")
            : (language === "es" ? "Crear Cuenta" : "Create Account")
          }
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          {isLogin
            ? (language === "es" ? "Ingresa para acceder a tus activos" : "Login to access your assets")
            : (language === "es" ? "Regístrate de forma segura y descentralizada" : "Sign up securely and decentralized")
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 animate-pulse-slow">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!isLogin && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">
              {language === "es" ? "Nombre de usuario" : "Username"}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={language === "es" ? "Tu alias" : "Your alias"}
                className="w-full bg-card border border-gray-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">
            {language === "es" ? "Correo electrónico" : "Email Address"}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-card border border-gray-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">
            {language === "es" ? "Contraseña" : "Password"}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-card border border-gray-200 dark:border-white/5 rounded-xl pl-10 pr-11 py-3 text-sm text-foreground placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 font-semibold text-foreground shadow-[0_10px_20px_-5px_rgba(99,102,241,0.3)] hover:from-indigo-500 hover:to-indigo-400 active:scale-[0.98] transition-all duration-150 flex justify-center items-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <span>
              {isLogin
                ? (language === "es" ? "Entrar de forma segura" : "Unlock Account")
                : (language === "es" ? "Registrarse" : "Sign Up")
              }
            </span>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-xs text-gray-500">
        <span>
          {isLogin
            ? (language === "es" ? "¿No tienes cuenta? " : "New to Aether? ")
            : (language === "es" ? "¿Ya tienes una cuenta? " : "Already have an account? ")
          }
        </span>
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
          }}
          className="text-indigo-400 hover:text-indigo-300 font-bold transition duration-150"
        >
          {isLogin
            ? (language === "es" ? "Regístrate aquí" : "Create one now")
            : (language === "es" ? "Inicia sesión" : "Login here")
          }
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 2. CREATE PIN VIEW
// ==========================================
interface CreatePinViewProps {
  onSuccess: (pin: string) => void;
  language: "es" | "en";
}

export function CreatePinView({ onSuccess, language }: CreatePinViewProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<1 | 2>(1); // 1 = enter pin, 2 = confirm pin
  const [error, setError] = useState<string | null>(null);

  const handleKeyPress = (num: string) => {
    setError(null);
    if (step === 1) {
      if (pin.length < 6) setPin(prev => prev + num);
    } else {
      if (confirmPin.length < 6) setConfirmPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    if (step === 1) {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) handleKeyPress(e.key);
      else if (e.key === "Backspace") handleBackspace();
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [step, pin, confirmPin]);

  useEffect(() => {
    // Process PIN 1st step complete
    if (step === 1 && pin.length === 6) {
      const timer = setTimeout(() => {
        setStep(2);
      }, 300);
      return () => clearTimeout(timer);
    }

    // Process PIN 2nd step complete
    if (step === 2 && confirmPin.length === 6) {
      const timer = setTimeout(() => {
        if (pin === confirmPin) {
          onSuccess(pin);
        } else {
          setError(language === "es" ? "Los PINs no coinciden. Intenta de nuevo." : "PINs do not match. Try again.");
          setPin("");
          setConfirmPin("");
          setStep(1);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pin, confirmPin]);

  const activePin = step === 1 ? pin : confirmPin;

  return (
    <div className="flex-1 flex flex-col justify-between px-6 py-8 animate-fade-in relative z-10">
      <div className="text-center pt-4">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
          <Fingerprint className="w-6 h-6 text-indigo-400" />
          {step === 1 
            ? (language === "es" ? "Crea tu PIN" : "Create Security PIN")
            : (language === "es" ? "Confirma tu PIN" : "Confirm Security PIN")
          }
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">
          {step === 1
            ? (language === "es" ? "Establece un código numérico de 6 dígitos para proteger tu clave semilla" : "Define a 6-digit numeric PIN to protect your seed phrase")
            : (language === "es" ? "Re-introduce los 6 dígitos para verificar que coincidan" : "Re-enter the 6 digits to verify they match")
          }
        </p>
      </div>

      {/* Dots Display */}
      <div className="flex flex-col items-center gap-4 my-8">
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < activePin.length 
                  ? "bg-indigo-500 border-indigo-500 scale-110 shadow-[0_0_12px_rgba(99,102,241,0.5)]" 
                  : "bg-transparent border-gray-300 dark:border-white/10"
              }`}
            />
          ))}
        </div>
        {error && (
          <p className="text-xs text-red-400 text-center animate-bounce mt-2 font-medium">
            {error}
          </p>
        )}
      </div>

      {/* Grid Keypad */}
      <div className="w-full max-w-xs mx-auto space-y-3.5 mb-2">
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-16 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-white/[0.04] text-xl font-bold hover:bg-gray-100 dark:bg-white/5 active:scale-[0.95] transition-all flex justify-center items-center"
            >
              {num}
            </button>
          ))}
          <button 
            onClick={() => {
              if (step === 1) setPin("");
              else setConfirmPin("");
            }}
            className="h-16 rounded-2xl text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-300 flex justify-center items-center active:scale-[0.95] transition"
          >
            {language === "es" ? "Limpiar" : "Clear"}
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="h-16 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-white/[0.04] text-xl font-bold hover:bg-gray-100 dark:bg-white/5 active:scale-[0.95] transition-all flex justify-center items-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-16 rounded-2xl text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-300 flex justify-center items-center active:scale-[0.95] transition"
          >
            {language === "es" ? "Borrar" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. SHOW SEED VIEW
// ==========================================
interface ShowSeedViewProps {
  onSuccess: (mnemonic: string) => void;
  language: "es" | "en";
}

export function ShowSeedView({ onSuccess, language }: ShowSeedViewProps) {
  const [mnemonic, setMnemonic] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate fresh BIP39 seed phrase when view mounts
    setMnemonic(generate12WordMnemonic());
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const words = mnemonic.split(" ");

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background text-foreground animate-fade-in relative z-10">
      <div className="text-center pt-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
          <KeyRound className="w-6 h-6 text-indigo-400 animate-pulse-slow" />
          {language === "es" ? "Frase de Respaldo" : "Secret Seed Phrase"}
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">
          {language === "es" 
            ? "Guarda estas 12 palabras en un lugar privado y offline. Te permiten recuperar tus activos." 
            : "Write down these 12 words in a private and offline place. They give full access to your funds."}
        </p>
      </div>

      {/* Words Grid Container */}
      <div className="grid grid-cols-3 gap-2.5 my-6">
        {words.map((word, index) => (
          <div 
            key={index} 
            className="flex items-center gap-2 px-3 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-white/[0.04] glass relative overflow-hidden"
          >
            <span className="text-[10px] font-extrabold text-indigo-400 w-4 block text-right shrink-0 select-none">
              {index + 1}
            </span>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 select-all">
              {word}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {/* Security Alert Warning Banner */}
        <div className="flex gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-400/80">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider">
              {language === "es" ? "Advertencia de Seguridad" : "Security Warning"}
            </h4>
            <p className="text-[10px] leading-relaxed mt-1">
              {language === "es" 
                ? "Nunca captures pantalla ni compartas esta frase. Quien la tenga tendrá control total de tus fondos."
                : "Never screenshot or share this. Anyone with these words can steal all your crypto balances."}
            </p>
          </div>
        </div>

        {/* Action Group */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleCopy}
            className="py-3 px-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:bg-white/10 active:scale-[0.98] transition flex justify-center items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400 animate-pulse" /> : <Copy className="w-4 h-4" />}
            {copied ? (language === "es" ? "Copiado!" : "Copied!") : (language === "es" ? "Copiar frase" : "Copy phrase")}
          </button>

          <button 
            onClick={() => onSuccess(mnemonic)}
            className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition flex justify-center items-center text-xs font-bold text-foreground shadow-[0_5px_15px_-5px_rgba(99,102,241,0.4)]"
          >
            <span>{language === "es" ? "Ya la guardé" : "I wrote it down"}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. CONFIRM SEED VIEW (Shuffle Puzzle)
// ==========================================
interface ConfirmSeedViewProps {
  mnemonic: string;
  onSuccess: () => void;
  onBack: () => void;
  language: "es" | "en";
}

export function ConfirmSeedView({ mnemonic, onSuccess, onBack, language }: ConfirmSeedViewProps) {
  const originalWords = mnemonic.split(" ");
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Shuffle words when view mounts
  useEffect(() => {
    const shuffle = [...originalWords].sort(() => Math.random() - 0.5);
    setShuffledWords(shuffle);
  }, []);

  const handleWordSelect = (word: string) => {
    setError(null);
    setSelectedWords(prev => [...prev, word]);
    setShuffledWords(prev => prev.filter(w => w !== word));
  };

  const handleWordRemove = (word: string) => {
    setError(null);
    setSelectedWords(prev => prev.filter(w => w !== word));
    setShuffledWords(prev => [...prev, word]);
  };

  const handleVerify = () => {
    const entered = selectedWords.join(" ");
    if (entered === mnemonic) {
      onSuccess();
    } else {
      setError(language === "es" ? "El orden es incorrecto. Comprueba tu frase." : "The word order is incorrect. Please check again.");
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background text-foreground animate-fade-in relative z-10">
      <div className="text-center pt-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-indigo-400" />
          {language === "es" ? "Verifica tu Semilla" : "Verify Secret Seed"}
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">
          {language === "es" 
            ? "Selecciona las palabras en el orden correcto (1 al 12) para verificar el respaldo."
            : "Select the words in the exact correct order (1 to 12) to verify your secure backup."}
        </p>
      </div>

      {/* Selected Slots Display Area */}
      <div className="min-h-[140px] p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 flex flex-wrap gap-1.5 content-start">
        {selectedWords.length === 0 ? (
          <div className="w-full h-full flex flex-col justify-center items-center gap-2 text-gray-600 mt-6 select-none">
            <Info className="w-5 h-5 text-gray-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {language === "es" ? "Palabras seleccionadas aparecerán aquí" : "Selected words will appear here"}
            </span>
          </div>
        ) : (
          selectedWords.map((word, i) => (
            <button
              key={i}
              onClick={() => handleWordRemove(word)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-xs font-bold text-indigo-300 hover:bg-indigo-600/20 transition-all duration-150 animate-[fadeIn_0.2s_ease-out]"
            >
              <span className="text-[9px] opacity-60 font-semibold">{i + 1}</span>
              <span>{word}</span>
            </button>
          ))
        )}
      </div>

      {/* Error Alert Display */}
      {error && (
        <p className="text-xs text-red-400 text-center animate-pulse-slow font-semibold my-2">
          {error}
        </p>
      )}

      {/* Random Word Pills Selector Area */}
      <div className="space-y-4">
        <div className="flex flex-wrap justify-center gap-2 p-2">
          {shuffledWords.map((word, i) => (
            <button
              key={i}
              onClick={() => handleWordSelect(word)}
              className="px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-100 dark:bg-white/5 border border-white/[0.06] text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-foreground transition active:scale-95"
            >
              {word}
            </button>
          ))}
        </div>

        {/* Action Group */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button 
            onClick={onBack}
            className="py-3.5 px-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-white/10 transition flex justify-center items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{language === "es" ? "Regresar" : "Back"}</span>
          </button>

          <button 
            disabled={selectedWords.length !== 12}
            onClick={handleVerify}
            className="py-3.5 px-4 rounded-xl bg-indigo-600 disabled:opacity-30 disabled:pointer-events-none hover:bg-indigo-500 active:scale-[0.98] transition flex justify-center items-center text-xs font-bold text-foreground shadow-[0_5px_15px_-5px_rgba(99,102,241,0.4)]"
          >
            <span>{language === "es" ? "Verificar" : "Verify & Enable"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. IMPORT SEED VIEW
// ==========================================
interface ImportSeedViewProps {
  onSuccess: (mnemonic: string) => void;
  onBack: () => void;
  language: "es" | "en";
}

export function ImportSeedView({ onSuccess, onBack, language }: ImportSeedViewProps) {
  const [seedText, setSeedText] = useState("");
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Trim multiple spaces, convert to lowercase, and check BIP39 validity
    const cleanText = seedText.trim().replace(/\s+/g, " ").toLowerCase();
    setIsValid(isValidMnemonic(cleanText));
  }, [seedText]);

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-background text-foreground animate-fade-in relative z-10">
      <div className="text-center pt-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
          <KeyRound className="w-6 h-6 text-indigo-400" />
          {language === "es" ? "Importar Billetera" : "Import Seed Wallet"}
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">
          {language === "es" 
            ? "Pega o escribe tu frase semilla BIP39 de 12 palabras para restaurar tu cuenta."
            : "Paste or write down your BIP39 12-word recovery seed phrase to restore your wallet."}
        </p>
      </div>

      <div className="my-6 space-y-3.5">
        <textarea
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
          placeholder={language === "es" ? "Ej: word1 word2 word3..." : "E.g. word1 word2 word3..."}
          className="w-full h-32 bg-card border border-gray-200 dark:border-white/5 rounded-2xl p-4 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200 resize-none font-medium leading-relaxed"
        />

        {/* Live Validation Indicator */}
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {language === "es" ? "Estado de frase" : "Phrase Status"}
          </span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isValid ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" : "bg-amber-500"}`} />
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isValid ? "text-emerald-400" : "text-amber-500"}`}>
              {seedText.length === 0 
                ? (language === "es" ? "Vacío" : "Empty")
                : (isValid 
                  ? (language === "es" ? "Frase válida" : "Valid phrase") 
                  : (language === "es" ? "Frase incompleta" : "Incomplete phrase"))
              }
            </span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button 
          onClick={onBack}
          className="py-3.5 px-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-white/10 transition"
        >
          <span>{language === "es" ? "Regresar" : "Cancel"}</span>
        </button>

        <button 
          disabled={!isValid}
          onClick={() => onSuccess(seedText.trim().replace(/\s+/g, " ").toLowerCase())}
          className="py-3.5 px-4 rounded-xl bg-indigo-600 disabled:opacity-30 disabled:pointer-events-none hover:bg-indigo-500 active:scale-[0.98] transition flex justify-center items-center text-xs font-bold text-foreground shadow-[0_5px_15px_-5px_rgba(99,102,241,0.4)]"
        >
          <span>{language === "es" ? "Importar" : "Import Wallet"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 6. ENTER PIN VIEW (Unlock Existing Wallet)
// ==========================================
interface EnterPinViewProps {
  onSuccess: (pin: string) => void;
  language: "es" | "en";
}

export function EnterPinView({ onSuccess, language }: EnterPinViewProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleKeyPress = (num: string) => {
    setError(null);
    if (pin.length < 6) setPin(prev => prev + num);
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) handleKeyPress(e.key);
      else if (e.key === "Backspace") handleBackspace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pin]);

  useEffect(() => {
    if (pin.length === 6) {
      const timer = setTimeout(async () => {
        try {
          await onSuccess(pin);
        } catch (err: any) {
          setError(err.message || (language === "es" ? "PIN Incorrecto." : "Incorrect PIN."));
          setPin("");
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pin]);

  return (
    <div className="flex-1 flex flex-col justify-between px-6 py-8 bg-background text-foreground animate-fade-in relative z-10">
      <div className="text-center pt-4">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
          <Fingerprint className="w-6 h-6 text-indigo-400 animate-pulse-slow" />
          {language === "es" ? "Desbloquear Billetera" : "Unlock Wallet"}
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          {language === "es" ? "Ingresa tu PIN de 6 dígitos para descifrar tus llaves" : "Enter your 6-digit security PIN to decrypt your keys"}
        </p>
      </div>

      {/* Dots display */}
      <div className="flex flex-col items-center gap-4 my-8">
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < pin.length 
                  ? "bg-indigo-500 border-indigo-500 scale-110 shadow-[0_0_12px_rgba(99,102,241,0.5)]" 
                  : "bg-transparent border-gray-300 dark:border-white/10"
              }`}
            />
          ))}
        </div>
        {error && (
          <p className="text-xs text-red-400 text-center animate-bounce mt-2 font-medium">
            {error}
          </p>
        )}
      </div>

      {/* Numeric Grid */}
      <div className="w-full max-w-xs mx-auto space-y-3.5 mb-2">
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-16 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-white/[0.04] text-xl font-bold hover:bg-gray-100 dark:bg-white/5 active:scale-[0.95] transition-all flex justify-center items-center"
            >
              {num}
            </button>
          ))}
          <button 
            onClick={() => setPin("")}
            className="h-16 rounded-2xl text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-300 flex justify-center items-center active:scale-[0.95] transition"
          >
            {language === "es" ? "Limpiar" : "Clear"}
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="h-16 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-white/[0.04] text-xl font-bold hover:bg-gray-100 dark:bg-white/5 active:scale-[0.95] transition-all flex justify-center items-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-16 rounded-2xl text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-300 flex justify-center items-center active:scale-[0.95] transition"
          >
            {language === "es" ? "Borrar" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. MULTICHAIN DASHBOARD VIEW (Phase 3, 4 & 5 Unified Portal)
// ==========================================
interface MultichainDashboardViewProps {
  language: "es" | "en";
}

type ActiveChain = "solana" | "bitcoin" | "bnb";
type ActiveTab = "wallet" | "send" | "receive" | "web3" | "history";

export function MultichainDashboardView({ language }: MultichainDashboardViewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    user,
    walletAddresses,
    logout,
    settings,
    updateSettings,
    lockWallet,
    transactions,
    addTransaction,
    nfts,
    removeNFT,
    connectedDApps,
    connectDApp,
    disconnectDApp,
    solanaBalance,
    btcBalance,
    bnbBalance,
    splTokens,
    isFetchingBalance,
    refreshAllBalances,
    refreshNFTs,
    cryptoPrices,
    startPricePolling,
  } = useWalletStore();

  useEffect(() => {
    startPricePolling();
  }, [startPricePolling]);

  const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
  const usdcBalance = splTokens.find(t => t.mint === USDC_MINT)?.uiAmount ?? 0;
  const bonkBalance = splTokens.find(t => t.mint === BONK_MINT)?.uiAmount ?? 0;

  // Navigation and Chain state
  const [activeTab, setActiveTab] = useState<ActiveTab>("wallet");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeChain, setActiveChain] = useState<ActiveChain>("solana");
  const [copied, setCopied] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);
  const [showFiatSimulator, setShowFiatSimulator] = useState(false);
  const [simulatedAmount, setSimulatedAmount] = useState("100");
  const [simulationStatus, setSimulationStatus] = useState<"idle" | "processing" | "success">("idle");

  // Drag to scroll hooks for mobile emulation
  const dashboardDrag = useDragToScroll();
  const nftDrag = useDragToScroll();
  const signingDrag = useDragToScroll();

  // Transaction Forms states
  const [sendAsset, setSendAsset] = useState<string>("SOL");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [sendAmount, setSendAmount] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "standard" | "high">("standard");
  const [sliderVal, setSliderVal] = useState<number>(0);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [sendPinPrompt, setSendPinPrompt] = useState<boolean>(false);
  const [sendPin, setSendPin] = useState<string>("");
  const [sendPinError, setSendPinError] = useState<string | null>(null);
  
  const [sendingStatus, setSendingStatus] = useState<"idle" | "broadcasting" | "success">("idle");
  const [sendTxid, setSendTxid] = useState<string | null>(null);

  // History Tab states
  const [historyFilter, setHistoryFilter] = useState<"all" | "send" | "receive">("all");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Web3 Hub states (Fase 5 features)
  const [web3SubTab, setWeb3SubTab] = useState<"nfts" | "dapps">("nfts");
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [nftRecipient, setNftRecipient] = useState<string>("");
  const [nftAddressError, setNftAddressError] = useState<string | null>(null);
  const [nftSliderVal, setNftSliderVal] = useState<number>(0);
  const [nftTransferStatus, setNftTransferStatus] = useState<"idle" | "broadcasting" | "success">("idle");

  // WalletConnect states (Fase 5 features)
  const [wcUri, setWcUri] = useState<string>("");
  const [wcError, setWcError] = useState<string | null>(null);
  const [proposedDApp, setProposedDApp] = useState<{ name: string; url: string; icon: string } | null>(null);
  const [wcProposal, setWcProposal] = useState<any>(null);
  const [signingDApp, setSigningDApp] = useState<ConnectedDApp | null>(null);
  const [signingPin, setSigningPin] = useState<string>("");
  const [signingPinError, setSigningPinError] = useState<string | null>(null);
  const [signingStatus, setSigningStatus] = useState<"idle" | "signing" | "success">("idle");
  const [wcRequest, setWcRequest] = useState<any>(null);

  // ==========================================
  // INACTIVITY SECURITY LOCK MECHANISM
  // ==========================================
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      lockWallet();
    }, 5 * 60 * 1000); 
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "touchstart"];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer));
    
    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
    };
  }, []);

  // ==========================================
  // CORE PRICE MODELS & ADDRESS FORMAT CONTROLLERS
  // ==========================================
  const prices = cryptoPrices;

  const balances: Record<string, number> = {
    SOL: solanaBalance ?? 0,
    BTC: btcBalance ?? 0,
    BNB: bnbBalance ?? 0,
    USDC: usdcBalance,
    USDT: 0,
    BONK: bonkBalance
  };

  const getChainFromAsset = (asset: string): ActiveChain => {
    if (["SOL", "USDC", "BONK"].includes(asset)) return "solana";
    if (asset === "BTC") return "bitcoin";
    return "bnb"; 
  };

  const getNativeOfChain = (chain: ActiveChain): string => {
    if (chain === "solana") return "SOL";
    if (chain === "bitcoin") return "BTC";
    return "BNB";
  };

  const usdBalances = {
    solana: (balances.SOL * prices.SOL) + (balances.USDC * prices.USDC) + (balances.BONK * prices.BONK),
    bitcoin: balances.BTC * prices.BTC,
    bnb: (balances.BNB * prices.BNB) + (balances.USDT * prices.USDT)
  };

  const totalUSDNetWorth = usdBalances.solana + usdBalances.bitcoin + usdBalances.bnb;
  const totalEURNetWorth = totalUSDNetWorth * 0.92;

  const activeAddress = walletAddresses?.[activeChain] || "No address derived";
  const shortAddress = activeAddress !== "No address derived" 
    ? `${activeAddress.slice(0, 8)}...${activeAddress.slice(-8)}`
    : activeAddress;

  // Filter transactions based on type (all, send, receive)
  const filteredTxs = (transactions || []).filter(tx => {
    if (historyFilter === "all") return true;
    return tx.type === historyFilter;
  });

  // Address validation logic
  useEffect(() => {
    if (!recipientAddress) {
      setAddressError(null);
      return;
    }
    const targetChain = getChainFromAsset(sendAsset);
    validateAddressFormat(recipientAddress, targetChain, setAddressError);
  }, [recipientAddress, sendAsset]);

  // NFT Address validation logic
  useEffect(() => {
    if (!nftRecipient || !selectedNFT) {
      setNftAddressError(null);
      return;
    }
    validateAddressFormat(nftRecipient, selectedNFT.chain, setNftAddressError);
  }, [nftRecipient, selectedNFT]);

  const validateAddressFormat = (address: string, chain: ActiveChain | "solana" | "bnb", setErrorFn: (err: string | null) => void) => {
    if (chain === "solana") {
      const isBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      if (!isBase58) {
        setErrorFn(language === "es" ? "Dirección Solana inválida (Base58 de 32-44 caract)." : "Invalid Solana Base58 Address (32-44 chars).");
      } else {
        setErrorFn(null);
      }
    } else if (chain === "bitcoin") {
      const isBech32 = /^bc1[ac-hj-np-z02-9]{25,62}$/i.test(address);
      const isLegacy = /^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
      if (!isBech32 && !isLegacy) {
        setErrorFn(language === "es" ? "Dirección Bitcoin inválida (SegWit bc1q... o Legacy 1...)." : "Invalid Bitcoin format (bc1q... or 1...).");
      } else {
        setErrorFn(null);
      }
    } else if (chain === "bnb") {
      const isHexAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
      if (!isHexAddress) {
        setErrorFn(language === "es" ? "Dirección EVM/BNB Chain inválida (Debe iniciar con 0x y tener 42 caract)." : "Invalid EVM hex format (Must start with 0x and be 42 chars).");
      } else {
        setErrorFn(null);
      }
    }
  };

  // Dynamic fee calculation based on priority and network standard
  const calculateFees = () => {
    const assetChain = getChainFromAsset(sendAsset);
    let baseFee = 0;
    
    if (assetChain === "solana") baseFee = 0.000005; 
    else if (assetChain === "bitcoin") baseFee = 0.00005;  
    else baseFee = 0.00025; 

    const mult = priority === "low" ? 0.7 : priority === "high" ? 2.0 : 1.0;
    const finalFee = baseFee * mult;
    const nativeSymbol = getNativeOfChain(assetChain);
    const feeUSD = finalFee * prices[nativeSymbol];

    return {
      crypto: finalFee,
      usd: feeUSD
    };
  };

  const activeFees = calculateFees();

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setSliderVal(val);
    if (val === 100) {
      const amountNum = parseFloat(sendAmount);
      if (isNaN(amountNum) || amountNum <= 0 || amountNum > balances[sendAsset] || addressError || !recipientAddress) {
        setSliderVal(0);
        return;
      }
      setSendPinPrompt(true);
    }
  };

  const handleNftSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setNftSliderVal(val);
    if (val === 100) {
      handleConfirmNftTransfer();
    }
  };

  useEffect(() => {
    if (sendPin.length === 6 && sendPinPrompt) {
      const verifyAndSend = setTimeout(() => {
        executeRealSend(sendPin);
      }, 300);
      return () => clearTimeout(verifyAndSend);
    }
  }, [sendPin, sendPinPrompt]);

  const executeRealSend = async (pin: string) => {
    const amountNum = parseFloat(sendAmount);
    setSendPinPrompt(false);
    setSendingStatus("broadcasting");
    setSendTxid(null);
    const activeChainType = getChainFromAsset(sendAsset);
    const amountUSD = amountNum * prices[sendAsset];
    
    const priorityMap: Record<string, "baja" | "estandar" | "alta"> = {
      low: "baja",
      standard: "estandar",
      high: "alta"
    };
    const txPriority = priorityMap[priority] || "estandar";

    try {
      const { encryptedSeedPayload } = useWalletStore.getState();
      if (!encryptedSeedPayload) throw new Error("No wallet payload found");
      const { decryptData } = await import("@/lib/crypto");
      const seed = await decryptData(encryptedSeedPayload, pin);
      
      const { deriveAllWallets } = await import("@/lib/multichain-derivation");
      const wallets = await deriveAllWallets(seed);

      let signature = "simulated_tx_hash";

      if (sendAsset === "SOL") {
        const { sendSOL } = await import("@/lib/transaction-service");
        signature = await sendSOL(wallets.solana.privateKeyBase58, recipientAddress, amountNum, txPriority);
      } else if (sendAsset === "BTC") {
        const { sendBTC } = await import("@/lib/btc-service");
        
        let attempts = 0;
        const maxAttempts = 2;
        let btcError: any = null;
        
        while (attempts < maxAttempts) {
          try {
            attempts++;
            signature = await sendBTC(wallets.bitcoin.privateKeyHex, recipientAddress, amountNum);
            btcError = null;
            break;
          } catch (err: any) {
            console.warn(`Intento ${attempts} de enviar BTC falló:`, err);
            btcError = err;
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        }
        
        if (btcError) {
          throw new Error(
            language === "es" 
              ? "La red está congestionada, intenta en unos minutos" 
              : "The network is congested, try again in a few minutes"
          );
        }
      } else if (sendAsset === "BNB") {
        const { sendBNB } = await import("@/lib/bnb-service");
        signature = await sendBNB(wallets.bnb.privateKeyHex, recipientAddress, amountNum);
      } else {
        throw new Error(language === "es" ? "Envío no disponible para esta red aún." : "Send not available for this network yet.");
      }

      await addTransaction({
        type: "send",
        chain: activeChainType as any,
        asset: sendAsset,
        amount: amountNum,
        amountUSD,
        recipient: recipientAddress,
        sender: walletAddresses?.[activeChainType as keyof typeof walletAddresses] || "Me",
        fee: activeFees.crypto,
        feeUSD: activeFees.usd
      });

      setSendTxid(signature);
      setSendingStatus("success");
      
      setTimeout(() => {
        setSendingStatus("idle");
        setSendAmount("");
        setRecipientAddress("");
        setSliderVal(0);
        setSendPin("");
        setSendPinError(null);
        refreshAllBalances();
      }, 5000);

    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes("Incorrect") || err.message.includes("PIN") || err.message.includes("mac"))) {
         setSendPinError(language === "es" ? "PIN incorrecto." : "Incorrect PIN.");
         setSendPin("");
         setSendPinPrompt(true);
         setSendingStatus("idle");
         setSliderVal(0);
      } else {
         alert(language === "es" ? "Error enviando: " + err.message : "Send Error: " + err.message);
         setSendingStatus("idle");
         setSliderVal(0);
         setSendPin("");
      }
    }
  };

  const handleConfirmNftTransfer = () => {
    alert(language === "es" ? "El envío de NFTs está deshabilitado temporalmente mientras se migra al nuevo modelo de seguridad." : "NFT transfer is temporarily disabled pending security migration.");
    setNftSliderVal(0);
    setNftTransferStatus("idle");
    setSelectedNFT(null);
  };

  // Initialize WalletConnect Listeners
  useEffect(() => {
    const initWC = async () => {
      const { getWeb3Wallet } = await import("@/lib/walletconnect-service");
      const wallet = await getWeb3Wallet();

      wallet.on("session_proposal", (proposal) => {
        setWcProposal(proposal);
        setProposedDApp({
          name: proposal.params.proposer.metadata.name,
          url: proposal.params.proposer.metadata.url,
          icon: proposal.params.proposer.metadata.icons?.[0] || "⚡"
        });
      });

      wallet.on("session_request", (request) => {
        // Intercepting actual signing request from a dApp
        console.log("WC Request:", request);
        setWcRequest(request);
        
        // Find the dApp in connected sessions
        const { topic } = request;
        const session = wallet.engine.signClient.session.get(topic);
        if (session) {
          setSigningDApp({
            id: topic,
            name: session.peer.metadata.name,
            url: session.peer.metadata.url,
            icon: session.peer.metadata.icons[0] || "⚡",
            connectedAt: new Date().toISOString()
          });
        }
        
        setSigningStatus("idle");
        setSigningPin("");
        setSigningPinError(null);
      });
    };
    initWC();
  }, []);

  // ==========================================
  // WALLETCONNECT DIALOG MANAGERS (Fase 5)
  // ==========================================
  const handleConnectWc = async (e: React.FormEvent) => {
    e.preventDefault();
    setWcError(null);

    // Validate WC URI structure: wc:topic@version?bridge...
    if (!wcUri.trim().startsWith("wc:")) {
      setWcError(language === "es" ? "Formato de URI de WalletConnect inválido. Debe iniciar con 'wc:'." : "Invalid WalletConnect URI. Must start with 'wc:'.");
      return;
    }

    try {
      const { pairWalletConnect } = await import("@/lib/walletconnect-service");
      await pairWalletConnect(wcUri);
      setWcUri("");
    } catch (err) {
      console.error(err);
      setWcError(language === "es" ? "Error al vincular con WalletConnect." : "Error pairing with WalletConnect.");
    }
  };

  const handleApproveConnection = async () => {
    if (proposedDApp && wcProposal) {
      try {
        const { approveSessionProposal } = await import("@/lib/walletconnect-service");
        await approveSessionProposal(
          wcProposal, 
          walletAddresses?.solana || "0x", 
          walletAddresses?.bnb || "0x"
        );
        
        connectDApp({
          name: proposedDApp.name,
          url: proposedDApp.url,
          icon: proposedDApp.icon
        });
        
        setProposedDApp(null);
        setWcProposal(null);
        setWcUri("");
        alert(language === "es" ? `¡Billetera vinculada a ${proposedDApp.name} con éxito!` : `Connected to ${proposedDApp.name} successfully!`);
      } catch (err) {
        console.error(err);
        alert(language === "es" ? "Error al aprobar la conexión." : "Error approving connection.");
      }
    }
  };

  const handlePINKeyPressSigning = (num: string) => {
    setSigningPinError(null);
    if (signingPin.length < 6) {
      setSigningPin(prev => prev + num);
    }
  };

  const handlePINBackspaceSigning = () => {
    setSigningPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (signingPin.length === 6) {
      const verify = setTimeout(() => {
        const { encryptedSeedPayload } = useWalletStore.getState();
        if (encryptedSeedPayload && signingDApp) {
          import("@/lib/crypto").then(async ({ decryptData }) => {
            try {
              // Verifies user PIN by decrypting the seed phrase
              const seed = await decryptData(encryptedSeedPayload, signingPin);
              setSigningStatus("signing");
              
              const { deriveAllWallets } = await import("@/lib/multichain-derivation");
              const wallets = await deriveAllWallets(seed);
              
              let signatureResult = null;
              
              if (wcRequest) {
                  const { method, params } = wcRequest.params.request;
                  
                  if (wcRequest.params.chainId.includes("solana")) {
                      const { Keypair, Transaction } = await import("@solana/web3.js");
                      const bs58 = (await import("bs58")).default;
                      const solanaKeypair = Keypair.fromSecretKey(bs58.decode(wallets.solana.privateKeyBase58));
                      
                      if (method === "solana_signMessage") {
                          const nacl = (await import("tweetnacl")).default;
                          const messageBytes = bs58.decode(params.message);
                          const signature = nacl.sign.detached(messageBytes, solanaKeypair.secretKey);
                          signatureResult = { signature: bs58.encode(signature) };
                      } else if (method === "solana_signTransaction") {
                          const txBytes = bs58.decode(params.transaction);
                          const tx = Transaction.from(txBytes);
                          tx.partialSign(solanaKeypair);
                          signatureResult = { signature: bs58.encode(tx.serialize()) };
                      }
                  } else if (wcRequest.params.chainId.includes("eip155")) {
                      const { Wallet } = await import("ethers");
                      const evmWallet = new Wallet(wallets.bnb.privateKeyHex);
                      
                      if (method === "personal_sign") {
                          const message = params[0];
                          signatureResult = await evmWallet.signMessage(message);
                      } else if (method === "eth_sendTransaction") {
                          const txParams = params[0];
                          signatureResult = await evmWallet.signTransaction(txParams);
                      }
                  }
                  
                  if (signatureResult) {
                      const { approveSessionRequest } = await import("@/lib/walletconnect-service");
                      await approveSessionRequest(wcRequest.topic, wcRequest.id, signatureResult);
                  }
              }

              setSigningStatus("success");
              setTimeout(() => {
                setSigningStatus("idle");
                setSigningPin("");
                setSigningDApp(null);
                setWcRequest(null);
              }, 1500);

            } catch (err) {
              console.error("Signing error:", err);
              setSigningPinError(language === "es" ? "PIN incorrecto o error al firmar." : "Incorrect PIN or signing error.");
              setSigningPin("");
            }
          });
        }
      }, 300);
      return () => clearTimeout(verify);
    }
  }, [signingPin, wcRequest, signingDApp]);

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground animate-fade-in min-h-0 overflow-hidden relative pb-20">
      
      <ProfileView isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      
      {/* ==========================================
          MAIN NAVIGATION CONTENT RENDERING SWITCH
          ========================================== */}
      <div 
        ref={dashboardDrag.ref}
        className="flex-1 overflow-y-auto px-5 py-4 pb-24 scrollbar-thin min-h-0"
      >
        
        {/* TAB 1: CARTERA (WALLET) */}
        {activeTab === "wallet" && (
          <div className="space-y-5">

            {/* View Mode Toggle */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex justify-center items-center text-indigo-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    {language === "es" ? "Hola, bienvenido" : "Welcome back"}
                  </p>
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {user?.username || (language === "es" ? "Usuario Aether" : "Aether User")}
                  </h3>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsProfileOpen(true)} 
                  className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex justify-center items-center text-indigo-400 hover:bg-indigo-500/20 transition shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                  title={language === "es" ? "Perfil" : "Profile"}
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Aggregated Net Worth Card */}
            <div className="relative overflow-hidden p-6 rounded-3xl bg-card shadow-lg border border-gray-200 dark:border-white/5 flex flex-col items-center text-center">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[30px] pointer-events-none"></div>
              
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                {language === "es" ? "Valor de Cuenta Agregado" : "Aggregated Portfolio Value"}
              </span>

              <h1 
                onClick={() => setHideBalances(!hideBalances)}
                className="text-3xl font-black text-foreground tracking-tight cursor-pointer hover:opacity-85 transition select-none flex items-center justify-center min-h-[40px]"
              >
                {hideBalances 
                  ? "•••••" 
                  : (settings.preferredCurrency === "USD" 
                      ? `$${totalUSDNetWorth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `€${totalEURNetWorth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    )
                }
              </h1>

              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-indigo-400 font-bold tracking-wider uppercase">
                  {activeChain === "solana" ? (language === "es" ? "Solana Mainnet" : "Solana Mainnet") : activeChain === "bitcoin" ? (language === "es" ? "Red Bitcoin" : "Bitcoin Network") : "BNB Smart Chain"}
                </p>
                <button
                  onClick={refreshAllBalances}
                  disabled={isFetchingBalance}
                  className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFetchingBalance
                    ? (language === "es" ? "Actualizando..." : "Refreshing...")
                    : (language === "es" ? "↻ Actualizar" : "↻ Refresh")}
                </button>
              </div>
            </div>

            {/* Buy Crypto Button (Fiat Onramp Simulator) */}
            <button 
              onClick={() => {
                setSimulationStatus("idle");
                setShowFiatSimulator(true);
              }}
              className="w-full mb-4 py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-sm tracking-wide transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 group"
            >
              <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {language === "es" ? "Comprar Cripto" : "Buy Crypto"}
            </button>

            {/* Network Selector Bar */}
            <div className="p-1 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 grid grid-cols-3 gap-1">
              {(["solana", "bitcoin", "bnb"] as ActiveChain[]).map((chain) => {
                const isActive = activeChain === chain;
                const chainLabel = chain === "solana" ? "Solana" : chain === "bitcoin" ? "Bitcoin" : "BNB Chain";
                
                return (
                  <button
                    key={chain}
                    onClick={() => {
                      setActiveChain(chain);
                    }}
                    className={`py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 flex flex-col items-center gap-1.5 ${
                      isActive 
                        ? "bg-card border border-gray-200 dark:border-white/5 text-foreground shadow-lg" 
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    
                    <div className="flex justify-center items-center h-6 mb-0.5 relative">
                      {isActive && <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full"></div>}
                      {chain === "solana" && <SolanaIcon className={`${isActive ? 'w-5 h-5' : 'w-4 h-4 opacity-50'} transition-all`} />}
                      {chain === "bitcoin" && <BitcoinIcon className={`${isActive ? 'w-5 h-5' : 'w-4 h-4 opacity-50'} transition-all`} />}
                      {chain === "bnb" && <BnbIcon className={`${isActive ? 'w-5 h-5' : 'w-4 h-4 opacity-50'} transition-all`} />}
                    </div>
                    <span>{chainLabel}</span>

                  </button>
                );
              })}
            </div>

            {/* Active Address View Card */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.01] border border-white/[0.04] flex justify-between items-center">
              <div>
                <p className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">
                  {language === "es" ? `Dirección de ${activeChain.toUpperCase()}` : `${activeChain.toUpperCase()} Address`}
                </p>
                <p className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 mt-1 select-all">
                  {shortAddress}
                </p>
              </div>
              
              <button 
                onClick={handleCopyAddress}
                className="w-8 h-8 rounded-xl bg-white/[0.03] hover:bg-gray-100 dark:bg-white/5 active:scale-95 border border-gray-200 dark:border-white/5 flex justify-center items-center text-indigo-400 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Fee Card below address — per network */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex justify-center items-center text-emerald-500">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">
                    {language === "es" ? "Comisión de Red" : "Network Fee"}
                  </p>
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    {activeChain === 'solana' && "0.000005 SOL / tx"}
                    {activeChain === 'bitcoin' && "1 sat/vByte (Mínima)"}
                    {activeChain === 'bnb' && "0.000021 BNB / tx"}
                  </p>
                </div>
              </div>
              <div className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-wider px-2 py-1 bg-emerald-500/10 rounded-lg">
                {language === "es" ? "Más Bajas" : "Lowest"}
              </div>
            </div>

            {/* Token lists dynamically rendered */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest px-1 block">
                {language === "es" ? "Saldos del Protocolo" : "Protocol Balances"}
              </h4>

              <div className="space-y-2">
                {activeChain === "solana" && (
                  <>
                    <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.01] hover:bg-gray-50 dark:bg-white/[0.02] border border-white/[0.03]">
                      <div className="flex items-center gap-3">
                        <SolanaIcon className="w-9 h-9" />
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">Solana</h4>
                          <p className="text-[9px] text-gray-500">${prices.SOL}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{hideBalances ? "••••" : `${balances.SOL} SOL`}</p>
                        <p className="text-[9px] text-gray-500">{hideBalances ? "••••" : `$${(balances.SOL * prices.SOL).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.01] hover:bg-gray-50 dark:bg-white/[0.02] border border-white/[0.03]">
                      <div className="flex items-center gap-3">
                        <UsdcIcon className="w-9 h-9" />
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">USD Coin</h4>
                          <p className="text-[9px] text-gray-500">$1.00</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{hideBalances ? "••••" : `${balances.USDC} USDC`}</p>
                        <p className="text-[9px] text-gray-500">{hideBalances ? "••••" : `$${balances.USDC.toFixed(2)}`}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.01] hover:bg-gray-50 dark:bg-white/[0.02] border border-white/[0.03]">
                      <div className="flex items-center gap-3">
                        <BonkIcon className="w-9 h-9" />
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">Bonk Token</h4>
                          <p className="text-[9px] text-gray-500">$0.00002</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{hideBalances ? "••••" : `${balances.BONK.toLocaleString()} BONK`}</p>
                        <p className="text-[9px] text-gray-500">{hideBalances ? "••••" : `$${(balances.BONK * prices.BONK).toFixed(2)}`}</p>
                      </div>
                    </div>
                  </>
                )}

                {activeChain === "bitcoin" && (
                  <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.01] hover:bg-gray-50 dark:bg-white/[0.02] border border-white/[0.03]">
                    <div className="flex items-center gap-3">
                      <BitcoinIcon className="w-9 h-9" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">Bitcoin</h4>
                        <p className="text-[9px] text-gray-500">${prices.BTC.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{hideBalances ? "••••" : `${balances.BTC} BTC`}</p>
                      <p className="text-[9px] text-gray-500">{hideBalances ? "••••" : `$${usdBalances.bitcoin.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}</p>
                    </div>
                  </div>
                )}

                {activeChain === "bnb" && (
                  <>
                    <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.01] hover:bg-gray-50 dark:bg-white/[0.02] border border-white/[0.03]">
                      <div className="flex items-center gap-3">
                        <BnbIcon className="w-9 h-9" />
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">BNB</h4>
                          <p className="text-[9px] text-gray-500">${prices.BNB}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{hideBalances ? "••••" : `${balances.BNB} BNB`}</p>
                        <p className="text-[9px] text-gray-500">{hideBalances ? "••••" : `$${(balances.BNB * prices.BNB).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.01] hover:bg-gray-50 dark:bg-white/[0.02] border border-white/[0.03]">
                      <div className="flex items-center gap-3">
                        <UsdtIcon className="w-9 h-9" />
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">Tether BEP20</h4>
                          <p className="text-[9px] text-gray-500">$1.00</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{hideBalances ? "••••" : `${balances.USDT} USDT`}</p>
                        <p className="text-[9px] text-gray-500">{hideBalances ? "••••" : `$${balances.USDT.toFixed(2)}`}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>


          </div>
        )}

        {/* TAB 2: ENVIAR (SEND) */}
        {activeTab === "send" && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center pt-2">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-indigo-400" />
                {language === "es" ? "Enviar Activos" : "Send Crypto"}
              </h2>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                {language === "es" ? "Transfiere fondos a cualquier billetera con verificación de red" : "Transfer assets to any wallet with network validation"}
              </p>
            </div>

            {sendingStatus === "broadcasting" ? (
              <div className="py-16 flex flex-col justify-center items-center gap-6 animate-pulse">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="text-center">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {language === "es" ? "Firmando Transacción..." : "Signing Transaction..."}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {language === "es" ? "Transmitiendo datos a los nodos de la Blockchain" : "Broadcasting payload details to blockchain nodes"}
                  </p>
                </div>
              </div>
            ) : sendingStatus === "success" ? (
              <div className="py-16 flex flex-col justify-center items-center gap-4 animate-[fadeIn_0.3s_ease-out]">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex justify-center items-center text-emerald-400">
                  <Check className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wider">
                    {language === "es" ? "¡Envío Exitoso!" : "Broadcast Success!"}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                    {language === "es" ? "Transacción registrada. Comprobando confirmación..." : "Transaction submitted. Waiting for confirmation..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Asset Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">
                    {language === "es" ? "Activo a enviar" : "Asset Token"}
                  </label>
                  <select 
                    value={sendAsset}
                    onChange={(e) => {
                      setSendAsset(e.target.value);
                      setRecipientAddress("");
                    }}
                    className="w-full bg-card border border-gray-200 dark:border-white/5 rounded-xl py-3 px-4 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="SOL">Solana (SOL) - Balance: {balances.SOL}</option>
                    <option value="USDC">USD Coin (USDC) - Balance: {balances.USDC}</option>
                    <option value="BONK">Bonk Token (BONK) - Balance: {balances.BONK.toLocaleString()}</option>
                    <option value="BTC">Bitcoin (BTC) - Balance: {balances.BTC}</option>
                    <option value="BNB">BNB Coin (BNB) - Balance: {balances.BNB}</option>
                  </select>
                  
                  {/* Testnet Faucet Links */}
                  {sendAsset === "SOL" && (
                    <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="text-[9px] text-indigo-400 hover:underline block pt-1">
                      {language === "es" ? "Obtener SOL de prueba (Devnet Faucet) ➔" : "Get Test SOL (Devnet Faucet) ➔"}
                    </a>
                  )}
                  {sendAsset === "BTC" && (
                    <a href="https://testnet-faucet.com/btc-testnet/" target="_blank" rel="noreferrer" className="text-[9px] text-orange-400 hover:underline block pt-1">
                      {language === "es" ? "Obtener BTC de prueba (Testnet Faucet) ➔" : "Get Test BTC (Testnet Faucet) ➔"}
                    </a>
                  )}
                  {sendAsset === "BNB" && (
                    <a href="https://testnet.bnbchain.org/faucet-smart" target="_blank" rel="noreferrer" className="text-[9px] text-yellow-500 hover:underline block pt-1">
                      {language === "es" ? "Obtener BNB de prueba (Testnet Faucet) ➔" : "Get Test BNB (Testnet Faucet) ➔"}
                    </a>
                  )}
                </div>

                {/* Recipient Address */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">
                    {language === "es" ? "Dirección del Destinatario" : "Recipient Address"}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder={
                        getChainFromAsset(sendAsset) === "solana"
                          ? (language === "es" ? "Dirección Solana Base58" : "Solana Base58 Address")
                          : getChainFromAsset(sendAsset) === "bitcoin"
                            ? (language === "es" ? "Dirección Bitcoin SegWit/Legacy" : "Bitcoin SegWit/Legacy Address")
                            : (language === "es" ? "Dirección EVM 0x..." : "EVM Address 0x...")
                      }
                      className={`w-full bg-card border rounded-xl py-3 pl-4 pr-12 text-xs text-foreground placeholder-gray-600 focus:outline-none transition-all duration-200 ${
                        addressError
                          ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          : recipientAddress && !addressError
                            ? "border-emerald-500/30 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            : "border-gray-200 dark:border-white/5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      title={language === "es" ? "Escanear QR" : "Scan QR"}
                    >
                      <QrCode className="w-5 h-5" />
                    </button>
                  </div>
                  {addressError && (
                    <p className="text-[10px] text-red-400 font-bold block pt-1 animate-pulse-slow">
                      {addressError}
                    </p>
                  )}
                </div>

                {/* Amount input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                      {language === "es" ? "Monto" : "Amount"}
                    </label>
                    <span className="text-[10px] font-bold text-gray-500">
                      {language === "es" ? `Máximo: ${balances[sendAsset]} ${sendAsset}` : `Max: ${balances[sendAsset]} ${sendAsset}`}
                    </span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      required
                      step="any"
                      min="0"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-card border border-gray-200 dark:border-white/5 rounded-xl py-3 pl-4 pr-16 text-sm font-bold text-foreground focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-black text-indigo-400 select-none">
                      {sendAsset}
                    </span>
                  </div>
                  {sendAmount && parseFloat(sendAmount) > balances[sendAsset] && (
                    <p className="text-[10px] text-red-400 font-bold block pt-1">
                      {language === "es" ? "Saldo insuficiente para realizar el envío." : "Insufficient balance to transfer."}
                    </p>
                  )}
                </div>

                {/* Priority Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">
                    {language === "es" ? "Prioridad de Transacción" : "Transaction Priority"}
                  </label>
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 p-1 rounded-xl">
                    {(["low", "standard", "high"] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                          priority === p 
                            ? "bg-indigo-600 text-foreground shadow" 
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {p === "low" ? (language === "es" ? "Baja" : "Low") : p === "standard" ? (language === "es" ? "Estándar" : "Standard") : (language === "es" ? "Alta" : "Fast")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estimate fee summary */}
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.01] border border-white/[0.03] flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                      {language === "es" ? "Comisión de Red Estimada" : "Estimated Gas Fee"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-indigo-400">
                      {activeFees.crypto.toFixed(6)} {getNativeOfChain(getChainFromAsset(sendAsset))}
                    </p>
                    <p className="text-[9px] text-gray-500">
                      ~ ${activeFees.usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </p>
                  </div>
                </div>

                {/* Slider range confirms */}
                <div className="pt-4">
                  <div className="relative h-14 w-full rounded-2xl bg-gray-800 dark:bg-white/[0.02] border border-white/[0.06] overflow-hidden flex items-center justify-center glass shadow-inner">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-600 to-indigo-500/80 transition-all duration-75 pointer-events-none opacity-30"
                      style={{ width: `${sliderVal}%` }}
                    />
                    
                    <span className="text-xs font-extrabold tracking-wider text-gray-300 animate-pulse pointer-events-none select-none relative z-10">
                      {sliderVal >= 80 
                        ? (language === "es" ? "Suelta para Confirmar" : "Release to Confirm") 
                        : (language === "es" ? "Desliza para Enviar ➔" : "Slide to Transfer ➔")
                      }
                    </span>

                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={sliderVal}
                      onChange={handleSliderChange}
                      onMouseUp={() => {
                        if (sliderVal < 90) setSliderVal(0);
                      }}
                      onTouchEnd={() => {
                        if (sliderVal < 90) setSliderVal(0);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                    />

                    <div 
                      className="absolute left-1.5 w-11 h-11 rounded-xl bg-indigo-500 border border-indigo-400 shadow-[0_3px_12px_rgba(99,102,241,0.4)] flex justify-center items-center text-foreground font-extrabold pointer-events-none transition-all duration-75"
                      style={{ left: `calc(${sliderVal}% - ${sliderVal * 0.44}px + 6px)` }}
                    >
                      <ArrowRight className="w-5 h-5 text-foreground" />
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 3: RECIBIR (RECEIVE) */}
        {activeTab === "receive" && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center pt-2">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                {language === "es" ? "Recibir Activos" : "Receive Crypto"}
              </h2>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                {language === "es" ? "Muestra tu código QR personalizado para recibir depósitos" : "Display your custom QR code to receive deposits"}
              </p>
            </div>

            {/* Network Picker */}
            <div className="p-1 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 grid grid-cols-3 gap-1">
              {(["solana", "bitcoin", "bnb"] as ActiveChain[]).map((chain) => {
                const isActive = activeChain === chain;
                const label = chain === "solana" ? "Solana" : chain === "bitcoin" ? "Bitcoin" : "BNB Chain";
                
                return (
                  <button
                    key={chain}
                    onClick={() => {
                      setActiveChain(chain);
                    }}
                    className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition ${
                      isActive 
                        ? "bg-card border border-gray-200 dark:border-white/5 text-foreground shadow" 
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom QR Image */}
            <div className="flex flex-col items-center gap-6 my-8 relative z-10">
              <div className="p-4 rounded-[32px] bg-card border border-gray-200 dark:border-white/5 shadow-2xl flex justify-center items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${activeAddress}&color=${isDark ? '99-102-241' : '79-70-229'}&bgcolor=${isDark ? '21-26-36' : 'ffffff'}&margin=12`}
                  alt="Address QR Code"
                  className="w-[180px] h-[180px] rounded-2xl relative z-10 border border-gray-200 dark:border-white/5 select-none"
                />
              </div>

              <div className="w-full text-center space-y-3.5">
                <p className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">
                  {language === "es" ? "Tu dirección de depósito" : "Your Deposit Address"}
                </p>

                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.01] border border-white/[0.03] font-mono text-[10px] text-gray-700 dark:text-gray-300 break-all select-all flex justify-between items-center gap-3">
                  <span className="leading-relaxed select-all text-left">{activeAddress}</span>
                  <button 
                    onClick={handleCopyAddress}
                    className="w-8 h-8 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/25 text-indigo-400 flex justify-center items-center shrink-0 transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: WEB3 HUB (Fase 5 Visualizer Portal)
            ========================================== */}
        {activeTab === "web3" && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center pt-2">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                Aether Web3 Hub
              </h2>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                {language === "es" ? "Explora tus coleccionables NFTs y sincronízate a DApps del ecosistema" : "Browse your NFT collections and link securely to DApps"}
              </p>
            </div>

            {/* Sub-selector tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-2xl">
              <button 
                onClick={() => setWeb3SubTab("nfts")}
                className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  web3SubTab === "nfts" ? "bg-card border border-gray-200 dark:border-white/5 text-foreground shadow" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"
                }`}
              >
                {language === "es" ? "Coleccionables" : "Collectibles"}
              </button>
              <button 
                onClick={() => setWeb3SubTab("dapps")}
                className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  web3SubTab === "dapps" ? "bg-card border border-gray-200 dark:border-white/5 text-foreground shadow" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"
                }`}
              >
                WalletConnect
              </button>
            </div>

            {/* Sub-tab A: NFTs grid collectibles */}
            {web3SubTab === "nfts" && (
              <div className="space-y-3">
                {nfts.length === 0 ? (
                  <div className="py-16 text-center text-gray-600 flex flex-col justify-center items-center gap-2">
                    <Layers className="w-6 h-6 text-gray-600 animate-pulse" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">
                      {language === "es" ? "Sin NFTs en el inventario" : "No NFTs in your vault"}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5">
                    {nfts.map((nft) => (
                      <div 
                        key={nft.id}
                        onClick={() => {
                          setSelectedNFT(nft);
                          setNftRecipient("");
                          setNftAddressError(null);
                          setNftSliderVal(0);
                        }}
                        className="rounded-2xl bg-gray-50 dark:bg-white/[0.01] hover:bg-gray-50 dark:bg-white/[0.02] border border-white/[0.03] overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] group"
                      >
                        {/* CSS abstract generative gradients representing the art */}
                        <div 
                          className="h-28 w-full transition-all duration-300 group-hover:opacity-90"
                          style={{ background: nft.imageUrl }}
                        />
                        <div className="p-3 space-y-1">
                          <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wide block">{nft.collection}</span>
                          <h4 className="text-xs font-black text-gray-800 dark:text-gray-200 truncate">{nft.name}</h4>
                          <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-widest block">{nft.chain.toUpperCase()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab B: DApps Connectors */}
            {web3SubTab === "dapps" && (
              <div className="space-y-5">
                {/* Popular dApps Gallery */}
                <div className="space-y-3 mb-6">
                  <h4 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest px-1 block">
                    {language === "es" ? "dApps Populares" : "Popular dApps"}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'Jupiter', desc: 'Swap en Solana', url: 'https://jup.ag', icon: '🪐', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
                      { name: 'PancakeSwap', desc: 'DEX en BNB', url: 'https://pancakeswap.finance', icon: '🥞', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
                      { name: 'Raydium', desc: 'AMM en Solana', url: 'https://raydium.io', icon: '⚡', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
                      { name: 'Magic Eden', desc: 'Mercado NFT', url: 'https://magiceden.io', icon: '🪄', color: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20' },
                    ].map(app => (
                      <button 
                        key={app.name}
                        onClick={() => window.open(app.url, '_blank')}
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-all group"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-2 border ${app.color}`}>
                          {app.icon}
                        </div>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{app.name}</span>
                        <span className="text-[9px] text-gray-500">{app.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* WalletConnect scanned inputs */}
                <form onSubmit={handleConnectWc} className="space-y-3 bg-gray-50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {language === "es" ? "Conexión WalletConnect" : "Link WalletConnect"}
                    </h4>
                  </div>
                  <p className="text-[9px] text-gray-500 leading-normal">
                    {language === "es" ? "Pega una URI de WalletConnect (ej. 'wc:jupiter...') para simular un enlace" : "Paste a WalletConnect URI (e.g. 'wc:jupiter...') to simulate link permissions"}
                  </p>
                  <div className="relative">
                    <input 
                      type="text"
                      value={wcUri}
                      onChange={(e) => setWcUri(e.target.value)}
                      placeholder="wc:4a28f89...bridge"
                      className="w-full bg-card border border-gray-200 dark:border-white/5 rounded-xl py-3 px-4 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  {wcError && (
                    <p className="text-[9px] text-red-400 font-bold block pt-0.5 animate-bounce">{wcError}</p>
                  )}
                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-[10px] font-extrabold uppercase tracking-wider text-foreground rounded-xl transition"
                  >
                    {language === "es" ? "Enviar Solicitud" : "Submit Connection Link"}
                  </button>
                </form>

                {/* Connections List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest px-1 block">
                    {language === "es" ? "Conexiones Activas" : "Active Links"}
                  </h4>

                  {connectedDApps.length === 0 ? (
                    <div className="py-8 text-center text-gray-600 flex flex-col justify-center items-center gap-2">
                      <Globe className="w-5 h-5 text-gray-600" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {language === "es" ? "Sin conexiones activas" : "No active dApp links"}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {connectedDApps.map((dapp) => (
                        <div 
                          key={dapp.id}
                          className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.01] border border-white/[0.03] transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex justify-center items-center text-sm">
                              {dapp.icon}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">{dapp.name}</h4>
                              <p className="text-[9px] text-gray-500 font-mono">{dapp.url}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setSigningDApp(dapp);
                                setSigningPin("");
                                setSigningPinError(null);
                                setSigningStatus("idle");
                              }}
                              className="py-1.5 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[9px] font-extrabold uppercase rounded-lg transition"
                            >
                              {language === "es" ? "Firmar" : "Sign"}
                            </button>
                            <button
                              onClick={() => disconnectDApp(dapp.id)}
                              className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex justify-center items-center transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 5: HISTORIAL (HISTORY) */}
        {activeTab === "history" && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center pt-2">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                {language === "es" ? "Historial" : "Ledger History"}
              </h2>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                {language === "es" ? "Registro cronológico de tus movimientos en la Blockchain" : "Chronological ledger record of your blockchain actions"}
              </p>
            </div>

            {/* Type filters */}
            <div className="p-1 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 grid grid-cols-3 gap-1">
              {(["all", "send", "receive"] as const).map((filter) => {
                const isActive = historyFilter === filter;
                const label = filter === "all" ? (language === "es" ? "Todas" : "All") : filter === "send" ? (language === "es" ? "Enviadas" : "Sent") : (language === "es" ? "Recibidas" : "Received");
                
                return (
                  <button
                    key={filter}
                    onClick={() => setHistoryFilter(filter)}
                    className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition ${
                      isActive 
                        ? "bg-card border border-gray-200 dark:border-white/5 text-foreground shadow" 
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Chronological list */}
            <div className="space-y-2">
              {filteredTxs.length === 0 ? (
                <div className="py-12 text-center text-gray-600 flex flex-col justify-center items-center gap-2">
                  <Info className="w-6 h-6 text-gray-600 animate-pulse" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">
                    {language === "es" ? "Sin registros para este filtro" : "No registries for this filter"}
                  </span>
                </div>
              ) : (
                filteredTxs.map((tx) => {
                  const isSend = tx.type === "send";
                  const date = new Date(tx.timestamp).toLocaleString("es-ES", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div 
                      key={tx.id} 
                      onClick={() => setSelectedTx(tx)}
                      className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.01] hover:bg-gray-50 dark:bg-white/[0.02] border border-white/[0.03] cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex justify-center items-center font-bold ${
                          isSend 
                            ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {isSend ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-[150px]">
                            {isSend 
                              ? (language === "es" ? `Envío de ${tx.asset}` : `Sent ${tx.asset}`)
                              : (language === "es" ? `Recepción de ${tx.asset}` : `Received ${tx.asset}`)
                            }
                          </h4>
                          <p className="text-[9px] text-gray-500 font-semibold">{date}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-bold ${isSend ? "text-red-400" : "text-emerald-400"}`}>
                          {isSend ? "-" : "+"}{tx.amount} {tx.asset.length > 6 ? tx.asset.slice(0,5) + "..." : tx.asset}
                        </p>
                        
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          {tx.status === "pending" ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] font-black text-amber-500 animate-pulse uppercase">Pendiente</span>
                              <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                            </div>
                          ) : (
                            <span className="text-[9px] text-gray-500 font-bold">${tx.amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* ==========================================
          TRANSACTION DETAIL VIEW MODAL DIALOG
          ========================================== */}
      {selectedTx && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col justify-end animate-[fadeIn_0.2s_ease-out]">
          <div className="p-6 bg-card rounded-t-[32px] border-t border-gray-200 dark:border-white/5 space-y-5 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="text-center">
              <div className="w-12 h-1 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-4"></div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                {language === "es" ? "Detalle de Transacción" : "Transaction Details"}
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-white/5">
                <span className="text-gray-500">{language === "es" ? "ID de Operación" : "Operation ID"}</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">{selectedTx.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-white/5">
                <span className="text-gray-500">{language === "es" ? "Tipo" : "Type"}</span>
                <span className={`font-black uppercase tracking-wider ${selectedTx.type === "send" ? "text-red-400" : "text-emerald-400"}`}>
                  {selectedTx.type === "send" ? (language === "es" ? "Envío" : "Send") : (language === "es" ? "Recepción" : "Receive")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-white/5">
                <span className="text-gray-500">{language === "es" ? "Red de Blockchain" : "Blockchain Network"}</span>
                <span className="font-bold text-indigo-400 uppercase font-mono">{selectedTx.chain}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-white/5">
                <span className="text-gray-500">{language === "es" ? "Monto Enviado" : "Amount Sent"}</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[200px] block text-right">{selectedTx.amount} {selectedTx.asset} (~${selectedTx.amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-white/5">
                <span className="text-gray-500">{language === "es" ? "Comisión pagada" : "Comission paid"}</span>
                <span className="font-bold text-gray-600 dark:text-gray-400">{selectedTx.fee.toFixed(6)} {getNativeOfChain(selectedTx.chain)} (~${selectedTx.feeUSD.toFixed(3)})</span>
              </div>
              <div className="space-y-1.5 py-1">
                <span className="text-gray-500 block">{language === "es" ? "Hash Criptográfico de Tx" : "Cryptographical Tx Hash"}</span>
                <span className="font-mono text-[9px] text-gray-600 dark:text-gray-400 break-all block bg-background p-2 rounded-lg border border-gray-200 dark:border-white/5 leading-relaxed">{selectedTx.hash}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => {
                  alert(language === "es" 
                    ? `Abriendo explorador simulado para hash: ${selectedTx.hash.slice(0, 10)}...` 
                    : `Opening simulated explorer for hash: ${selectedTx.hash.slice(0,10)}...`
                  );
                }}
                className="py-3 px-4 rounded-xl bg-indigo-600 text-xs font-bold text-foreground transition hover:bg-indigo-500 active:scale-95 flex justify-center items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{language === "es" ? "Ver Explorador" : "Explorer link"}</span>
              </button>
              <button 
                onClick={() => setSelectedTx(null)}
                className="py-3 px-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-white/10 transition active:scale-95"
              >
                {language === "es" ? "Cerrar" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          NFT DETAILED CARD DIALOG MODAL (Fase 5)
          ========================================== */}
      {selectedNFT && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col justify-end animate-[fadeIn_0.2s_ease-out]">
          <div 
            ref={nftDrag.ref}
            className="p-5 bg-card rounded-t-[32px] border-t border-gray-200 dark:border-white/5 max-h-[85vh] overflow-y-auto space-y-4 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] scrollbar-thin cursor-grab select-none"
          >
            
            <div className="text-center">
              <div className="w-12 h-1 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-3"></div>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{selectedNFT.collection}</span>
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider mt-1">{selectedNFT.name}</h3>
            </div>

            {nftTransferStatus === "broadcasting" ? (
              <div className="py-12 flex flex-col justify-center items-center gap-6 animate-pulse">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="text-center">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">{language === "es" ? "Transfiriendo Coleccionable..." : "Transferring Collectible..."}</h4>
                  <p className="text-[9px] text-gray-500 mt-1">{language === "es" ? "Actualizando propiedad en la Blockchain" : "Broadcasting asset transfer ledger logs"}</p>
                </div>
              </div>
            ) : nftTransferStatus === "success" ? (
              <div className="py-12 flex flex-col justify-center items-center gap-4 animate-[fadeIn_0.3s_ease-out]">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex justify-center items-center text-emerald-400">
                  <Check className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">{language === "es" ? "¡Transferencia Exitosa!" : "Transfer Completed!"}</h4>
                  <p className="text-[9px] text-gray-500 mt-1">{language === "es" ? "El NFT ha sido transferido." : "デジタルコレクティブル has been transferred."}</p>
                </div>
              </div>
            ) : (
              <>
                {/* NFT Visual Display */}
                <div 
                  className="h-44 w-full rounded-2xl border border-gray-200 dark:border-white/5 shadow-2xl relative overflow-hidden"
                  style={{ background: selectedNFT.imageUrl }}
                />

                {/* NFT Metadata details */}
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 space-y-2.5 text-xs">
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{selectedNFT.description}</p>
                  
                  <div className="border-t border-gray-200 dark:border-white/5 pt-2.5 space-y-1.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Red:</span>
                      <span className="font-extrabold text-indigo-400 uppercase">{selectedNFT.chain}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Contract ID / Mint:</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300 font-mono">{`${selectedNFT.mintAddress.slice(0, 8)}...${selectedNFT.mintAddress.slice(-8)}`}</span>
                    </div>
                  </div>
                </div>

                {/* Secure NFT Outbound transfer Form */}
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-3">
                  <h4 className="text-[10px] font-extrabold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">
                    {language === "es" ? "Enviar a otra billetera" : "Transfer Collectible"}
                  </h4>

                  <div className="space-y-2">
                    <input 
                      type="text"
                      value={nftRecipient}
                      onChange={(e) => setNftRecipient(e.target.value)}
                      placeholder={
                        selectedNFT.chain === "solana" 
                          ? (language === "es" ? "Dirección Solana Base58" : "Solana Destination Address")
                          : (language === "es" ? "Dirección EVM 0x..." : "EVM Destination Address 0x...")
                      }
                      className={`w-full bg-background border rounded-xl py-2.5 px-3 text-[10px] text-foreground focus:outline-none transition ${
                        nftAddressError 
                          ? "border-red-500/50 focus:border-red-500" 
                          : nftRecipient && !nftAddressError 
                            ? "border-emerald-500/30" 
                            : "border-gray-200 dark:border-white/5 focus:border-indigo-500"
                      }`}
                    />
                    {nftAddressError && (
                      <p className="text-[9px] text-red-400 font-bold animate-bounce">{nftAddressError}</p>
                    )}
                  </div>

                  {/* Range confirmations */}
                  <div className="relative h-11 w-full rounded-xl bg-gray-800 dark:bg-white/[0.02] border border-white/[0.05] overflow-hidden flex items-center justify-center">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-indigo-600/30 pointer-events-none transition-all duration-75"
                      style={{ width: `${nftSliderVal}%` }}
                    />
                    
                    <span className="text-[9px] font-black tracking-wider text-gray-300 animate-pulse pointer-events-none select-none relative z-10">
                      {nftSliderVal >= 80 
                        ? (language === "es" ? "Suelta para Confirmar" : "Release to Confirm") 
                        : (language === "es" ? "Desliza para Enviar NFT ➔" : "Slide to Transfer NFT ➔")
                      }
                    </span>

                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={nftSliderVal}
                      onChange={handleNftSliderChange}
                      onMouseUp={() => {
                        if (nftSliderVal < 90) setNftSliderVal(0);
                      }}
                      onTouchEnd={() => {
                        if (nftSliderVal < 90) setNftSliderVal(0);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                    />

                    <div 
                      className="absolute left-1 w-9 h-9 rounded-lg bg-indigo-500 shadow flex justify-center items-center text-foreground pointer-events-none transition-all duration-75"
                      style={{ left: `calc(${nftSliderVal}% - ${nftSliderVal * 0.36}px + 4px)` }}
                    >
                      <ArrowRight className="w-4 h-4 text-foreground" />
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button 
                  onClick={() => setSelectedNFT(null)}
                  className="w-full py-3.5 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:bg-white/10 active:scale-95 text-xs font-bold text-gray-700 dark:text-gray-300 rounded-xl transition duration-150"
                >
                  {language === "es" ? "Cerrar" : "Cancel"}
                </button>
              </>
            )}

          </div>
        </div>
      )}

      {/* ==========================================
          WALLETCONNECT CONNECTION APPROVAL DIALOG MODAL
          ========================================== */}
      {proposedDApp && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col justify-end animate-[fadeIn_0.2s_ease-out]">
          <div className="p-6 bg-card rounded-t-[32px] border-t border-gray-200 dark:border-white/5 space-y-5 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="text-center space-y-1">
              <div className="w-12 h-1 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-4"></div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex justify-center items-center text-2xl mx-auto animate-bounce-slow">
                {proposedDApp.icon}
              </div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider pt-2">
                {language === "es" ? "Solicitud de Conexión Web3" : "Web3 Link Request"}
              </h3>
              <p className="text-[10px] text-indigo-400 font-mono">{proposedDApp.url}</p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 space-y-3.5 text-xs">
              <h4 className="text-[10px] font-extrabold text-gray-600 dark:text-gray-400 uppercase tracking-widest block">
                {language === "es" ? "Permisos Solicitados:" : "Permissions Requested:"}
              </h4>
              <ul className="space-y-2.5 text-[10px] text-gray-700 dark:text-gray-300 font-medium">
                <li className="flex gap-2 items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{language === "es" ? "Ver las direcciones públicas de tus billeteras." : "View your active wallet public keys."}</span>
                </li>
                <li className="flex gap-2 items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{language === "es" ? "Proponer transacciones y firmado de mensajes." : "Propose ledger signatures & messages signing."}</span>
                </li>
                <li className="flex gap-2 items-start text-red-400/80">
                  <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{language === "es" ? "Tu PIN y frase semilla NUNCA serán revelados ni transmitidos." : "Your security PIN and seed phrase will NEVER be shared."}</span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={handleApproveConnection}
                className="py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-bold text-foreground transition shadow-[0_5px_15px_-5px_rgba(99,102,241,0.4)]"
              >
                {language === "es" ? "Aprobar Conexión" : "Approve Connection"}
              </button>
              <button 
                onClick={() => {
                  setProposedDApp(null);
                  if (wcProposal) {
                    import("@/lib/walletconnect-service").then(({ rejectSessionProposal }) => {
                      rejectSessionProposal(wcProposal).catch(console.error);
                    });
                    setWcProposal(null);
                  }
                }}
                className="py-3.5 px-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:bg-white/10 active:scale-95 text-xs font-bold text-gray-700 dark:text-gray-300 transition"
              >
                {language === "es" ? "Rechazar" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          WALLETCONNECT SIGNING PROMPT DIALOG MODAL
          ========================================== */}
      {signingDApp && wcRequest && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col justify-end animate-[fadeIn_0.2s_ease-out]">
          <div 
            ref={signingDrag.ref}
            className="p-6 bg-card rounded-t-[32px] border-t border-gray-200 dark:border-white/5 max-h-[90vh] overflow-y-auto space-y-5 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] scrollbar-thin cursor-grab select-none"
          >
            
            <div className="text-center space-y-1">
              <div className="w-12 h-1 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-4"></div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex justify-center items-center text-xl mx-auto">
                {signingDApp.icon}
              </div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider pt-2">
                {language === "es" ? "Firma de Transacción Web3" : "Web3 Transaction Signature"}
              </h3>
              <p className="text-[10px] text-gray-500 font-mono break-all">{wcRequest.params.request.method}</p>
            </div>

            {signingStatus === "signing" ? (
              <div className="py-12 flex flex-col justify-center items-center gap-6 animate-pulse">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="text-center">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">{language === "es" ? "Generando Firma Criptográfica..." : "Generating Cryptographical Signature..."}</h4>
                  <p className="text-[9px] text-gray-500 mt-1">{language === "es" ? "Firmando con tu llave privada local segura" : "Signing with local hardware private key"}</p>
                </div>
              </div>
            ) : signingStatus === "success" ? (
              <div className="py-12 flex flex-col justify-center items-center gap-4 animate-[fadeIn_0.3s_ease-out]">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex justify-center items-center text-emerald-400">
                  <Check className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">{language === "es" ? "¡Firma Completada!" : "Signature Verified!"}</h4>
                  <p className="text-[9px] text-gray-500 mt-1">{language === "es" ? "El mensaje ha sido firmado exitosamente." : "Payload verified successfully."}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Message display */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/5 space-y-2.5 text-xs text-left">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Mensaje a Firmar (Cleartext)</span>
                  <p className="text-[10px] text-gray-700 dark:text-gray-300 font-mono break-all leading-relaxed bg-background p-3 rounded-xl border border-gray-200 dark:border-white/5">
                    {`Authentication request for ${signingDApp.name} (${signingDApp.url}). Sign this message to log in securely. Nonce: ${Math.random().toString(36).substring(2, 9)}`}
                  </p>
                </div>

                <div className="space-y-3.5">
                  <p className="text-[10px] text-red-400 text-center font-semibold">
                    {language === "es" ? "Ingresa tu PIN de 6 dígitos para autorizar y firmar." : "Input your 6-digit PIN to authorize and sign."}
                  </p>
                  
                  {/* Dots */}
                  <div className="flex gap-2 justify-center py-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-3 h-3 rounded-full border ${i < signingPin.length ? "bg-indigo-400 border-indigo-400 scale-105" : "border-white/20 bg-transparent"}`}
                      />
                    ))}
                  </div>

                  {signingPinError && (
                    <p className="text-[10px] text-red-400 font-bold text-center animate-bounce">{signingPinError}</p>
                  )}

                  {/* Pad */}
                  <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto">
                    {["1","2","3","4","5","6","7","8","9"].map(n => (
                      <button 
                        key={n} 
                        onClick={() => handlePINKeyPressSigning(n)} 
                        className="py-1 bg-gray-100 dark:bg-white/5 rounded hover:bg-gray-200 dark:bg-white/10 active:scale-95 text-xs font-bold transition"
                      >
                        {n}
                      </button>
                    ))}
                    <button 
                      onClick={() => setSigningDApp(null)} 
                      className="text-[9px] text-gray-500 hover:text-gray-700 dark:text-gray-300 font-bold flex justify-center items-center"
                    >
                      {language === "es" ? "Cancelar" : "Cancel"}
                    </button>
                    <button 
                      onClick={() => handlePINKeyPressSigning("0")} 
                      className="py-1 bg-gray-100 dark:bg-white/5 rounded hover:bg-gray-200 dark:bg-white/10 text-xs font-bold transition"
                    >
                      0
                    </button>
                    <button 
                      onClick={handlePINBackspaceSigning} 
                      className="text-[9px] text-gray-500 hover:text-gray-700 dark:text-gray-300 font-bold flex justify-center items-center"
                    >
                      {language === "es" ? "Borrar" : "Del"}
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 dark:bg-black/90 backdrop-blur-sm px-4">
          <div className="bg-card border border-gray-300 dark:border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
              <h3 className="text-foreground font-bold text-sm">
                {language === "es" ? "Escanear Código QR" : "Scan QR Code"}
              </h3>
              <button
                onClick={() => setIsScannerOpen(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-foreground transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black">
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    setRecipientAddress(result[0].rawValue);
                    setIsScannerOpen(false);
                  }
                }}
                onError={(error) => console.warn("QR Scanner error:", error?.message)}
              />
            </div>
          </div>
        </div>
      )}
      {/* ==========================================
          PERSISTENT BOTTOM NAVIGATION BAR (Phantom-style 5 column navigation)
          ========================================== */}
      <div className="absolute bottom-0 left-0 w-full p-3 bg-card border-t border-gray-200 dark:border-white/5 grid grid-cols-5 gap-1 z-50 shrink-0">
        
        {/* BUTTON 1: WALLET */}
        <button 
          onClick={() => {
            setActiveTab("wallet");
          }}
          className={`py-2.5 rounded-xl transition duration-150 flex flex-col items-center gap-1.5 ${
            activeTab === "wallet" ? "text-indigo-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">
            {language === "es" ? "Cartera" : "Wallet"}
          </span>
        </button>

        {/* BUTTON 2: SEND */}
        <button 
          onClick={() => {
            setActiveTab("send");
          }}
          className={`py-2.5 rounded-xl transition duration-150 flex flex-col items-center gap-1.5 ${
            activeTab === "send" ? "text-indigo-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"
          }`}
        >
          <ArrowUpRight className={`w-5 h-5 ${activeTab === "send" ? "text-indigo-400" : "opacity-70"}`} />
          <span className="text-[10px] font-bold">{language === "es" ? "Enviar" : "Send"}</span>
        </button>

        {/* BUTTON 3: RECEIVE */}
        <button 
          onClick={() => {
            setActiveTab("receive");
          }}
          className={`py-2.5 rounded-xl transition duration-150 flex flex-col items-center gap-1.5 ${
            activeTab === "receive" ? "text-indigo-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"
          }`}
        >
          <ArrowDownLeft className={`w-5 h-5 ${activeTab === "receive" ? "text-indigo-400" : "opacity-70"}`} />
          <span className="text-[10px] font-bold">{language === "es" ? "Recibir" : "Receive"}</span>
        </button>

        {/* BUTTON 4: WEB3 HUB (Fase 5 Tab) */}
        <button 
          onClick={() => {
            setActiveTab("web3");
          }}
          className={`py-2.5 rounded-xl transition duration-150 flex flex-col items-center gap-1.5 ${
            activeTab === "web3" ? "text-indigo-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"
          }`}
        >
          <Globe className={`w-5 h-5 ${activeTab === "web3" ? "text-indigo-400" : "opacity-70"}`} />
          <span className="text-[10px] font-bold">Web3</span>
        </button>

        {/* BUTTON 5: HISTORY (Fase 4 Tab) */}
        <button 
          onClick={() => {
            setActiveTab("history");
          }}
          className={`py-2.5 rounded-xl transition duration-150 flex flex-col items-center gap-1.5 ${
            activeTab === "history" ? "text-indigo-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"
          }`}
        >
          <Clock className={`w-5 h-5 ${activeTab === "history" ? "text-indigo-400" : "opacity-70"}`} />
          <span className="text-[10px] font-bold">{language === "es" ? "Historial" : "History"}</span>
        </button>

      </div>

      {/* Fiat Simulator Modal */}
      {showFiatSimulator && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0B0F19] rounded-[32px] overflow-hidden flex flex-col shadow-2xl relative">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/5">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                  {language === "es" ? "Comprar " : "Buy "}
                  {activeChain === 'solana' ? 'SOL' : activeChain === 'bitcoin' ? 'BTC' : 'BNB'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {language === "es" ? "Simulador de Pasarela Segura" : "Secure Gateway Simulator"}
                </p>
              </div>
              <button 
                onClick={() => setShowFiatSimulator(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition"
                disabled={simulationStatus === "processing"}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              {simulationStatus === "idle" && (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {language === "es" ? "Pagas con Tarjeta (USD)" : "You pay with Card (USD)"}
                    </span>
                    <div className="flex items-center gap-2 text-4xl font-extrabold text-gray-900 dark:text-white">
                      <span className="text-gray-400">$</span>
                      <input 
                        type="number" 
                        value={simulatedAmount}
                        onChange={(e) => setSimulatedAmount(e.target.value)}
                        className="bg-transparent border-none outline-none w-32 text-center p-0 focus:ring-0"
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500">{language === "es" ? "Recibirás aprox." : "You will receive approx."}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {activeChain === 'solana' ? (Number(simulatedAmount) / 145).toFixed(2) + ' SOL' : 
                         activeChain === 'bitcoin' ? (Number(simulatedAmount) / 60000).toFixed(4) + ' BTC' : 
                         (Number(simulatedAmount) / 580).toFixed(2) + ' BNB'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>{language === "es" ? "A la billetera:" : "To wallet:"}</span>
                      <span className="truncate max-w-[120px]">
                        {walletAddresses?.[activeChain]}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setSimulationStatus("processing");
                      setTimeout(() => setSimulationStatus("success"), 2500);
                    }}
                    className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold transition-all shadow-lg shadow-indigo-500/25 flex justify-center items-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    {language === "es" ? "Simular Pago" : "Simulate Payment"}
                  </button>
                </>
              )}

              {simulationStatus === "processing" && (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="text-sm font-medium text-gray-500 animate-pulse">
                    {language === "es" ? "Procesando transacción..." : "Processing transaction..."}
                  </p>
                </div>
              )}

              {simulationStatus === "success" && (
                <div className="py-8 flex flex-col items-center justify-center gap-4 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                    {language === "es" ? "¡Compra Exitosa!" : "Purchase Successful!"}
                  </h4>
                  <p className="text-sm text-gray-500 max-w-[250px]">
                    {language === "es" 
                      ? "Los fondos ficticios han sido aprobados. (Modo Simulador)" 
                      : "The simulated funds have been approved. (Simulator Mode)"}
                  </p>
                  <button 
                    onClick={() => setShowFiatSimulator(false)}
                    className="mt-4 w-full py-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white font-bold transition-all"
                  >
                    {language === "es" ? "Volver al Dashboard" : "Return to Dashboard"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TRANSACTION SEND PIN MODAL
          ========================================== */}
      {sendPinPrompt && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-[100] flex flex-col justify-end animate-[fadeIn_0.2s_ease-out]">
          <div className="p-6 bg-card rounded-t-[32px] border-t border-gray-200 dark:border-white/5 space-y-5 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="text-center space-y-1">
              <div className="w-12 h-1 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-4"></div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                {language === "es" ? "Ingresa tu PIN para Firmar" : "Enter PIN to Sign"}
              </h3>
              <p className="text-[10px] text-gray-500 font-mono">
                {sendAmount} {sendAsset} ➔ {recipientAddress.slice(0,4)}...{recipientAddress.slice(-4)}
              </p>
            </div>
            
            <div className="space-y-4">
              <input
                type="password"
                maxLength={6}
                value={sendPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setSendPin(val);
                }}
                className="w-full bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-2xl py-4 text-center text-2xl tracking-[1em] font-black focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="••••••"
                autoFocus
              />
              {sendPinError && (
                <p className="text-xs text-red-400 font-bold text-center animate-bounce">{sendPinError}</p>
              )}
            </div>
            <button 
              onClick={() => {
                setSendPinPrompt(false);
                setSliderVal(0);
                setSendPin("");
                setSendPinError(null);
              }}
              className="w-full py-3.5 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 active:scale-95 text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300 rounded-xl transition"
            >
              {language === "es" ? "Cancelar Envío" : "Cancel Transfer"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
