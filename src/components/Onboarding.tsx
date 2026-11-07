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
  Phone,
  ShieldCheck,
  PlusCircle,
  Navigation,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { CurrentUser, GeoCoordinates } from '../types';
import { CATEGORIES_DATA } from '../data/categories';
import { TradeIcon } from './TradeIcon';
import { speakAloud, sounds } from '../utils/audio';
import { requestDeviceCoordinates } from '../utils/geo';

export const COUNTRY_CODES = [
  { code: '+228', country: 'Togo', flag: '🇹🇬' },
  { code: '+229', country: 'Bénin', flag: '🇧🇯' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+225', country: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
  { code: '+223', country: 'Mali', flag: '🇲🇱' },
  { code: '+227', country: 'Niger', flag: '🇳🇪' },
  { code: '+221', country: 'Sénégal', flag: '🇸🇳' },
  { code: '+224', country: 'Guinée', flag: '🇬🇳' },
  { code: '+245', country: 'Guinée-Bissau', flag: '🇬🇼' },
  { code: '+232', country: 'Sierra Leone', flag: '🇸🇱' },
  { code: '+231', country: 'Liberia', flag: '🇱🇷' },
  { code: '+220', country: 'Gambie', flag: '🇬🇲' },
  { code: '+238', country: 'Cap-Vert', flag: '🇨🇻' },
  { code: '+222', country: 'Mauritanie', flag: '🇲🇷' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
];

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
  const [countryCode, setCountryCode] = useState('+228');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [expectedOtp, setExpectedOtp] = useState<string>('');

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

  // Photos réelles importées par l'artisan (0 photo démo)
  const [avatar, setAvatar] = useState<string>('');
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio guide explanation
  const explainStep = () => {
    sounds.playClick();
    if (step === 1) {
      speakAloud("Bienvenue sur EFA EDO. Tu cherches un artisan pour faire un travail, ou bien tu es artisan pour trouver des clients ? Choisis ton rôle.");
    } else if (step === 2) {
      speakAloud("Choisis l'indicatif de ton pays puis tape ton numéro WhatsApp. Tu recevras un code à 4 chiffres à saisir.");
    } else if (step === 3) {
      speakAloud("Quel est ton métier ? Tu peux choisir un ou plusieurs métiers ou sélectionner Autre pour écrire ton propre métier.");
    } else if (step === 4) {
      speakAloud("Donne le nom de ton atelier, actualise ta position GPS exacte, et importe tes propres photos depuis ta galerie.");
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
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 6) {
      alert("Veuillez saisir un numéro de téléphone valide sans l'indicatif.");
      return;
    }
    sounds.playClick();
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setExpectedOtp(code);
    setOtpSent(true);
    sounds.playSuccess();

    // Envoi du vrai code via lien WhatsApp officiel
    const fullNumber = `${countryCode.replace('+', '')}${cleanPhone}`;
    const waUrl = `https://wa.me/${fullNumber}?text=${encodeURIComponent(`Votre code de confirmation EFA EDO est : ${code}`)}`;
    try {
      window.open(waUrl, '_blank');
    } catch {
      // fallback
    }

    speakAloud(`Votre code de confirmation WhatsApp a été généré. Tapez le code à 4 chiffres reçu pour continuer.`);
  };

  const handleVerifyOtp = () => {
    sounds.playClick();
    if (otpCode.length < 4) {
      alert("Veuillez saisir le code à 4 chiffres reçu.");
      return;
    }

    sounds.playSuccess();
    const fullPhoneNumber = `${countryCode} ${phone.trim()}`;

    if (role === 'client') {
      const clientUser: CurrentUser = {
        id: `client-${Date.now()}`,
        role: 'client',
        phone: fullPhoneNumber,
        name: name || 'Client EDO',
        lat: coords ? coords.lat : undefined,
        lng: coords ? coords.lng : undefined,
      };
      onComplete(clientUser);
    } else {
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
      // Autoriser 2 à 3 métiers
      if (selectedTrades.length < 3) {
        setSelectedTrades([...selectedTrades, tradeName]);
      } else {
        alert("Vous pouvez sélectionner jusqu'à 3 métiers maximum.");
      }
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
      speakAloud("Position GPS exacte captée avec succès !");
    } catch {
      setIsGpsLoading(false);
      setHasDetectedGps(true);
      speakAloud("Position GPS non captée. Vous pourrez continuer sans coordonnées.");
    }
  };

  // Trigger GPS detection when reaching Step 4 for artisans
  useEffect(() => {
    if (step === 4 && !hasDetectedGps) {
      handleDetectGps();
    }
  }, [step]);

  // Upload Photo de Profil depuis la Galerie
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sounds.playClick();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
        sounds.playSuccess();
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload Photos Portfolio depuis la Galerie
  const handleWorkPhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    sounds.playClick();
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setWorkPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    sounds.playSuccess();
  };

  const handleRemoveWorkPhoto = (index: number) => {
    sounds.playClick();
    setWorkPhotos((prev) => prev.filter((_, i) => i !== index));
  };

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

      const fullPhoneNumber = `${countryCode} ${phone.trim()}`;

      const artisanUser: CurrentUser = {
        id: `art-${Date.now()}`,
        role: 'artisan',
        phone: fullPhoneNumber,
        name: name.trim() || 'Maître Artisan',
        addressDetail: addressDetail.trim() || '',
        lat: coords ? coords.lat : undefined,
        lng: coords ? coords.lng : undefined,
        avatar: avatar || '',
        isOnline: true,
        isPro: false,
      };

      await onComplete(artisanUser, {
        trade: effectiveTrade,
        customTradeName: isOther ? customTradeInput.trim() : undefined,
        additionalTrades: selectedTrades.filter((t) => t !== 'Autre' && t !== effectiveTrade),
        workPhotos: workPhotos,
        addressDetail: addressDetail.trim() || '',
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
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-700 shadow-xs active:scale-95 transition-transform cursor-pointer"
            aria-label="Retour"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : onCancel ? (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl cursor-pointer"
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

        {/* Audio Read button */}
        <button
          onClick={explainStep}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold shadow-xs active:scale-95 transition-transform cursor-pointer"
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
              className="flex items-center gap-5 p-6 rounded-3xl bg-white border-3 border-slate-200 hover:border-amber-500 text-left shadow-sm hover:shadow-md active:scale-[0.98] transition-all group cursor-pointer"
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
              className="flex items-center gap-5 p-6 rounded-3xl bg-slate-900 border-3 border-slate-900 hover:border-amber-400 text-left shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-white group cursor-pointer"
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

      {/* Screen 2: Country Code Selector + Phone + Manual OTP */}
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
              Choisis l'indicatif de ton pays et tape ton numéro sans indicatif
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Indicatif pays & Numéro WhatsApp
            </label>

            {/* Country Selector + Phone input */}
            <div className="flex items-center gap-2">
              {/* Sélecteur indicatif avant numéro */}
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-3 py-4 rounded-2xl bg-slate-100 border-2 border-slate-200 focus:border-amber-500 font-black text-base text-slate-900 outline-none shrink-0 cursor-pointer"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} ({c.country})
                  </option>
                ))}
              </select>

              {/* Tape numéro sans indicatif */}
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 90 12 34 56"
                className="flex-1 px-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-amber-500 text-xl font-bold text-slate-900 outline-none"
                maxLength={12}
                autoFocus
              />
            </div>

            {!otpSent ? (
              <button
                onClick={handleSendOtp}
                disabled={phone.replace(/\D/g, '').length < 6}
                className="w-full mt-5 min-h-[58px] rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 text-lg font-black flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                Recevoir mon code par WhatsApp
              </button>
            ) : (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-600 mb-2 text-center">
                  Veuillez entrer le code à 4 chiffres reçu sur votre WhatsApp ({countryCode} {phone}) :
                </p>

                {/* Saisie manuelle du code par le client/artisan (Zéro bouton démo auto-remplissage) */}
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="w-full text-center tracking-[0.5em] px-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 text-3xl font-black text-slate-900 outline-none"
                  maxLength={4}
                  autoFocus
                />

                <button
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length < 4}
                  className="w-full mt-4 min-h-[58px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-lg font-black flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-6 h-6" />
                  Valider et Continuer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen 3 (Artisan only): Choix 2-3 Métiers + Autre */}
      {step === 3 && role === 'artisan' && (
        <div className="flex-1 flex flex-col">
          <div className="text-center mb-3">
            <h2 className="text-2xl font-black text-slate-900">
              Choisis ton ou tes métiers
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Sélectionne 1 à 3 métiers ou choisis « Autre » pour préciser
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-4 max-h-[50vh] overflow-y-auto pr-1">
            {CATEGORIES_DATA.map((cat) => {
              const isSelected = selectedTrades.includes(cat.name);

              return (
                <button
                  key={cat.name}
                  onClick={() => toggleTrade(cat.name)}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center relative transition-all min-h-[110px] cursor-pointer ${
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
            className="w-full min-h-[58px] rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 text-lg font-black flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all shrink-0 cursor-pointer"
          >
            Continuer ({selectedTrades.length} sélectionné{selectedTrades.length > 1 ? 's' : ''})
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Screen 4: Nom Atelier + GPS Réel + Import Galerie (0 photo démo) */}
      {step === 4 && role === 'artisan' && (
        <div className="flex-1 flex flex-col overflow-y-auto max-h-[80vh] pr-1 pb-4 space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-2xl font-black text-slate-900">
              Nom d'Atelier & Position GPS
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Configure ton profil avec tes vraies informations et tes photos
            </p>
          </div>

          {/* 1. Nom ou Nom de l'atelier */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Nom ou Nom d'Atelier
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maître Kodjo Lawson ou Atelier Prestige"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-amber-500 text-lg font-bold text-slate-900 outline-none"
            />
          </div>

          {/* 2. Position GPS réelle avec bouton Actualiser GPS */}
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
                    Coordonnées réelles pour les clients autour de toi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDetectGps}
                disabled={isGpsLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs active:scale-95 transition-transform cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>{isGpsLoading ? 'Détection...' : 'Actualiser GPS'}</span>
              </button>
            </div>

            {/* Coordinates Badge */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                coords
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    coords ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>
                  {coords
                    ? `GPS actif : ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                    : 'GPS non capté (L’atelier sera sans coordonnées)'}
                </span>
              </div>
              <span
                className={`text-[11px] font-extrabold uppercase ${
                  coords ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {coords ? 'Précis' : 'Optionnel'}
              </span>
            </div>

            {/* Repère ou Rue text input */}
            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Repère ou quartier (facultatif)
              </label>
              <input
                type="text"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="Ex: Face pharmacie de la Paix"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 3. Photo de profil artisan : Import depuis Galerie (0 photo démo) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Photo de profil
            </label>
            <div className="flex items-center gap-4">
              {avatar ? (
                <div className="relative">
                  <img
                    src={avatar}
                    alt="Aperçu profil"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                  <Camera className="w-6 h-6" />
                  <span className="text-[10px] font-bold mt-1">Vide</span>
                </div>
              )}

              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-transform">
                  <Upload className="w-4 h-4" />
                  <span>Importer depuis la galerie</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Si aucune photo n'est importée, votre profil affichera l'initiale de votre nom.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Portfolio : Photos de travaux réalisées (Galerie) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-700">
                Photos de tes réalisations (Portfolio)
              </label>
              <span className="text-xs font-bold text-slate-400">
                {workPhotos.length} photo{workPhotos.length > 1 ? 's' : ''}
              </span>
            </div>

            <label className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50 hover:bg-amber-50/50 text-slate-700 font-bold text-xs cursor-pointer transition-colors mb-3">
              <ImageIcon className="w-5 h-5 text-amber-600" />
              <span>Ajouter des photos de réalisations (Galerie)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleWorkPhotosUpload}
                className="hidden"
              />
            </label>

            {workPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {workPhotos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveWorkPhoto(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center text-xs transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center italic py-2">
                Aucune photo de réalisation pour le moment.
              </p>
            )}
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
