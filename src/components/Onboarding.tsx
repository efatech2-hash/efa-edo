import React, { useState, useEffect } from 'react';
import {
  User,
  Hammer,
  Volume2,
  Check,
  ChevronRight,
  MapPin,
  Camera,
  ArrowLeft,
  Sparkles,
  Phone,
  ShieldCheck,
  PlusCircle,
  Navigation
} from 'lucide-react';
import { CurrentUser, GeoCoordinates, StandardTrade } from '../types';
import { CATEGORIES_DATA } from '../data/categories';
import { TradeIcon } from './TradeIcon';
import { speakAloud, sounds } from '../utils/audio';
import { requestDeviceCoordinates, DEFAULT_AFRICA_COORDS } from '../utils/geo';

import imgCarpenter from '../assets/images/artisan_carpenter_1793314552381.jpg';
import imgMechanic from '../assets/images/artisan_mechanic_1793314564546.jpg';
import imgTailor from '../assets/images/artisan_tailor_1793314577852.jpg';

interface OnboardingProps {
  onComplete: (
    user: CurrentUser,
    newArtisanData?: {
      trade: string;
      additionalTrades: string[];
      workPhotos: string[];
      addressDetail: string;
      lat: number | null;
      lng: number | null;
      customTradeName?: string;
    }
  ) => void | Promise<void>;
  onCancel?: () => void;
  onSaveCustomTrade?: (tradeName: string) => void;
  initialCoords?: GeoCoordinates | null;
}

