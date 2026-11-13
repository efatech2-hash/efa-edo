import React, { useState, useMemo } from 'react';
import {
  Mic,
  MicOff,
  MapPin,
  Star,
  Phone,
  MessageCircle,
  Volume2,
  Search,
  Map as MapIcon,
  List as ListIcon,
  Crown,
  Sparkles,
  Navigation,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  Share2,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { Artisan, GeoCoordinates } from '../types';
import { CATEGORIES_DATA } from '../data/categories';
import { TradeIcon } from './TradeIcon';
import { ArtisanMap } from './ArtisanMap';
import { speakAloud, startVoiceRecognition, sounds } from '../utils/audio';
import { calculateHaversineDistanceKm, formatDistanceBadge } from '../utils/geo';
import { AppDownloadSection } from './AppDownloadSection';

interface HomeClientProps {
  artisans: Artisan[];
  userLocation: GeoCoordinates | null;
  onSelectArtisan: (artisan: Artisan) => void;
  onCallInitiated: (artisan: Artisan) => void;
  onOpenVoiceAssistant: () => void;
  onOpenReviewModal: (artisan: Artisan) => void;
  onRefreshGps: () => void;
  isGpsLoading?: boolean;
}

export const HomeClient: React.FC<HomeClientProps> = ({
  artisans,
  userLocation,
  onSelectArtisan,
  onCallInitiated,
  onOpenReviewModal,
  onRefreshGps,
  isGpsLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('Tous');
  const [selectedLocality, setSelectedLocality] = useState<string>('Toutes');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>('both');
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  const getAppShareUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://efa-edo.vercel.app';
  };

  const handleCopyLink = async () => {
    sounds.playClick();
    const url = getAppShareUrl();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setHasCopiedLink(true);
      sounds.playSuccess();
      speakAloud("Lien copié dans le presse-papier !");
      setTimeout(() => setHasCopiedLink(false), 2500);
    } catch {
      alert("Lien : " + url);
    }
  };

  const handleShareWhatsApp = () => {
    sounds.playClick();
    const url = getAppShareUrl();
    const text = encodeURIComponent(
      `Trouve un artisan professionnel près de toi en 30 secondes sur EFA EDO ! ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    sounds.playClick();
    const url = encodeURIComponent(getAppShareUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleNativeShare = async () => {
    sounds.playClick();
    const url = getAppShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'EFA EDO - Marketplace des Artisans',
          text: 'Trouve un artisan pro près de toi en 30 secondes sur EFA EDO !',
          url,
        });
      } catch {
        // user cancelled
      }
    } else {
      setIsShareModalOpen(true);
    }
  };

  // Micro voice search handler
  const handleStartVoiceSearch = () => {
    sounds.playClick();
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setVoiceNotice("Parle maintenant... Ex: « Vulcanisateur », « Mécanicien » ou « Plombier »");
    speakAloud("Dis ce que tu cherches. Par exemple : mécanicien, vulcanisateur, plombier ou coiffeur.");

    startVoiceRecognition(
      (transcript) => {
        setIsListening(false);
        setSearchTerm(transcript);
        setVoiceNotice(`Compris : "${transcript}"`);

        // Check if any category was spoken
        const lower = transcript.toLowerCase();
        const matchedCat = CATEGORIES_DATA.find((c) =>
          lower.includes(c.name.toLowerCase())
        );
        if (matchedCat) {
          setSelectedTrade(matchedCat.name);
        }
      },
      () => {
        setIsListening(false);
        setVoiceNotice(null);
      }
    );
  };

  // Compute Haversine distance from client for every artisan & sort nearest first
  const processedArtisans = useMemo(() => {
    return artisans.map((artisan) => {
      let distanceKm = 0.5; // fallback
      if (userLocation) {
        distanceKm = calculateHaversineDistanceKm(
          userLocation.lat,
          userLocation.lng,
          artisan.lat,
          artisan.lng
        );
      }
      return {
        ...artisan,
        distanceKm,
        distanceBadge: formatDistanceBadge(distanceKm),
      };
    });
  }, [artisans, userLocation]);

  // Extract unique localities from registered artisans
  const availableLocalities = useMemo(() => {
    const set = new Set<string>();
    artisans.forEach((a) => {
      if (a.locality && a.locality.trim()) {
        set.add(a.locality.trim());
      }
      if (a.addressDetail && a.addressDetail.trim()) {
        const parts = a.addressDetail.split(/[,()\-–]/).map((p) => p.trim()).filter((p) => p.length > 2);
        parts.forEach((p) => {
          if (!p.toLowerCase().includes('rue') && !p.toLowerCase().includes('face') && !p.toLowerCase().includes('près') && p.length < 25) {
            set.add(p);
          }
        });
      }
    });
    return Array.from(set).slice(0, 10);
  }, [artisans]);

  // Filter and sort nearest first
  const filteredArtisans = useMemo(() => {
    const list = processedArtisans.filter((artisan: typeof processedArtisans[number]) => {
      if (showOnlyOnline && !artisan.isOnline) return false;

      // Filter by trade
      if (selectedTrade !== 'Tous') {
        const matchesMainTrade = artisan.trade.toLowerCase() === selectedTrade.toLowerCase();
        const matchesAdditional = artisan.additionalTrades?.some(
          (t: string) => t.toLowerCase() === selectedTrade.toLowerCase()
        );
        if (!matchesMainTrade && !matchesAdditional) return false;
      }

      // Filter by locality (Bug 12)
      if (selectedLocality !== 'Toutes') {
        const targetLoc = selectedLocality
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const aLoc = (artisan.locality || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const aAddr = (artisan.addressDetail || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        if (!aLoc.includes(targetLoc) && !aAddr.includes(targetLoc)) {
          return false;
        }
      }

      // Filter by max distance radius
      if (maxDistanceKm !== null && artisan.distanceKm > maxDistanceKm) {
        return false;
      }

      // Filter by text search (Bug 11: Insensible casse/accents, multi-mots "Efa technologie")
      if (searchTerm.trim()) {
        const cleanQuery = searchTerm
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();

        const words = cleanQuery.split(/\s+/).filter(Boolean);

        const aName = (artisan.name || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const aTrade = (artisan.trade || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const aCustom = (artisan.customTradeName || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const aAddr = (artisan.addressDetail || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const aLoc = (artisan.locality || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();

        const combinedText = `${aName} ${aTrade} ${aCustom} ${aAddr} ${aLoc}`;

        const matchFull = combinedText.includes(cleanQuery);
        const matchAllWords = words.every((w: string) => combinedText.includes(w));

        if (!matchFull && !matchAllWords) {
          return false;
        }
      }

      return true;
    });

    // Tri : boostés actifs d'abord (is_boosted=true AND boost_until>now()), puis autres par distance
    return list.sort((a: typeof processedArtisans[number], b: typeof processedArtisans[number]) => {
      const isABoosted =
        !!a.isBoosted && (!a.boostUntil || new Date(a.boostUntil).getTime() > Date.now());
      const isBBoosted =
        !!b.isBoosted && (!b.boostUntil || new Date(b.boostUntil).getTime() > Date.now());

      if (isABoosted && !isBBoosted) return -1;
      if (!isABoosted && isBBoosted) return 1;

      return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
    });
  }, [processedArtisans, showOnlyOnline, selectedTrade, selectedLocality, maxDistanceKm, searchTerm]);

  // Calculate live count online per category
  const getOnlineCount = (tradeName: string) => {
    return artisans.filter(
      (a) =>
        a.isOnline &&
        (a.trade.toLowerCase() === tradeName.toLowerCase() ||
          a.additionalTrades?.some((t) => t.toLowerCase() === tradeName.toLowerCase()))
    ).length;
  };

  const readArtisanCard = (artisan: typeof processedArtisans[0], e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playClick();
    speakAloud(
      `${artisan.name}, ${artisan.trade}, situé ${artisan.distanceBadge}. Noté ${artisan.rating.toFixed(
        1
      )} étoiles sur 5. ${
        artisan.isOnline
          ? 'En ligne et disponible immédiatement.'
          : 'Actuellement hors ligne.'
      } Appuie sur le bouton vert pour l'appeler.`
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* GPS Status Banner & Universal Proximity Bar */}
      <section className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-3xl shadow-sm border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
            <Navigation className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Géolocalisation Directe
              </span>
            </div>
            <p className="text-sm font-extrabold text-white truncate">
              {userLocation
                ? `GPS connecté · Tri des artisans les plus proches`
                : `Détection GPS de votre appareil...`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Bouton Partager Client - Discret mais visible responsive mobile + desktop */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsShareModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-xs active:scale-95 transition-transform cursor-pointer"
            title="Partager l'application EFA EDO"
            aria-label="Partager"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Partager</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onRefreshGps();
            }}
            disabled={isGpsLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-extrabold text-white border border-slate-700 active:scale-95 transition-transform shrink-0 cursor-pointer"
            title="Actualiser ma position GPS"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${isGpsLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isGpsLoading ? 'Recherche...' : 'GPS'}</span>
          </button>
        </div>
      </section>

      {/* Search Header with Voice Button */}
      <section className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Dis ou écris ce que tu cherches..."
              className="w-full pl-13 pr-4 py-4 rounded-2xl bg-slate-100 text-slate-900 font-bold text-lg focus:bg-white border-2 border-transparent focus:border-amber-500 outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-lg"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Huge Voice Microphone button */}
          <button
            onClick={handleStartVoiceSearch}
            className={`min-w-[62px] min-h-[62px] rounded-2xl flex flex-col items-center justify-center gap-1 font-bold text-xs shadow-md active:scale-95 transition-all ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-amber-400 hover:bg-amber-500 text-slate-950'
            }`}
            title="Recherche par la voix"
            aria-label="Recherche vocale"
          >
            {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            <span className="text-[11px] font-black uppercase tracking-tight">Voix</span>
          </button>
        </div>

        {voiceNotice && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{voiceNotice}</span>
            </div>
            <button onClick={() => setVoiceNotice(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* Distance Proximity Filters (Universal Africa - Replaces Predefined Districts) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider pl-1 shrink-0 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Rayon :
          </span>
          {[
            { label: 'Toutes distances', val: null },
            { label: 'Moins de 1 km', val: 1 },
            { label: 'Moins de 3 km', val: 3 },
            { label: 'Moins de 5 km', val: 5 },
            { label: 'Moins de 10 km', val: 10 },
          ].map((item, idx) => {
            const isSelected = maxDistanceKm === item.val;
            return (
              <button
                key={idx}
                onClick={() => {
                  sounds.playClick();
                  setMaxDistanceKm(item.val);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Localités / Quartiers Filter (Bug 12) */}
        {availableLocalities.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-1 scrollbar-none border-t border-slate-100 mt-2.5">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider pl-1 shrink-0">
              Quartier :
            </span>
            {['Toutes', ...availableLocalities].map((loc) => {
              const isSelected = selectedLocality === loc;
              return (
                <button
                  key={loc}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedLocality(loc);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-amber-300 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {loc}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Voice Tips Banner: Anti-Arnaque, Profil Vérifié, Recrutement, Commande & Donner mon avis */}
      <section className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 sm:p-5 rounded-3xl text-slate-950 shadow-md space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-950" />
            <h3 className="font-black text-sm uppercase tracking-wide">
              Conseils de Sécurité & Audio EDO
            </h3>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              window.open('https://efa-technologie.vercel.app', '_blank');
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-transform"
            title="Ouvrir EFA TECHNOLOGIE"
          >
            <span>Donner mon avis</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Conseil Anti-Arnaque (Bugs 16 & 17) */}
          <div className="bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-400/50 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full inline-block mb-1.5">
                Anti-Arnaque
              </span>
              <p className="text-xs font-bold text-slate-900 leading-snug">
                Ne paie pas avant le travail. Attends que l'artisan soit là. Paie après le travail. Rencontre-toi avec lui avant.
              </p>
              <p className="text-[11px] font-semibold text-slate-600 mt-1">
                Active les notifications. Vérifie que le profil est vérifié et certifié. Si pas vérifié, ne fais pas appel.
              </p>
            </div>
            <button
              onClick={() => {
                sounds.playClick();
                speakAloud(
                  "Ne paie pas avant le travail. Attends que l'artisan soit là. Paie après le travail. Rencontre-toi avec lui avant. Active les notifications. Vérifie que le profil est vérifié et certifié. Si pas vérifié, ne fais pas appel."
                );
              }}
              className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-black text-amber-900 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-amber-600" />
              <span>Écouter le conseil sécurité</span>
            </button>
          </div>

          {/* 2. Message Commande (Bug 19) */}
          <div className="bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-400/50 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mb-1.5">
                Besoin d'un Dépannage ?
              </span>
              <p className="text-xs font-bold text-slate-900 leading-snug">
                Tu as un problème voiture, frigo, maison ? Commande ! Il y a beaucoup d'artisans. Inscris-toi, commande, fais connaître l'app.
              </p>
            </div>
            <button
              onClick={() => {
                sounds.playClick();
                speakAloud(
                  "Tu as un problème voiture, frigo, maison ? Commande ! Il y a beaucoup d'artisans. Inscris-toi, commande, fais connaître l'app."
                );
              }}
              className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-black text-amber-900 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-amber-600" />
              <span>Écouter le message</span>
            </button>
          </div>

          {/* 3. Message Recrutement Artisans (Bug 18) */}
          <div className="bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-400/50 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full inline-block mb-1.5">
                Tu es Artisan ?
              </span>
              <p className="text-xs font-bold text-slate-900 leading-snug">
                Inscris-toi, c'est une bonne application. Il y a beaucoup d'opportunités, beaucoup de clients. Partage l'application pour la faire connaître.
              </p>
            </div>
            <button
              onClick={() => {
                sounds.playClick();
                speakAloud(
                  "Inscris-toi, c'est une bonne application. Il y a beaucoup d'opportunités, beaucoup de clients. Partage l'application pour la faire connaître."
                );
              }}
              className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-black text-amber-900 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-amber-600" />
              <span>Écouter l'opportunité</span>
            </button>
          </div>
        </div>
      </section>

      {/* Trades Grid with Visual Icons + Count Online */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>Métiers artisanaux</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {artisans.filter((a) => a.isOnline).length} en ligne
            </span>
          </h2>
          {selectedTrade !== 'Tous' && (
            <button
              onClick={() => {
                sounds.playClick();
                setSelectedTrade('Tous');
              }}
              className="text-xs font-extrabold text-amber-600 hover:underline"
            >
              Voir tous les métiers
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {CATEGORIES_DATA.map((cat) => {
            const isSelected = selectedTrade === cat.name;
            const onlineCount = getOnlineCount(cat.name);

            return (
              <button
                key={cat.name}
                onClick={() => {
                  sounds.playClick();
                  setSelectedTrade(isSelected ? 'Tous' : cat.name);
                }}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center relative transition-all active:scale-95 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Online badge counter */}
                {onlineCount > 0 ? (
                  <span className="absolute top-1.5 right-1.5 flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {onlineCount}
                  </span>
                ) : null}

                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-1.5"
                  style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                >
                  <TradeIcon trade={cat.name} className="w-5 h-5" />
                </div>

                <span className="font-extrabold text-xs text-slate-900 leading-tight line-clamp-2">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Map Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">
              Carte GPS des artisans
            </h2>
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              Autour de votre position en temps réel
            </span>
          </div>

          <div className="flex items-center bg-slate-200 p-1 rounded-xl">
            <button
              onClick={() => {
                sounds.playClick();
                setViewMode('both');
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                viewMode === 'both' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Mixte
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setViewMode('map');
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                viewMode === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Carte
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setViewMode('list');
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              Liste
            </button>
          </div>
        </div>

        {viewMode !== 'list' && (
          <ArtisanMap
            artisans={filteredArtisans}
            selectedArtisan={null}
            onSelectArtisan={onSelectArtisan}
            userLocation={userLocation}
            heightClass="h-[320px]"
          />
        )}
      </section>

      {/* Artisan List: Sorted Nearest First */}
      {viewMode !== 'map' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span>Artisans les plus proches</span>
                <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                  {filteredArtisans.length}
                </span>
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Triés par ordre de proximité GPS (du plus proche au plus éloigné)
              </p>
            </div>

            {/* Online only toggle */}
            <button
              onClick={() => {
                sounds.playClick();
                setShowOnlyOnline(!showOnlyOnline);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                showOnlyOnline
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showOnlyOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              En ligne
            </button>
          </div>

          {filteredArtisans.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center">
              <p className="text-lg font-bold text-slate-700 mb-2">
                Aucun artisan pour le moment
              </p>
              {artisans.length > 0 && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTrade('Tous');
                    setMaxDistanceKm(null);
                    setShowOnlyOnline(false);
                  }}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-sm"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArtisans.map((artisan: typeof processedArtisans[number]) => (
                <div
                  key={artisan.id}
                  onClick={() => onSelectArtisan(artisan)}
                  className="bg-white rounded-3xl border-2 border-slate-200 hover:border-amber-400 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Top card info */}
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      {/* Avatar : Photo réelle ou Initiale */}
                      <div className="relative shrink-0">
                        {artisan.avatar ? (
                          <img
                            src={artisan.avatar}
                            alt={artisan.name}
                            className="w-18 h-18 rounded-2xl object-cover border border-slate-100"
                          />
                        ) : (
                          <div className="w-18 h-18 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center border border-slate-100 uppercase">
                            {(artisan.name?.charAt(0) || 'A').toUpperCase()}
                          </div>
                        )}
                        {/* Status indicator dot */}
                        {artisan.isOnline ? (
                          <div
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs animate-online-pulse"
                            title="En ligne"
                          />
                        ) : (
                          <div
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-400 border-2 border-white"
                            title="Hors ligne"
                          />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-extrabold text-lg text-slate-900 truncate">
                            {artisan.name}
                          </h3>
                          {artisan.isBoosted && (!artisan.boostUntil || new Date(artisan.boostUntil).getTime() > Date.now()) && (
                            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-xs">
                              <Sparkles className="w-3 h-3 fill-slate-950" />
                              BOOSTÉ PRO
                            </span>
                          )}
                          {artisan.isPro && !artisan.isBoosted && (
                            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider">
                              <Crown className="w-3 h-3 text-amber-700" />
                              PRO
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-amber-700 text-sm">
                            {artisan.trade}
                          </span>
                        </div>

                        {/* Proximity & Rating */}
                        <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
                          {/* Distance badge: "à 0.8km" */}
                          <span className="font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300">
                            📍 {artisan.distanceBadge}
                          </span>

                          {/* 1-5 Stars Rating with average */}
                          <div className="flex items-center gap-1 font-extrabold text-slate-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            <span>{artisan.rating.toFixed(1)}</span>
                            <span className="text-slate-500 font-semibold">
                              ({artisan.reviewCount} avis)
                            </span>
                          </div>

                          {/* Audio read button */}
                          <button
                            type="button"
                            onClick={(e) => readArtisanCard(artisan, e)}
                            className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 ml-auto"
                            title="Écouter la description"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Address landmark & Bio : Uniquement ce qui est saisi (pas de faux texte démo) */}
                    {(() => {
                      const addr = artisan.addressDetail?.trim() || '';
                      const isDemo = addr.toLowerCase().includes('dépannage express') || addr.toLowerCase() === 'atelier';
                      const cleanAddr = !isDemo && addr ? addr : '';
                      const bio = artisan.bioVoiceText?.trim() || '';
                      const cleanBio = !bio.toLowerCase().includes('dépannage express') && bio ? bio : '';

                      if (!cleanAddr && !cleanBio) return null;

                      return (
                        <div className="bg-slate-50 p-2.5 rounded-xl mb-3 text-xs text-slate-600">
                          {cleanAddr ? (
                            <p className="font-bold text-slate-800 mb-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{cleanAddr}</span>
                            </p>
                          ) : null}
                          {cleanBio ? (
                            <p className="line-clamp-2 italic">
                              « {cleanBio} »
                            </p>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>

                  {/* HUGE ACTION BUTTONS: Min 56px height, high contrast */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    {/* Call Button (tel:...) */}
                    <a
                      href={`tel:${artisan.phone}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playClick();
                        onCallInitiated(artisan);
                      }}
                      className="min-h-[56px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xs transition-transform"
                    >
                      <Phone className="w-5 h-5 fill-white" />
                      <span>Appeler</span>
                    </a>

                    {/* WhatsApp Button (wa.me) */}
                    <a
                      href={`https://wa.me/${artisan.whatsapp}?text=Bonjour%20${encodeURIComponent(
                        artisan.name
                      )},%20je%20vous%20contacte%20via%20EFA%20EDO%20pour%20un%20travail.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playClick();
                        onCallInitiated(artisan);
                      }}
                      className="min-h-[56px] rounded-2xl bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xs transition-transform"
                    >
                      <MessageCircle className="w-5 h-5 fill-white" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Section Télécharger l'application EFA Edo */}
      <AppDownloadSection />

      {/* Share Modal - WhatsApp, Facebook, Copier le lien, Partage natif */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-amber-400 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                sounds.playClick();
                setIsShareModalOpen(false);
              }}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto mb-2 shadow-md">
                <Share2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Partager EFA EDO</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Fais découvrir l'application d'artisans africains à tes proches !
              </p>
            </div>

            <div className="space-y-2.5 mb-5">
              {/* WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-sm active:scale-98 transition-transform cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>Partager sur WhatsApp</span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleShareFacebook}
                className="w-full py-3 px-4 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-sm active:scale-98 transition-transform cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-white text-[#1877F2] font-black flex items-center justify-center text-xs">f</span>
                <span>Partager sur Facebook</span>
              </button>

              {/* Copier le lien */}
              <button
                onClick={handleCopyLink}
                className={`w-full py-3 px-4 rounded-2xl border-2 font-extrabold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  hasCopiedLink
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-900 active:scale-98'
                }`}
              >
                {hasCopiedLink ? <Check className="w-5 h-5 text-emerald-600 stroke-[3]" /> : <Copy className="w-5 h-5 text-slate-700" />}
                <span>{hasCopiedLink ? 'Lien copié dans le presse-papier !' : 'Copier le lien'}</span>
              </button>

              {/* Partage natif si disponible */}
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  onClick={handleNativeShare}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 active:scale-98 transition-transform cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Autres applications (Partage système)</span>
                </button>
              )}
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                setIsShareModalOpen(false);
              }}
              className="w-full py-2.5 text-xs font-extrabold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
