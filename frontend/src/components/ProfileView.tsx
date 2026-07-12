import React, { useState, useEffect } from "react";
import { ArrowLeft, User, Shield, Globe, Lock, LogOut, Edit2, Check } from "lucide-react";
import { useWalletStore } from "@/store/useWalletStore";
import { updateUsername } from "@/lib/auth-service";
import { ThemeToggle } from "./ThemeToggle";

interface ProfileViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ isOpen, onClose }) => {
  const { user, settings, updateSettings, logout } = useWalletStore();
  const language = settings.language;
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [isSaving, setIsSaving] = useState(false);

  // Exporter state
  type ActiveChain = "solana" | "bitcoin" | "bnb";
  const [exportingChain, setExportingChain] = useState<ActiveChain | null>(null);
  const [pinConfirm, setPinConfirm] = useState("");
  const [keyExportError, setKeyExportError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<{ hex: string; wif?: string } | null>(null);

  const handleCloseReveal = () => {
    setExportingChain(null);
    setPinConfirm("");
    setKeyExportError(null);
    setRevealedKey(null);
  };

  const handlePINKeyPress = (num: string) => {
    setKeyExportError(null);
    if (pinConfirm.length < 6) {
      setPinConfirm(prev => prev + num);
    }
  };

  const handlePINBackspace = () => {
    setPinConfirm(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pinConfirm.length === 6) {
      const verify = setTimeout(() => {
        const { encryptedSeedPayload } = useWalletStore.getState();
        if (encryptedSeedPayload && exportingChain) {
          import("@/lib/crypto").then(async ({ decryptData }) => {
            try {
              const seed = await decryptData(encryptedSeedPayload, pinConfirm);
              const { deriveAllWallets } = await import("@/lib/multichain-derivation");
              const wallets = await deriveAllWallets(seed);
              
              if (exportingChain === "solana") {
                setRevealedKey({ hex: wallets.solana.privateKeyBase58 });
              } else if (exportingChain === "bitcoin") {
                setRevealedKey({ hex: wallets.bitcoin.privateKeyHex, wif: wallets.bitcoin.privateKeyWIF });
              } else if (exportingChain === "bnb") {
                setRevealedKey({ hex: wallets.bnb.privateKeyHex });
              }
            } catch (err) {
              setKeyExportError(language === "es" ? "PIN incorrecto." : "Incorrect PIN.");
              setPinConfirm("");
            }
          });
        }
      }, 300);
      return () => clearTimeout(verify);
    }
  }, [pinConfirm, exportingChain, language]);

  useEffect(() => {
    if (user?.username) setNewUsername(user.username);
  }, [user?.username]);