export const Onboarding: React.FC<OnboardingProps> = ({
  onComplete,
  onCancel,
  onSaveCustomTrade,
  initialCoords,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [role, setRole] = useState<'client' | 'artisan'>('client');
  const [phone, setPhone] = useState('90123456');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);

  // Artisan specific
  const [selectedTrades, setSelectedTrades] = useState<string[]>(['Menuisier Bois']);
  const [customTradeInput, setCustomTradeInput] = useState('');
  const [name, setName] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [coords, setCoords] = useState<GeoCoordinates | null>(
    initialCoords || null
  );
  const [hasDetectedGps, setHasDetectedGps] = useState(!!initialCoords);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [avatar, setAvatar] = useState<string>(imgCarpenter);
  const [workPhotos] = useState<string[]>([imgCarpenter, imgMechanic, imgTailor]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio guide explanation
  const explainStep = () => {
    sounds.playClick();
    if (step === 1) {
      speakAloud("Bienvenue sur EFA EDO. Tu cherches un artisan pour faire un travail, ou bien tu es artisan pour trouver des clients ? Choisis ton rôle.");
    } else if (step === 2) {
      speakAloud("Mets ton numéro WhatsApp pour te connecter. Nous allons t'envoyer un code de validation.");
    } else if (step === 3) {
      speakAloud("Quel est ton métier ? Tu peux choisir parmi tous les métiers ou sélectionner Autre pour écrire ton propre métier.");
    } else if (step === 4) {
      speakAloud("Donne ton nom et valide ta position GPS. Grâce au GPS, les clients les plus proches te trouveront en 30 secondes.");
    }
  };

  const handleSelectRole = (chosenRole: 'client' | 'artisan') => {
    sounds.playClick();
    setRole(chosenRole);
    if (chosenRole === 'client') {
      setName('Client EFA');
    }
    setStep(2);
  };

  const handleSendOtp = () => {
    if (!phone || phone.length < 8) return;
    sounds.playClick();
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setSimulatedOtp(code);
    setOtpSent(true);
    sounds.playSuccess();
    speakAloud(`Votre code de confirmation WhatsApp est le ${code.split('').join(' ')}`);
  };

  const handleVerifyOtp = () => {
    sounds.playClick();
    sounds.playSuccess();
    if (role === 'client') {
      // Client onboarding complete!
      const clientUser: CurrentUser = {
        id: `client-${Date.now()}`,
        role: 'client',
        phone: `+228 ${phone}`,
        name: name || 'Client EDO',
        lat: coords ? coords.lat : undefined,
        lng: coords ? coords.lng : undefined,
      };
      onComplete(clientUser);
    } else {
      // Go to trade selection
      setStep(3);
    }
  };

  const toggleTrade = (tradeName: string) => {
    sounds.playClick();
    if (selectedTrades.includes(tradeName)) {
      if (selectedTrades.length > 1) {
        setSelectedTrades(selectedTrades.filter((t) => t !== tradeName));
      }
    } else {
      setSelectedTrades([...selectedTrades, tradeName]);
      // Update avatar hint based on trade
      if (tradeName.includes('Mécanicien')) setAvatar(imgMechanic);
      else if (tradeName.includes('Couturier') || tradeName.includes('Tailleur')) setAvatar(imgTailor);
      else if (tradeName.includes('Menuisier')) setAvatar(imgCarpenter);
    }
  };

  // GPS position detection
  const handleDetectGps = async () => {
    sounds.playClick();
    setIsGpsLoading(true);
    try {
      const position = await requestDeviceCoordinates();
      setCoords(position);
      setHasDetectedGps(true);
      setIsGpsLoading(false);
      sounds.playSuccess();
      speakAloud("Position GPS captée avec succès !");
    } catch {
      setIsGpsLoading(false);
      setHasDetectedGps(true);
      // If unavailable, coords remains null
      speakAloud("Impossible de capter le GPS. Vous pourrez continuer sans coordonnées.");
    }
  };

  // Trigger GPS detection when reaching Step 4 for artisans
  useEffect(() => {
    if (step === 4 && !hasDetectedGps) {
      handleDetectGps();
    }
  }, [step]);

  const handleFinishArtisan = async () => {
    setIsSubmitting(true);
    try {
      sounds.playSuccess();

      // Determine primary trade name
      const isOther = selectedTrades.includes('Autre');
      const effectiveTrade = isOther && customTradeInput.trim()
        ? customTradeInput.trim()
        : selectedTrades[0] || 'Artisan';

      // Save custom trade for admin list
      if (isOther && customTradeInput.trim() && onSaveCustomTrade) {
        onSaveCustomTrade(customTradeInput.trim());
      }

      const artisanUser: CurrentUser = {
        id: `art-${Date.now()}`,
        role: 'artisan',
        phone: `+228 ${phone}`,
        name: name.trim() || 'Maître Artisan',
        addressDetail: addressDetail.trim() || 'Atelier & Dépannage express',
        lat: coords ? coords.lat : undefined,
        lng: coords ? coords.lng : undefined,
        avatar: avatar,
        isOnline: true,
        isPro: false,
      };

      await onComplete(artisanUser, {
        trade: effectiveTrade,
        customTradeName: isOther ? customTradeInput.trim() : undefined,
        additionalTrades: selectedTrades.filter((t) => t !== 'Autre' && t !== effectiveTrade),
        workPhotos: workPhotos,
        addressDetail: addressDetail.trim() || 'Atelier & Dépannage express',
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOtherSelected = selectedTrades.includes('Autre');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-xl mx-auto px-4 py-6">
      {/* Top Bar with Audio Assistant */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {step > 1 ? (
          <button
            onClick={() => {
              sounds.playClick();
              setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
            }}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-700 shadow-xs active:scale-95 transition-transform"
            aria-label="Retour"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : onCancel ? (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl"
          >
            Passer
          </button>
        ) : (
          <div className="w-12" />
        )}

        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Étape {step} sur {role === 'client' ? 2 : 4}
          </span>
        </div>

        {/* Big Audio Read button for illiterate users */}
        <button
          onClick={explainStep}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold shadow-xs active:scale-95 transition-transform"
          title="Écouter les explications en voix"
        >
          <Volume2 className="w-5 h-5" />
          <span className="text-xs font-bold">Écouter</span>
        </button>
      </div>

      {/* Screen 1: Role choice */}
      {step === 1 && (
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-29_at_23.28.39_4ef8d08c.jpg"
              alt="EFA EDO"
              className="w-[48px] h-[48px] rounded-[12px] object-contain mx-auto mb-3 shadow-xs bg-slate-950"
            />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Bienvenue sur <span className="text-amber-600">EFA EDO</span>
            </h1>
            <p className="text-lg text-slate-600 font-medium">
              Tu es ?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 mb-8">
            {/* Card 1: Cherche un artisan */}
            <button
              onClick={() => handleSelectRole('client')}
              className="flex items-center gap-5 p-6 rounded-3xl bg-white border-3 border-slate-200 hover:border-amber-500 text-left shadow-sm hover:shadow-md active:scale-[0.98] transition-all group"
            >
              <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 group-hover:scale-105 transition-transform">
                <User className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Client
                </span>
                <h2 className="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                  Je CHERCHE un artisan
                </h2>
                <p className="text-slate-500 text-base font-medium mt-1">
                  Trouve un pro près de toi par GPS en 30 secondes
                </p>
              </div>
              <ChevronRight className="w-8 h-8 text-slate-300 group-hover:text-amber-600 transition-colors shrink-0" />
            </button>

            {/* Card 2: Je SUIS artisan */}
            <button
              onClick={() => handleSelectRole('artisan')}
              className="flex items-center gap-5 p-6 rounded-3xl bg-slate-900 border-3 border-slate-900 hover:border-amber-400 text-left shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-white group"
            >
              <div className="w-20 h-20 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shrink-0 group-hover:scale-105 transition-transform">
                <Hammer className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Professionnel
                </span>
                <h2 className="text-2xl font-black text-white group-hover:text-amber-300 transition-colors">
                  Je SUIS artisan
                </h2>
                <p className="text-slate-300 text-base font-medium mt-1">
                  Reçois des appels de clients proches de ton atelier
                </p>
              </div>
              <ChevronRight className="w-8 h-8 text-amber-400 shrink-0" />
            </button>
          </div>

          <div className="text-center text-slate-500 text-sm font-medium">
            EFA EDO · EFA TECHNOLOGIE
          </div>
        </div>
      )}

      {/* Screen 2: WhatsApp Number + OTP */}
      {step === 2 && (
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-3xl bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-3">
              <Phone className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Ton numéro WhatsApp
            </h2>
            <p className="text-base text-slate-600 font-medium mt-1">
              Les clients te contacteront directement sur ce numéro
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Numéro de téléphone
            </label>
            <div className="flex items-center gap-3">
              <div className="px-4 py-4 rounded-2xl bg-slate-100 font-bold text-lg text-slate-800 shrink-0">
                📱
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 90 12 34 56"
                className="flex-1 px-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-amber-500 text-xl font-bold text-slate-900 outline-none"
                maxLength={12}
              />
            </div>

            {!otpSent ? (
              <button
                onClick={handleSendOtp}
                disabled={phone.length < 8}
                className="w-full mt-5 min-h-[58px] rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 text-lg font-black flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
              >
                Recevoir mon code par WhatsApp
              </button>
            ) : (
              <div className="mt-5 pt-5 border-t border-slate-100">
                {simulatedOtp && (
                  <div
                    onClick={() => setOtpCode(simulatedOtp)}
                    className="cursor-pointer mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>WhatsApp : Votre code est <b>{simulatedOtp}</b> (cliquez pour insérer)</span>
                  </div>
                )}
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Code à 4 chiffres reçu
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="w-full text-center tracking-[0.5em] px-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 text-3xl font-black text-slate-900 outline-none"
                  maxLength={4}
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length < 4}
                  className="w-full mt-4 min-h-[58px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-lg font-black flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
                >
                  <ShieldCheck className="w-6 h-6" />
                  Valider et Continuer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen 3 (Artisan only): Expanded African Craft Trades + Autre option */}
      {step === 3 && role === 'artisan' && (
        <div className="flex-1 flex flex-col">
          <div className="text-center mb-3">
            <h2 className="text-2xl font-black text-slate-900">
              Choisis ton métier
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Sélectionne ton métier artisanal ou choisis « Autre »
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-4 max-h-[50vh] overflow-y-auto pr-1">
            {CATEGORIES_DATA.map((cat) => {
              const isSelected = selectedTrades.includes(cat.name);
              const isAutre = cat.name === 'Autre';

              return (
                <button
                  key={cat.name}
                  onClick={() => toggleTrade(cat.name)}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center relative transition-all min-h-[110px] ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/90 shadow-md ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                  >
                    <TradeIcon trade={cat.name} className="w-6 h-6" />
                  </div>

                  <span className="font-extrabold text-sm text-slate-900 leading-tight">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Autre: Custom trade text input */}
          {isOtherSelected && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 animate-in fade-in zoom-in-95">
              <label className="block text-xs font-black uppercase text-amber-900 mb-1 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-amber-600" />
                <span>Précise ton métier artisanal</span>
              </label>
              <input
                type="text"
                value={customTradeInput}
                onChange={(e) => setCustomTradeInput(e.target.value)}
                placeholder="Ex: Forgeron d'art, Potier, Tisserand, Vitrier..."
                className="w-full px-4 py-3 rounded-xl border-2 border-amber-300 focus:border-amber-600 bg-white text-base font-bold text-slate-900 outline-none"
                autoFocus
              />
              <p className="text-[11px] text-amber-800 font-medium mt-1">
                Ce métier sera enregistré et soumis à l'administration pour enrichir la liste officielle.
              </p>
            </div>
          )}

          <button
            onClick={() => {
              sounds.playClick();
              setStep(4);
            }}
            disabled={
              selectedTrades.length === 0 ||
              (isOtherSelected && !customTradeInput.trim() && selectedTrades.length === 1)
            }
            className="w-full min-h-[58px] rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 text-lg font-black flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all shrink-0"
          >
            Continuer ({selectedTrades.length} sélectionné{selectedTrades.length > 1 ? 's' : ''})
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Screen 4: Pure Geolocation (No Predefined Quartiers) + Profile Details */}
      {step === 4 && role === 'artisan' && (
        <div className="flex-1 flex flex-col overflow-y-auto max-h-[80vh] pr-1 pb-4">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-black text-slate-900">
              Position GPS & Profil
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Les clients te trouveront par proximité GPS automatique
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {/* Nom */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Ton Nom ou Nom d'atelier
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maître Kodjo Lawson"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-amber-500 text-lg font-bold text-slate-900 outline-none"
              />
            </div>

            {/* PURE GEOLOCATION SECTION (NO QUARTIERS DROPDOWN) */}
            <div className="bg-white p-4 rounded-2xl border-2 border-emerald-400 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Position GPS de ton atelier
                    </h3>
                    <p className="text-xs text-slate-500">
                      Calcul automatique de distance pour les clients
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={isGpsLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs active:scale-95 transition-transform"
                >
                  <MapPin className="w-4 h-4" />
                  <span>{isGpsLoading ? 'Détection...' : 'Actualiser GPS'}</span>
                </button>
              </div>

              {/* Coordinates Badge */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                coords
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${coords ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span>
                    {coords
                      ? `GPS actif : ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                      : 'GPS non capté (L’atelier sera sans coordonnées)'}
                  </span>
                </div>
                <span className={`text-[11px] font-extrabold uppercase ${coords ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {coords ? 'Précis' : 'Optionnel'}
                </span>
              </div>

              {/* Repère ou Rue text input (universal without fixed quartier list) */}
              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Repère pour les clients (facultatif)
                </label>
                <input
                  type="text"
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  placeholder="Ex: Face pharmacie de la Paix, près de la station"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Photo de profil */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Photo de profil
              </label>
              <div className="flex items-center gap-4">
                <img
                  src={avatar}
                  alt="Profil"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500 shadow-xs"
                />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-2">
                    Montre ton visage souriant pour donner confiance aux clients
                  </p>
                  <div className="flex gap-2">
                    {[imgCarpenter, imgMechanic, imgTailor].map((sampleImg, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setAvatar(sampleImg);
                        }}
                        className={`w-10 h-10 rounded-xl overflow-hidden border-2 ${
                          avatar === sampleImg ? 'border-amber-500' : 'border-transparent'
                        }`}
                      >
                        <img src={sampleImg} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleFinishArtisan}
            disabled={isSubmitting}
            className="w-full min-h-[58px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-lg font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            {isSubmitting ? 'Enregistrement sur Supabase...' : 'Activer mon compte Artisan EDO'}
          </button>
        </div>
      )}
    </div>
  );
};
