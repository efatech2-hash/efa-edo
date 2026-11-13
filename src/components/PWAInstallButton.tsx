import React, { useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { sounds, speakAloud } from '../utils/audio';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'mobile-menu';
  onActionComplete?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  onActionComplete,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Ne pas afficher si l'app est déjà installée (mode standalone / TWA)
  if (isInstalled) {
    return null;
  }

  // Sur Chromium (Android + Desktop), afficher uniquement lorsque beforeinstallprompt est prêt
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleClick = async () => {
    sounds.playClick();
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        sounds.playSuccess();
        speakAloud("Application EFA Edo en cours d'installation sur votre appareil.");
      }
      if (onActionComplete) onActionComplete();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'mobile-menu' ? (
        <button
          onClick={handleClick}
          className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-between px-4 transition-colors active:scale-[0.98] cursor-pointer shadow-xs"
          aria-label="Installer l'application"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Installer l'application</span>
          </div>
          <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full">
            Gratuit
          </span>
        </button>
      ) : (
        <button
          onClick={handleClick}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-xs active:scale-95 transition-transform cursor-pointer shrink-0"
          title="Installer l'application EFA Edo"
          aria-label="Installer l'application"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Installer l'application</span>
          <span className="sm:hidden">Installer</span>
        </button>
      )}

      {/* Guide d'installation iOS Safari */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-amber-400 relative text-slate-900">
            <button
              onClick={() => {
                sounds.playClick();
                setShowIOSGuide(false);
              }}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Installer EFA Edo sur iPhone
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  Accès direct depuis votre écran d'accueil
                </p>
              </div>
            </div>

            <ol className="space-y-3 text-sm text-slate-700 font-medium mb-5">
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  Touchez le bouton{' '}
                  <strong className="inline-flex items-center gap-1 text-slate-900">
                    Partager <Share className="w-3.5 h-3.5 inline" />
                  </strong>{' '}
                  dans la barre Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  Faites défiler vers le bas et sélectionnez{' '}
                  <strong className="text-slate-900">Sur l'écran d'accueil</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <span>
                  Appuyez sur <strong className="text-slate-900">Ajouter</strong> en haut à droite.
                </span>
              </li>
            </ol>

            <button
              onClick={() => {
                sounds.playClick();
                setShowIOSGuide(false);
                if (onActionComplete) onActionComplete();
              }}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm cursor-pointer"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
