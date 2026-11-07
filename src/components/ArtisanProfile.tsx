import React, { useState } from 'react';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Star,
  CheckCircle2,
  Crown,
  Volume2,
  MapPin,
  ExternalLink,
  Briefcase,
  Play,
  Pause,
  Maximize2,
  X,
  Share2
} from 'lucide-react';
import { Artisan, GeoCoordinates } from '../types';
import { ArtisanMap } from './ArtisanMap';
import { speakAloud, sounds } from '../utils/audio';

interface ArtisanProfileProps {
  artisan: Artisan;
  userLocation?: GeoCoordinates | null;
  onBack: () => void;
  onCall: (artisan: Artisan) => void;
  onOpenReviewModal: (artisan: Artisan) => void;
}

export const ArtisanProfile: React.FC<ArtisanProfileProps> = ({
  artisan,
  userLocation,
  onBack,
  onCall,
  onOpenReviewModal,
}) => {
  const [isPlayingBio, setIsPlayingBio] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const togglePlayBio = () => {
    sounds.playClick();
    if (isPlayingBio) {
      window.speechSynthesis?.cancel();
      setIsPlayingBio(false);
    } else {
      setIsPlayingBio(true);
      speakAloud(artisan.bioVoiceText || `Artisan ${artisan.name}`, () => {
        setIsPlayingBio(false);
      });
    }
  };

  const handleShare = () => {
    sounds.playClick();
    if (navigator.share) {
      navigator
        .share({
          title: `${artisan.name} - ${artisan.trade} sur EFA EDO`,
          text: `Découvre ${artisan.name}, artisan pro sur EFA EDO.`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      sounds.playSuccess();
      speakAloud("Lien du profil copié dans le presse-papier");
    }
  };

  const openGoogleMapsRoute = () => {
    sounds.playClick();
    if (artisan.lat !== null && artisan.lng !== null) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${artisan.lat},${artisan.lng}`;
      window.open(url, '_blank');
    } else {
      speakAloud("Position GPS non renseignée pour cet artisan.");
    }
  };

  const distanceText =
    artisan.distanceBadge ||
    (artisan.distanceKm !== undefined ? `à ${artisan.distanceKm.toFixed(1)}km` : 'À proximité');

  // Filtrer les textes démo : n'afficher que ce que l'artisan a réellement saisi
  const rawAddress = artisan.addressDetail?.trim() || '';
  const isDemoAddress =
    rawAddress.toLowerCase().includes('dépannage express') ||
    rawAddress.toLowerCase().includes('atelier & dépannage') ||
    rawAddress.toLowerCase() === 'atelier';
  const displayAddress = !isDemoAddress && rawAddress.length > 0 ? rawAddress : '';

  const rawBio = artisan.bioVoiceText?.trim() || '';
  const isDemoBio =
    rawBio.toLowerCase().includes('dépannage express') ||
    rawBio.toLowerCase().includes('atelier & dépannage');
  const displayBio = !isDemoBio && rawBio.length > 0 ? rawBio : '';

  const realPhotos = artisan.workPhotos || [];

  return (
    <div className="max-w-3xl mx-auto pb-32">
      {/* Top Floating Back, Title & Actions bar (100% Smartphone Responsive) */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <button
          onClick={() => {
            sounds.playClick();
            onBack();
          }}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center active:scale-95 transition-transform shrink-0 cursor-pointer"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="font-black text-sm sm:text-base text-slate-900 truncate flex-1 text-center px-1">
          {artisan.name}
        </span>

        {/* Right Action buttons: Yellow tactile speaker + Share */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={togglePlayBio}
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl ${
              isPlayingBio ? 'bg-amber-500 animate-pulse' : 'bg-amber-400 hover:bg-amber-500'
            } text-slate-950 flex items-center justify-center active:scale-95 transition-transform shadow-xs shrink-0 cursor-pointer`}
            title={isPlayingBio ? 'Arrêter la voix' : 'Écouter la présentation audio'}
            aria-label="Écouter la présentation de l'artisan"
          >
            {isPlayingBio ? <Pause className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            onClick={handleShare}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center active:scale-95 transition-transform shrink-0 cursor-pointer"
            aria-label="Partager"
            title="Partager le profil"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Workshop Cover Image : Si pas de couverture -> fond neutre uni (0 photo démo) */}
      <div className="relative h-44 sm:h-60 w-full overflow-hidden bg-slate-900">
        {artisan.coverImage ? (
          <img
            src={artisan.coverImage}
            alt={artisan.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-black/10 to-transparent" />

        {/* Status indicator on cover */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          {artisan.isOnline ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/95 text-white text-xs font-black shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              DISPONIBLE EN LIGNE
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-slate-700/90 text-slate-200 text-xs font-bold">
              HORS LIGNE
            </span>
          )}
        </div>
      </div>

      {/* Main Profile Info Card */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-md">
          <div className="flex items-start gap-4">
            {/* Avatar : Si pas de profil -> avatar initiale du nom (0 photo démo) */}
            <div className="relative shrink-0">
              {artisan.avatar ? (
                <img
                  src={artisan.avatar}
                  alt={artisan.name}
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-md bg-white"
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-amber-500 text-slate-950 font-black text-3xl flex items-center justify-center border-4 border-white shadow-md uppercase">
                  {(artisan.name?.charAt(0) || 'A').toUpperCase()}
                </div>
              )}

              {artisan.isPro && (
                <div
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center border-2 border-white shadow-xs"
                  title="Artisan PRO Vérifié"
                >
                  <Crown className="w-4 h-4 fill-slate-950" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 truncate">
                  {artisan.name}
                </h1>
                <span className="flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  Vérifié EFA EDO
                </span>
              </div>

              <div className="text-amber-700 font-extrabold text-base mt-1">
                {artisan.trade}
              </div>

              {/* Repère ou quartier saisi par l'artisan (rien si vide, pas de faux texte démo) */}
              {displayAddress ? (
                <div className="flex items-center gap-1.5 text-slate-600 text-sm mt-1">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{displayAddress}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Quick Metrics Bar: Rating, Jobs, Proximity */}
          <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-100 text-center">
            <div className="bg-slate-50 p-3 rounded-2xl">
              <div className="flex items-center justify-center gap-1 text-amber-500 font-black text-xl">
                <Star className="w-5 h-5 fill-amber-400" />
                <span>{artisan.rating.toFixed(1)}</span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {artisan.reviewCount} avis clients
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl">
              <div className="font-black text-xl text-slate-900">
                {artisan.completedJobs}+
              </div>
              <span className="text-xs font-bold text-slate-500">
                Travaux réalisés
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl">
              <div className="font-black text-lg sm:text-xl text-emerald-600">
                {distanceText}
              </div>
              <span className="text-xs font-bold text-slate-500">
                Distance GPS
              </span>
            </div>
          </div>

          {/* Présentation vocale : Uniquement si du texte personnalisé existe */}
          {displayBio ? (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayBio}
                  className="w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center shadow-xs active:scale-95 transition-transform shrink-0 cursor-pointer"
                  aria-label={isPlayingBio ? 'Pause' : 'Écouter'}
                >
                  {isPlayingBio ? (
                    <Pause className="w-6 h-6 fill-slate-950" />
                  ) : (
                    <Play className="w-6 h-6 fill-slate-950 ml-0.5" />
                  )}
                </button>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Présentation vocale de l'artisan
                  </span>
                  <p className="text-sm text-slate-800 font-medium line-clamp-1">
                    « {displayBio} »
                  </p>
                </div>
              </div>

              {isPlayingBio && (
                <div className="flex items-end gap-1 h-6">
                  <span className="w-1 bg-amber-600 rounded-full soundwave-bar-1" />
                  <span className="w-1 bg-amber-600 rounded-full soundwave-bar-2" />
                  <span className="w-1 bg-amber-600 rounded-full soundwave-bar-3" />
                  <span className="w-1 bg-amber-600 rounded-full soundwave-bar-4" />
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Portfolio : UNIQUEMENT les photos importées par l'artisan (0 photo démo) */}
        <div className="mt-6 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-600" />
              <span>Portfolio : Travaux réalisés</span>
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {realPhotos.length} photo{realPhotos.length > 1 ? 's' : ''}
            </span>
          </div>

          {realPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {realPhotos.map((photo, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    sounds.playClick();
                    setActivePhoto(photo);
                  }}
                  className="aspect-square rounded-2xl overflow-hidden relative cursor-pointer group border border-slate-100"
                >
                  <img
                    src={photo}
                    alt={`Réalisation ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-sm font-semibold italic">
              Aucune photo de réalisation pour le moment
            </div>
          )}
        </div>

        {/* Reviews Section : Vrais avis enregistrés dans Supabase */}
        <div className="mt-6 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span>Avis clients & Note moyenne</span>
              </h2>
              <p className="text-xs text-slate-500">
                Note globale : <b>{artisan.rating.toFixed(1)} / 5</b> ({artisan.reviewCount} avis)
              </p>
            </div>
            <button
              onClick={() => onOpenReviewModal(artisan)}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-black transition-colors shadow-xs cursor-pointer"
            >
              ★ Noter cet artisan
            </button>
          </div>

          {!artisan.reviews || artisan.reviews.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-sm font-semibold text-slate-600">
                Aucun avis pour l'instant. Soyez le premier à donner votre note après votre service !
              </p>
              <button
                onClick={() => onOpenReviewModal(artisan)}
                className="mt-3 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Laisser un avis (1-5 étoiles)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {artisan.reviews.map((rev) => (
                <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-sm text-slate-900">
                      {rev.author}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  {rev.text && (
                    <p className="text-sm text-slate-700 font-medium">
                      « {rev.text} »
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                    <span>{rev.date}</span>
                    {rev.hasAudio && (
                      <button
                        onClick={() => {
                          sounds.playClick();
                          speakAloud(`Avis de ${rev.author} : ${rev.text}`);
                        }}
                        className="flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-lg"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Écouter ({rev.audioDuration})
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Localisation Map + Itinéraire */}
        <div className="mt-6 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Position GPS de l'atelier
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {artisan.lat !== null && artisan.lng !== null
                  ? `Coordonnées : ${artisan.lat.toFixed(4)}, ${artisan.lng.toFixed(4)}`
                  : 'Position GPS non renseignée'}
              </p>
            </div>
            {artisan.lat !== null && artisan.lng !== null && (
              <button
                onClick={openGoogleMapsRoute}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold active:scale-95 transition-transform cursor-pointer"
              >
                <span>Voir itinéraire</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <ArtisanMap
            artisans={[artisan]}
            selectedArtisan={artisan}
            onSelectArtisan={() => {}}
            userLocation={userLocation}
            center={
              artisan.lat !== null && artisan.lng !== null
                ? [artisan.lat, artisan.lng]
                : undefined
            }
            zoom={15}
            heightClass="h-[220px]"
          />
        </div>
      </div>

      {/* Lightbox for work photos */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <button
            onClick={() => setActivePhoto(null)}
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activePhoto}
            alt="Travail agrandi"
            className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}

      {/* Bottom Sticky Action Bar: Call direct or WhatsApp */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-2xl">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <a
            href={`tel:${artisan.phone}`}
            onClick={() => {
              sounds.playClick();
              onCall(artisan);
            }}
            className="flex-1 min-h-[56px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10 active:scale-95 transition-transform"
          >
            <Phone className="w-6 h-6 fill-white" />
            <span>Appeler ({artisan.phone || 'Direct'})</span>
          </a>

          {artisan.whatsapp && (
            <a
              href={`https://wa.me/${artisan.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                `Bonjour ${artisan.name}, je vous contacte depuis EFA EDO pour vos services de ${artisan.trade}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                sounds.playClick();
                onCall(artisan);
              }}
              className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-2xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
              title="Discuter sur WhatsApp"
            >
              <MessageCircle className="w-7 h-7 fill-white" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
