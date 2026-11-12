import React, { useState } from 'react';
import {
  Hammer,
  Volume2,
  VolumeX,
  User,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { CurrentUser, UserRole } from '../types';
import { speakAloud, sounds, isAudioMuted, toggleAudioMute } from '../utils/audio';

interface NavbarProps {
  currentUser: CurrentUser;
  currentRole: UserRole;
  isAdmin?: boolean;
  hasArtisanProfile?: boolean;
  onSwitchRole: (role: UserRole) => void;
  onBecomeArtisan?: () => void;
  onRestartOnboarding?: () => void;
  onLogout?: () => void;
  onOpenVoiceGuide: () => void;
  onOpenAdminTrades?: () => void;
  onOpenAdminPage?: () => void;
  customTradesCount?: number;
  onReplayIntro?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentRole,
  isAdmin = false,
  hasArtisanProfile = false,
  onSwitchRole,
  onBecomeArtisan,
  onRestartOnboarding,
  onLogout,
  onOpenVoiceGuide,
  onOpenAdminTrades,
  onOpenAdminPage,
  customTradesCount = 0,
  onReplayIntro,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [muted, setMuted] = useState(isAudioMuted());

  const handleToggleMute = () => {
    sounds.playClick();
    const newMuted = toggleAudioMute();
    setMuted(newMuted);
    if (!newMuted) {
      speakAloud("Son réactivé.");
    }
  };

  const readBrandAudio = () => {
    sounds.playClick();
    if (onReplayIntro) {
      onReplayIntro();
    } else {
      speakAloud(
        "Bienvenue sur EFA EDO, marketplace des artisans africains par EFA TECHNOLOGIE. Trouve un artisan professionnel près de toi en 30 secondes !"
      );
    }
  };

  const handleRoleToggle = () => {
    sounds.playClick();
    if (currentRole === 'client') {
      if (hasArtisanProfile) {
        onSwitchRole('artisan');
        setIsMobileMenuOpen(false);
        speakAloud("Mode Artisan activé. Gérez votre atelier et vos appels.");
      } else if (onBecomeArtisan) {
        setIsMobileMenuOpen(false);
        onBecomeArtisan();
      } else {
        onSwitchRole('artisan');
        setIsMobileMenuOpen(false);
      }
    } else {
      onSwitchRole('client');
      setIsMobileMenuOpen(false);
      speakAloud("Mode Client activé. Vous pouvez chercher et appeler des artisans.");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md text-white shadow-md border-b border-slate-800 transition-all">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        {/* Brand Zone: Clean, high contrast, gold accent */}
        <div className="flex items-center gap-2.5 min-w-0 shrink">
          <img
            src="/logo.png"
            alt="EFA EDO"
            onClick={readBrandAudio}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain shrink-0 cursor-pointer shadow-xs active:scale-95 transition-transform bg-white p-0.5"
            title="EFA EDO"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-lg sm:text-xl font-black tracking-tight text-white whitespace-nowrap">
                EFA <span className="text-amber-400">EDO</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-sm bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Afrique
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">
              Marketplace des Artisans
            </p>
          </div>
        </div>

        {/* Desktop Action Zone: md and above (>= 768px) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* Admin buttons: STRICTLY visible only when admin is connected (efatech2@gmail.com) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              {onOpenAdminPage && (
                <button
                  onClick={() => {
                    sounds.playClick();
                    onOpenAdminPage();
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs active:scale-95 transition-transform cursor-pointer"
                  title="Panneau Super Administrateur"
                >
                  ⚡ Admin
                </button>
              )}

              {onOpenAdminTrades && (
                <button
                  onClick={() => {
                    sounds.playClick();
                    onOpenAdminTrades();
                  }}
                  className="relative px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-colors active:scale-95 cursor-pointer"
                  title="Gérer les métiers personnalisés (Admin)"
                  aria-label="Métiers personnalisés"
                >
                  <span>Métiers</span>
                  {customTradesCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full">
                      {customTradesCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Mute / Unmute Button */}
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              muted ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title={muted ? 'Activer le son' : 'Couper le son (Mute)'}
            aria-label="Contrôle son"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Quick Voice Assistant button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenVoiceGuide();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-xs active:scale-95 transition-transform cursor-pointer"
            title="Assistance Vocale"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voix</span>
          </button>

          {/* Switch Role / Devenir Artisan Button */}
          <button
            onClick={handleRoleToggle}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black shadow-xs active:scale-95 transition-transform cursor-pointer ${
              currentRole === 'client' && !hasArtisanProfile
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {currentRole === 'client' ? (
              hasArtisanProfile ? (
                <>
                  <Hammer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mode Artisan</span>
                </>
              ) : (
                <>
                  <Hammer className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Devenir Artisan</span>
                </>
              )
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mode Client</span>
              </>
            )}
          </button>

          {/* Déconnexion */}
          {onLogout && (
            <button
              onClick={() => {
                sounds.playClick();
                onLogout();
              }}
              className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-colors cursor-pointer"
              title="Déconnexion (Quitter)"
              aria-label="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile Action Zone: (< 768px, specifically 360px+) */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {/* Mute button */}
          <button
            onClick={handleToggleMute}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              muted ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title={muted ? 'Activer le son' : 'Couper le son (Mute)'}
            aria-label="Contrôle son"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Quick Voice button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenVoiceGuide();
            }}
            className="w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs active:scale-95 transition-transform cursor-pointer"
            title="Assistance Vocale"
            aria-label="Aide Vocale"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsMobileMenuOpen((prev: boolean) => !prev);
            }}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center active:scale-95 transition-transform"
            aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-amber-400" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown (< 768px) */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          {/* User Status Bar */}
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-black text-xs">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <p className="text-xs font-bold text-white truncate max-w-[160px]">
                  {currentUser.name || 'Utilisateur'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {currentUser.phone || 'Connecté'}
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                currentRole === 'artisan'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
              }`}
            >
              {currentRole === 'artisan' ? 'Artisan' : 'Client'}
            </span>
          </div>

          {/* Mode Switcher / Devenir Artisan Button */}
          <button
            onClick={handleRoleToggle}
            className={`w-full min-h-[50px] rounded-2xl font-black text-sm flex items-center justify-between px-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer ${
              currentRole === 'client'
                ? 'bg-amber-400 hover:bg-amber-500 text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {currentRole === 'client' ? (
                <Hammer className="w-5 h-5 fill-slate-950" />
              ) : (
                <User className="w-5 h-5" />
              )}
              <span>
                {currentRole === 'client'
                  ? hasArtisanProfile
                    ? 'Passer en Mode Artisan'
                    : 'Devenir Artisan EDO'
                  : 'Passer en Mode Client'}
              </span>
            </div>
            <span className="text-xs font-extrabold uppercase opacity-80">
              {currentRole === 'client' && !hasArtisanProfile ? 'Inscription' : 'Basculer'}
            </span>
          </button>

          {/* Admin options in mobile menu: STRICTLY only when isAdmin is true */}
          {isAdmin && (
            <div className="space-y-2 pt-1 border-t border-slate-800">
              {onOpenAdminPage && (
                <button
                  onClick={() => {
                    sounds.playClick();
                    setIsMobileMenuOpen(false);
                    onOpenAdminPage();
                  }}
                  className="w-full min-h-[46px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-between px-4 transition-colors active:scale-[0.98] cursor-pointer"
                >
                  <span>⚡ Panneau Super Admin</span>
                  <span className="text-[10px] uppercase font-black bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full">
                    Gérer
                  </span>
                </button>
              )}

              {onOpenAdminTrades && (
                <button
                  onClick={() => {
                    sounds.playClick();
                    setIsMobileMenuOpen(false);
                    onOpenAdminTrades();
                  }}
                  className="w-full min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-between px-4 transition-colors active:scale-[0.98] cursor-pointer"
                >
                  <span>Administration Métiers (« Autre »)</span>
                  {customTradesCount > 0 ? (
                    <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full">
                      {customTradesCount} nouveau{customTradesCount > 1 ? 'x' : ''}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10px]">0</span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Voice Guide trigger */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsMobileMenuOpen(false);
              onOpenVoiceGuide();
            }}
            className="w-full min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-between px-4 transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>Assistance Vocale & Guide Audio</span>
            </div>
            <span className="text-[10px] text-amber-400 font-bold">Écouter</span>
          </button>

          {/* Déconnexion Mobile */}
          {onLogout && (
            <button
              onClick={() => {
                sounds.playClick();
                setIsMobileMenuOpen(false);
                onLogout();
              }}
              className="w-full min-h-[46px] rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-xs flex items-center justify-between px-4 transition-colors active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Déconnexion</span>
              </div>
              <span className="text-[10px] text-rose-400 font-bold">Quitter</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