  const handleSaveUsername = async () => {
    if (!user || !newUsername.trim()) return;
    setIsSaving(true);
    try {
      await updateUsername(user.uid, newUsername);
      useWalletStore.getState().setUser({ ...user, username: newUsername.trim() });
      setIsEditingUsername(false);
    } catch (err) {
      console.error("Error saving username", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-right-8 duration-300">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200 dark:border-white/5">
        <button 
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-bold tracking-widest uppercase">
          {language === "es" ? "Perfil y Ajustes" : "Profile & Settings"}
        </h2>
        <div className="w-9" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        
        {/* Profile Card */}
        <div className="p-5 rounded-3xl bg-card border border-gray-200 dark:border-white/5 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex justify-center items-center text-indigo-400 relative">
              <User className="w-6 h-6" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white border-2 border-background cursor-pointer hover:bg-indigo-600 transition">
                <Edit2 className="w-2.5 h-2.5" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                {language === "es" ? "Usuario" : "User"}
              </p>
              {isEditingUsername ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="flex-1 bg-transparent border-b border-indigo-500 text-lg font-bold text-gray-800 dark:text-gray-200 focus:outline-none py-1"
                    autoFocus
                    maxLength={20}
                  />
                  <button 
                    onClick={handleSaveUsername}
                    disabled={isSaving || !newUsername.trim()}
                    className="p-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
                    {user?.username || (language === "es" ? "Usuario Aether" : "Aether User")}
                  </h3>
                  <button onClick={() => setIsEditingUsername(true)} className="p-2 text-gray-400 hover:text-indigo-400 transition">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
            {language === "es" ? "Preferencias" : "Preferences"}
          </h4>
          <div className="rounded-3xl bg-card border border-gray-200 dark:border-white/5 overflow-hidden">
            
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold">{language === "es" ? "Idioma" : "Language"}</span>
              </div>
              <select 
                value={language}
                onChange={(e) => updateSettings({ language: e.target.value as "en" | "es" })}
                className="bg-transparent text-xs font-bold text-gray-500 focus:outline-none"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <div className="w-4 h-4 rounded-full bg-indigo-400 flex items-center justify-center text-[8px] text-white font-bold">$</div>
                <span className="text-sm font-bold">{language === "es" ? "Moneda Local" : "Local Currency"}</span>
              </div>
              <span className="text-xs font-bold text-gray-500">USD</span>
            </div>

            <div className="flex justify-between items-center p-4">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-sm font-bold">{language === "es" ? "Tema" : "Theme"}</span>
              </div>
              <ThemeToggle />
            </div>

          </div>
        </div>

        {/* Security */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
            {language === "es" ? "Seguridad" : "Security"}
          </h4>
          
          {/* Exporter Block Inline */}
          <div className="rounded-3xl bg-card border border-gray-200 dark:border-white/5 overflow-hidden">
            {!exportingChain && !revealedKey ? (
              <div className="p-4 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 mb-3">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold">{language === "es" ? "Exportar Claves" : "Export Keys"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["solana", "bitcoin", "bnb"] as ActiveChain[]).map(chain => (
                    <button 
                      key={chain}
                      onClick={() => setExportingChain(chain)}
                      className="py-2 px-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/20 transition-all font-bold text-[10px] uppercase tracking-wider"
                    >
                      {chain === "solana" ? "SOL" : chain === "bitcoin" ? "BTC" : "BNB"}
                    </button>
                  ))}
                </div>
              </div>
            ) : exportingChain && !revealedKey ? (
              <div className="space-y-3 p-4 border-b border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-center pb-1 border-b border-gray-200 dark:border-white/5">
                  <button 
                    onClick={handleCloseReveal}
                    type="button"
                    className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{language === "es" ? "Atrás" : "Back"}</span>
                  </button>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-500/80">
                    {exportingChain.toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] text-red-400 leading-normal font-semibold">
                  {language === "es" 
                    ? `¡ADVERTENCIA! Ingresa tu PIN para revelar la clave privada de ${exportingChain.toUpperCase()}.`
                    : `WARNING! Input your PIN to reveal the private key for ${exportingChain.toUpperCase()}.`}
                </p>
                <div className="flex gap-2 justify-center py-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-3 h-3 rounded-full border ${i < pinConfirm.length ? "bg-indigo-400 border-indigo-400 scale-105" : "border-gray-200 dark:border-white/20 bg-transparent"}`}
                    />
                  ))}
                </div>
                {keyExportError && (
                  <p className="text-[10px] text-red-400 font-bold text-center animate-bounce">{keyExportError}</p>
                )}
                <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto">
                  {["1","2","3","4","5","6","7","8","9"].map(n => (
                    <button 
                      key={n} 
                      onClick={() => handlePINKeyPress(n)} 
                      className="py-1 bg-gray-100 dark:bg-white/5 rounded hover:bg-gray-200 dark:bg-white/10 active:scale-95 text-xs font-bold transition"
                    >
                      {n}
                    </button>
                  ))}
                  <button onClick={handleCloseReveal} className="text-[9px] text-gray-500 hover:text-gray-700 dark:text-gray-300 font-bold flex justify-center items-center">
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button onClick={() => handlePINKeyPress("0")} className="py-1 bg-gray-100 dark:bg-white/5 rounded hover:bg-gray-200 dark:bg-white/10 text-xs font-bold transition">
                    0
                  </button>
                  <button onClick={handlePINBackspace} className="text-[9px] text-gray-500 hover:text-gray-700 dark:text-gray-300 font-bold flex justify-center items-center">
                    {language === "es" ? "Borrar" : "Del"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 border-b border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-center pb-1 border-b border-gray-200 dark:border-white/5">
                  <button 
                    onClick={handleCloseReveal}
                    type="button"
                    className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{language === "es" ? "Atrás" : "Back"}</span>
                  </button>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-500/80">
                    {exportingChain?.toUpperCase()}
                  </span>
                </div>
                <div className="p-3 bg-red-950/10 border border-red-900/30 rounded-xl space-y-2.5">
                  <p className="text-[9px] text-red-400 font-extrabold uppercase tracking-wide">
                    {language === "es" ? `Clave Privada de ${exportingChain?.toUpperCase()}` : `${exportingChain?.toUpperCase()} Private Key`}
                  </p>
                  <div className="space-y-1">
                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block">Raw Private Key (Hex)</span>
                    <p className="text-[10px] text-gray-700 dark:text-gray-300 font-mono break-all leading-normal bg-card p-2 border border-gray-200 dark:border-white/5 rounded-lg select-all">
                      {revealedKey?.hex}
                    </p>
                  </div>
                  {revealedKey?.wif && (
                    <div className="space-y-1">
                      <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block">WIF Format (Standard)</span>
                      <p className="text-[10px] text-gray-700 dark:text-gray-300 font-mono break-all leading-normal bg-card p-2 border border-gray-200 dark:border-white/5 rounded-lg select-all">
                        {revealedKey.wif}
                      </p>
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleCloseReveal}
                  className="w-full py-2.5 px-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:bg-white/10 text-[10px] font-bold transition text-center"
                >
                  {language === "es" ? "Ocultar" : "Hide"}
                </button>
              </div>
            )}

            <div className="flex justify-between items-center p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Lock className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold">{language === "es" ? "Bloqueo Automático" : "Auto-Lock"}</span>
              </div>
              <select 
                value={settings.autoLockTime}
                onChange={(e) => updateSettings({ autoLockTime: Number(e.target.value) })}
                className="bg-transparent text-xs font-bold text-gray-500 focus:outline-none"
              >
                <option value={1}>{language === "es" ? "1 min" : "1 min"}</option>
                <option value={5}>{language === "es" ? "5 min" : "5 min"}</option>
                <option value={15}>{language === "es" ? "15 min" : "15 min"}</option>
                <option value={30}>{language === "es" ? "30 min" : "30 min"}</option>
                <option value={60}>{language === "es" ? "1 hora" : "1 hour"}</option>
                <option value={0}>{language === "es" ? "Nunca" : "Never"}</option>
              </select>
            </div>

          </div>
        </div>

      </div>

      {/* Logout */}
      <div className="p-5 pb-8">
        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition font-bold text-sm"
        >
          <LogOut className="w-4 h-4" />
          {language === "es" ? "Cerrar Sesión" : "Log Out"}
        </button>
      </div>

    </div>
  );
};
