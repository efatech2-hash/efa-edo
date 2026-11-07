import React, { useState } from 'react';
import {
  Volume2,
  X,
  Play,
  Pause,
  Phone,
  Power,
  Search,
  Sparkles
} from 'lucide-react';
import { speakAloud, sounds } from '../utils/audio';

interface VoiceGuideModalProps {
  onClose: () => void;
}

export const VoiceGuideModal: React.FC<VoiceGuideModalProps> = ({ onClose }) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const guideItems = [
    {
      title: "1. Comment trouver un bon artisan ?",
      audioText:
        "Pour trouver un bon artisan, touche l'icône du métier que tu cherches, comme mécanicien, menuisier ou tailleur. Les artisans qui ont un point vert sont disponibles immédiatement près de chez toi.",
      icon: Search,
      color: '#0284C7',
    },
    {
      title: "2. Comment l'appeler ou lui écrire ?",
      audioText:
        "Touche le gros bouton vert marqué APPELER pour lui téléphoner directement. Ou touche le bouton WhatsApp pour lui envoyer un message et des photos de ton problème.",
      icon: Phone,
      color: '#16A34A',
    },
    {
      title: "3. Artisan : comment recevoir des clients ?",
      audioText:
        "Si tu es artisan, va dans Mon Atelier et touche le GROS bouton rond au milieu. Quand il devient vert et dit JE SUIS DISPONIBLE, tous les clients proches de toi te voient sur la carte. Quand tu as fini ta journée, touche-le pour te reposer.",
      icon: Power,
      color: '#EA580C',
    },
    {
      title: "4. Que signifie EDO ?",
      audioText:
        "EDO signifie Travail. EFA EDO a été conçu par EFA TECHNOLOGIE pour valoriser le travail et les talents de tous les artisans partout en Afrique.",
      icon: Sparkles,
      color: '#D97706',
    },
  ];

  const handlePlayGuide = (index: number, text: string) => {
    sounds.playClick();
    if (playingIndex === index) {
      window.speechSynthesis?.cancel();
      setPlayingIndex(null);
    } else {
      setPlayingIndex(index);
      speakAloud(text, () => {
        setPlayingIndex(null);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border-2 border-amber-400 relative my-6">
        {/* Close Button */}
        <button
          onClick={() => {
            window.speechSynthesis?.cancel();
            sounds.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-md">
            <Volume2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Guide Vocal EFA EDO
          </h2>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Touche n'importe quel bouton pour entendre les explications
          </p>
        </div>

        {/* List of audio guides with giant play buttons */}
        <div className="space-y-3 mb-6">
          {guideItems.map((item, idx) => {
            const isPlaying = playingIndex === idx;
            const Icon = item.icon;

            return (
              <button
                key={idx}
                onClick={() => handlePlayGuide(idx, item.audioText)}
                className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] ${
                  isPlaying
                    ? 'border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    isPlaying
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : 'bg-slate-100 hover:bg-amber-400 text-slate-900'
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-slate-950" />
                  ) : (
                    <Play className="w-6 h-6 fill-slate-950 ml-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            window.speechSynthesis?.cancel();
            sounds.playClick();
            onClose();
          }}
          className="w-full min-h-[54px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-base"
        >
          J'ai compris, fermer le guide
        </button>
      </div>
    </div>
  );
};
