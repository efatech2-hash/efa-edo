import React, { useState } from 'react';
import { Smartphone, Globe, Share, X, CheckCircle2, Play } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWA_CONFIG } from '../config/pwa';
import { sounds, speakAloud } from '../utils/audio';

export const AppDownloadSection: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);

  // Ne pas afficher dans l'app déjà installée / TWA Play Store
  if (isInstalled) {
    return null;
  }

  const handleInstallWebApp = async () => {
    sounds.playClick();
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        sounds.playSuccess();
        speakAloud("Application web EFA Edo installée avec succès !");
      }
      return;
    }
    setShowInstallGuideModal(true);
  };

  return (
    <section
      aria-labelledby="download-efa-edo-title"
      className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-lg"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <img
            src="/pwa-192x192.png"
            alt="EFA Edo"
            className="w-14 h-14 rounded-2xl object-contain bg-white p-1 shrink-0 shadow-sm"
          />
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full mb-1">
              <Smartphone className="w-3 h-3" />
              <span>Mobile & Ordinateur</span>
            </span>
            <h2
              id="download-efa-edo-title"
              className="text-lg sm:text-xl font-black text-white leading-tight"
            >
              Télécharger l'application EFA Edo
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
              Accédez plus rapidement aux artisans autour de vous, même avec une connexion faible.
            </p>
          </div>
        </div>
      </div>

      {/* 2 Boutons officiels uniquement : Google Play + Application Web PWA (Jamais d'APK direct) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
        <a
          href={PWA_CONFIG.playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => sounds.playClick()}
          className="flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-black text-sm shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
          <div className="text-left leading-tight">
            <span className="block text-[10px] font-bold uppercase text-slate-500">
              Android Officiel
            </span>
            <span className="block text-sm font-black text-slate-900">
              Télécharger sur Google Play
            </span>
          </div>
        </a>

        <button
          type="button"
          onClick={handleInstallWebApp}
          className="flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm shadow-sm active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="text-left leading-tight">
            <span className="block text-[10px] font-bold uppercase text-slate-800">
              {isInstallable ? 'Installation directe' : 'iPhone · Android · PC'}
            </span>
            <span className="block text-sm font-black text-slate-950">
              Installer l'application Web
            </span>
          </div>
        </button>
      </div>

      {/* Modal Guide d'installation si le navigateur ne supporte pas beforeinstallprompt (ex: iOS Safari ou navigateur secondaire) */}
      {showInstallGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border-2 border-amber-400 relative text-slate-900">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowInstallGuideModal(false);
              }}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img
                src="/pwa-192x192.png"
                alt="EFA Edo"
                className="w-12 h-12 rounded-2xl bg-white border border-slate-200 p-0.5"
              />
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Installer l'application Web
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  EFA Edo sur votre écran d'accueil
                </p>
              </div>
            </div>

            {isIOS ? (
              <ol className="space-y-3 text-sm text-slate-700 font-medium mb-5">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    Touchez l'icône{' '}
                    <strong className="inline-flex items-center gap-1 text-slate-900">
                      Partager <Share className="w-3.5 h-3.5 inline" />
                    </strong>{' '}
                    en bas de Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    Sélectionnez{' '}
                    <strong className="text-slate-900">Sur l'écran d'accueil</strong> puis touchez{' '}
                    <strong className="text-slate-900">Ajouter</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <div className="space-y-3 text-sm text-slate-700 font-medium mb-5">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-slate-800">
                    Ouvrez le menu de votre navigateur (<strong>⋮</strong> en haut à droite sur Chrome ou Edge) puis sélectionnez{' '}
                    <strong>« Installer l'application »</strong> ou{' '}
                    <strong>« Ajouter à l'écran d'accueil »</strong>.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowInstallGuideModal(false);
              }}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
