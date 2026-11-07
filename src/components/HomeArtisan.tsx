import React, { useState } from 'react';
import {
  Power,
  Eye,
  PhoneCall,
  Crown,
  Volume2,
  CheckCircle2,
  UserCheck,
  ExternalLink,
  Edit,
  Lock,
} from 'lucide-react';
import { Artisan, CurrentUser } from '../types';
import { speakAloud, sounds } from '../utils/audio';
import { ArtisanEditProfileModal } from './ArtisanEditProfileModal';

interface HomeArtisanProps {
  currentArtisan: Artisan;
  currentUser: CurrentUser;
  onToggleStatus: (newStatus: boolean) => void;
  onOpenProModal: () => void;
  onViewPublicProfile: (artisan: Artisan) => void;
  onUpdateArtisan?: (updated: Artisan) => void;
}

export const HomeArtisan: React.FC<HomeArtisanProps> = ({
  currentArtisan,
  currentUser,
  onToggleStatus,
  onOpenProModal,
  onViewPublicProfile,
  onUpdateArtisan,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Check 7-day rule
  const lastUpdate = currentArtisan.lastProfileUpdate
    ? new Date(currentArtisan.lastProfileUpdate).getTime()
    : 0;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const isLocked = lastUpdate > 0 && Date.now() - lastUpdate < SEVEN_DAYS_MS;
  const daysRemaining = isLocked
    ? Math.ceil((SEVEN_DAYS_MS - (Date.now() - lastUpdate)) / (24 * 60 * 60 * 1000))
    : 0;
  const handleToggle = () => {
    sounds.playClick();
    const nextStatus = !currentArtisan.isOnline;
    onToggleStatus(nextStatus);

    if (nextStatus) {
      sounds.playSuccess();
      speakAloud(
        `Bravo ${currentArtisan.name}. Tu es maintenant DISPONIBLE. Les clients proches de ton atelier te voient en vert sur la carte.`
      );
    } else {
      speakAloud(
        `Tu es maintenant passé en mode OCCUPÉ. Tu n'apparais plus sur la carte. Repose-toi bien.`
      );
    }
  };

  const handleVoiceExplanation = () => {
    sounds.playClick();
    speakAloud(
      `Espace Artisan EDO. Appuie sur le gros bouton central pour devenir DISPONIBLE ou te mettre en PAUSE. Quand le bouton est vert, les clients proches peuvent t'appeler directement.`
    );
  };

  return (
    <div className="space-y-6 pb-28 max-w-xl mx-auto">
      {/* Top Welcome Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={currentArtisan.avatar}
            alt={currentArtisan.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500 shadow-xs"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-xl text-slate-900">
                {currentArtisan.name}
              </h1>
              {currentArtisan.isPro && (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                  PRO
                </span>
              )}
            </div>
            <p className="text-amber-700 font-extrabold text-sm truncate max-w-[240px]">
              {currentArtisan.trade} · {currentArtisan.addressDetail}
            </p>
          </div>
        </div>

        {/* Audio helper button */}
        <button
          onClick={handleVoiceExplanation}
          className="p-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold active:scale-95 transition-transform"
          title="Écouter l'aide"
        >
          <Volume2 className="w-6 h-6" />
        </button>
      </div>

      {/* GIANT TOGGLE SWITCH (CENTER OF SCREEN) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Statut de visibilité en temps réel
        </span>

        {/* Giant round tactile switch */}
        <div className="flex justify-center my-4">
          <button
            onClick={handleToggle}
            className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center p-4 transition-all duration-300 transform active:scale-95 ${
              currentArtisan.isOnline
                ? 'bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 ring-8 ring-emerald-100'
                : 'bg-rose-600 text-white shadow-xl shadow-rose-600/30 ring-8 ring-rose-100'
            }`}
            style={{
              animation: currentArtisan.isOnline ? 'online-pulse 2s infinite' : 'none',
            }}
          >
            <Power className="w-16 h-16 sm:w-20 sm:h-20 stroke-[2.5] mb-2" />
            <span className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              {currentArtisan.isOnline ? 'JE SUIS DISPONIBLE' : 'JE SUIS OCCUPÉ'}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider mt-1 opacity-90">
              {currentArtisan.isOnline ? 'Visible sur la carte' : 'Masqué de la carte'}
            </span>
          </button>
        </div>

        <p className="text-sm font-semibold text-slate-600 max-w-xs mx-auto">
          {currentArtisan.isOnline ? (
            <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
              Tu es visible à tous les clients proches de toi
            </span>
          ) : (
            <span className="text-slate-500 font-bold">
              Touche le bouton rouge quand tu es prêt à travailler
            </span>
          )}
        </p>
      </div>

      {/* Today's Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Profile Views */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Eye className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">
              Vues de profil
            </span>
            <span className="text-2xl font-black text-slate-900">
              {currentArtisan.dailyViews}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 block">
              +12 aujourd'hui
            </span>
          </div>
        </div>

        {/* Calls Received */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <PhoneCall className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">
              Appels reçus
            </span>
            <span className="text-2xl font-black text-slate-900">
              {currentArtisan.dailyCalls}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 block">
              Directs WhatsApp
            </span>
          </div>
        </div>
      </div>

      {/* Pro Subscription Banner */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-3xl text-slate-950 shadow-md">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-white/30 w-fit px-2.5 py-1 rounded-full">
              <Crown className="w-4 h-4 fill-slate-950" />
              EFA EDO PRO
            </div>
            <h3 className="text-xl font-black text-slate-950">
              Multiplie tes clients par 5
            </h3>
            <p className="text-sm font-semibold text-slate-900 opacity-90">
              Apparais en tête de liste autour de toi & badge vérifié.
            </p>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onOpenProModal();
            }}
            className="min-h-[54px] px-5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-sm whitespace-nowrap active:scale-95 shadow-md cursor-pointer"
          >
            Passer PRO
          </button>
        </div>
      </div>

      {/* Quick Action Tools */}
      <div className="space-y-3">
        {/* Modifier mon profil (1x / 7 jours) */}
        <button
          onClick={() => {
            sounds.playClick();
            setIsEditModalOpen(true);
          }}
          className="w-full min-h-[56px] rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-base flex items-center justify-between px-5 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Edit className="w-6 h-6 text-slate-950" />
            <div className="text-left">
              <span className="block leading-tight">Modifier mon profil</span>
              <span className="text-[11px] font-bold opacity-80">
                {isLocked
                  ? `Bloqué · Réessaie dans ${daysRemaining}j`
                  : 'Modifiable 1 fois par 7 jours'}
              </span>
            </div>
          </div>
          {isLocked ? (
            <Lock className="w-5 h-5 text-slate-950/70" />
          ) : (
            <span className="text-xs font-black uppercase bg-slate-950 text-amber-300 px-2.5 py-1 rounded-xl">
              Éditer
            </span>
          )}
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            onViewPublicProfile(currentArtisan);
          }}
          className="w-full min-h-[56px] rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-900 font-extrabold text-base flex items-center justify-between px-5 shadow-xs active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-amber-600" />
            <span>Voir mon profil comme le voient les clients</span>
          </div>
          <ExternalLink className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Modal Edition Profil (1x / 7 jours) */}
      {isEditModalOpen && (
        <ArtisanEditProfileModal
          artisan={currentArtisan}
          onClose={() => setIsEditModalOpen(false)}
          onSaveSuccess={(updated) => {
            if (onUpdateArtisan) {
              onUpdateArtisan(updated);
            }
          }}
        />
      )}
    </div>
  );
};
