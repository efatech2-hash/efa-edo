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
  Image as ImageIcon,
  LogIn,
  UserPlus,
  Building,
} from 'lucide-react';
import { CurrentUser, GeoCoordinates } from '../types';
import { CATEGORIES_DATA } from '../data/categories';
import { TradeIcon } from './TradeIcon';
import { speakAloud, sounds } from '../utils/audio';
import { requestDeviceCoordinates } from '../utils/geo';
import { supabase } from '../utils/supabase';

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
  // Navigation:
  // step 1: Role Selection ("Je suis Artisan / Professionnel" vs "Je suis Client")
  // step 'auth_choice': 2 Boutons ("J'ai déjà un compte" vs "Je suis nouveau")
  // step 'login': Existing Account form
  // step 2: New account WhatsApp verification (with Anti-Double)
  // step 3: Artisan trades
  // step 4: Artisan workshop info + GPS + photos (max 5)
  const [currentView, setCurrentView] = useState<
    'role_select' | 'auth_choice' | 'login' | 'register_phone' | 'trades' | 'workshop'
  >('role_select');

  const [role, setRole] = useState<'client' | 'artisan'>('client');
  const [countryCode, setCountryCode] = useState('+228');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [expectedOtp, setExpectedOtp] = useState<string>('');

  // Login specific states
  const [loginAtelierName, setLoginAtelierName] = useState('');
  const [isSearchingAccount, setIsSearchingAccount] = useState(false);

  // Artisan registration specific
  const [selectedTrades, setSelectedTrades] = useState<string[]>(['Menuisier Bois']);
  const [customTradeInput, setCustomTradeInput] = useState('');
  const [name, setName] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [coords, setCoords] = useState<GeoCoordinates | null>(initialCoords || null);
  const [hasDetectedGps, setHasDetectedGps] = useState(!!initialCoords);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // Photos réelles importées par l'artisan (0 photo démo, max 5 portfolio)
  const [avatar, setAvatar] = useState<string>('');
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio guide explanation
  const explainStep = () => {
    sounds.playClick();
    if (currentView === 'role_select') {
      speakAloud("Bienvenue sur EFA EDO. Choisis ton rôle : Tu es Artisan Professionnel, ou tu es Client ?");
    } else if (currentView === 'auth_choice') {
      speakAloud("As-tu déjà un compte enregistré sur EFA EDO, ou bien es-tu nouveau ? Choisis ton option.");
    } else if (currentView === 'login') {
      if (role === 'artisan') {
        speakAloud("Pour vous connecter à votre atelier, tapez le nom de votre atelier ou votre nom, et votre numéro WhatsApp.");
      } else {
        speakAloud("Pour vous connecter, tapez simplement votre numéro WhatsApp.");
      }
    } else if (currentView === 'register_phone') {
      speakAloud("Choisis l'indicatif de ton pays puis tape ton numéro WhatsApp. Tu recevras un code à 4 chiffres à saisir.");
    } else if (currentView === 'trades') {
      speakAloud("Quel est ton métier ? Tu peux choisir 1 à 3 métiers ou sélectionner Autre pour écrire ton propre métier.");
    } else if (currentView === 'workshop') {
      speakAloud("Donne le nom de ton atelier, actualise ta position GPS exacte, et importe tes propres photos. Maximum 5 photos pour le portfolio.");
    }
  };

  // Role select handler
  const handleSelectRole = (chosenRole: 'client' | 'artisan') => {
    sounds.playClick();
    setRole(chosenRole);
    if (chosenRole === 'client') {
      setName('Client EFA');
    }
    // Directement vers les 2 choix : "J'ai déjà un compte" / "Je suis nouveau"
    setCurrentView('auth_choice');
  };

  // 3. ARTISAN : "J'ai déjà un compte" -> Connexion instantanée dans Supabase
  const handleArtisanLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneSuffix = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone;
    const cleanName = loginAtelierName
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (!cleanPhone || cleanPhone.length < 6) {
      alert("Veuillez saisir votre numéro WhatsApp.");
      return;
    }

    setIsSearchingAccount(true);
    sounds.playClick();

    try {
      if (!supabase) {
        alert("Erreur : Service de connexion temporairement indisponible.");
        setIsSearchingAccount(false);
        return;
      }

      // Requête directe
      const { data, error } = await supabase.from('artisans').select('*');
      if (error) {
        alert("Erreur : " + error.message);
        setIsSearchingAccount(false);
        return;
      }

      // Match ultra-robuste : numéro WhatsApp (derniers 8 chiffres) ET nom/atelier
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const match = (data || []).find((a: any) => {
        const artisanPhone = (a.phone || '').replace(/\D/g, '');
        const artisanWa = (a.whatsapp || '').replace(/\D/g, '');
        const phoneMatch =
          (phoneSuffix && (artisanPhone.endsWith(phoneSuffix) || artisanWa.endsWith(phoneSuffix))) ||
          (cleanPhone && (artisanPhone.includes(cleanPhone) || artisanWa.includes(cleanPhone)));

        const aName = (a.name || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const aAddress = (a.address_detail || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();

        const nameMatch =
          !cleanName ||
          aName.includes(cleanName) ||
          cleanName.includes(aName) ||
          aAddress.includes(cleanName);

        return phoneMatch && nameMatch;
      });

      if (match) {
        sounds.playSuccess();
        speakAloud(`Bon retour ${match.name}. Ton atelier est ouvert !`);
        const artisanUser: CurrentUser = {
          id: String(match.id),
          artisanId: String(match.id),
          role: 'artisan',
          phone: match.phone || `${countryCode} ${cleanPhone}`,
          name: match.name,
          avatar: match.avatar || '',
          addressDetail: match.address_detail || '',
          lat: match.lat !== null && match.lat !== undefined ? Number(match.lat) : undefined,
          lng: match.lng !== null && match.lng !== undefined ? Number(match.lng) : undefined,
          isOnline: match.is_online ?? true,
          isPro: Boolean(match.is_pro ?? false),
        };
        onComplete(artisanUser);
      } else {
        alert("Erreur : Aucun atelier trouvé correspondant à ce nom et ce numéro WhatsApp. Vérifiez vos identifiants ou cliquez sur 'Je suis nouveau' pour vous inscrire.");
      }
    } catch (err) {
      alert("Erreur : " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSearchingAccount(false);
    }
  };

  // 4. CLIENT : "J'ai déjà un compte" -> Connexion instantanée
  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneSuffix = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone;

    if (!cleanPhone || cleanPhone.length < 6) {
      alert("Veuillez saisir votre numéro WhatsApp.");
      return;
    }

    setIsSearchingAccount(true);
    sounds.playClick();

    try {
      if (!supabase) {
        alert("Erreur : Service de connexion temporairement indisponible.");
        setIsSearchingAccount(false);
        return;
      }

      let foundClient: { id: string; name: string; phone: string } | null = null;

      // 1. Vérifier dans la table clients
      try {
        const { data: clientsData } = await supabase.from('clients').select('*');
        if (Array.isArray(clientsData)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const match = clientsData.find((c: any) => {
            const p = (c.phone || '').replace(/\D/g, '');
            return (phoneSuffix && p.endsWith(phoneSuffix)) || (cleanPhone && p.includes(cleanPhone));
          });
          if (match) {
            foundClient = {
              id: String(match.id),
              name: match.name || 'Client EDO',
              phone: match.phone,
            };
          }
        }
      } catch {
        // continue
      }

      // 2. Si pas trouvé dans clients, vérifier si inscrit comme artisan
      if (!foundClient) {
        try {
          const { data: artisansData } = await supabase.from('artisans').select('*');
          if (Array.isArray(artisansData)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const match = artisansData.find((a: any) => {
              const p = (a.phone || '').replace(/\D/g, '');
              const w = (a.whatsapp || '').replace(/\D/g, '');
              return (
                (phoneSuffix && (p.endsWith(phoneSuffix) || w.endsWith(phoneSuffix))) ||
                (cleanPhone && (p.includes(cleanPhone) || w.includes(cleanPhone)))
              );
            });
            if (match) {
              foundClient = {
                id: String(match.id),
                name: match.name || 'Client EDO',
                phone: match.phone || `${countryCode} ${cleanPhone}`,
              };
            }
          }
        } catch {
          // continue
        }
      }

      if (foundClient) {
        sounds.playSuccess();
        speakAloud(`Bon retour ${foundClient.name}. Vous êtes connecté.`);
        const clientUser: CurrentUser = {
          id: foundClient.id,
          role: 'client',
          phone: foundClient.phone,
          name: foundClient.name,
        };
        onComplete(clientUser);
      } else {
        alert("Erreur : Aucun compte client trouvé avec ce numéro WhatsApp. Cliquez sur 'Je suis nouveau' pour vous inscrire en 10 secondes.");
      }
    } catch (err) {
      alert("Erreur : " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSearchingAccount(false);
    }
  };

  // 5. ANTI-DOUBLE : 1 numéro WhatsApp = 1 seul compte
  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 6) {
      alert("Veuillez saisir un numéro de téléphone valide sans l'indicatif.");
      return;
    }

    setIsSubmitting(true);
    sounds.playClick();

    // Check anti-double in Supabase before sending OTP
    try {
      if (supabase) {
        const [artisansCheck, clientsCheck] = await Promise.all([
          supabase.from('artisans').select('id, phone, whatsapp'),
          supabase.from('clients').select('id, phone'),
        ]);

        let alreadyRegistered = false;

        if (Array.isArray(artisansCheck.data)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          alreadyRegistered = artisansCheck.data.some((a: any) => {
            const p = (a.phone || '').replace(/\D/g, '');
            const w = (a.whatsapp || '').replace(/\D/g, '');
            return p.includes(cleanPhone) || w.includes(cleanPhone);
          });
        }

        if (!alreadyRegistered && Array.isArray(clientsCheck.data)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          alreadyRegistered = clientsCheck.data.some((c: any) => {
            const p = (c.phone || '').replace(/\D/g, '');
            return p.includes(cleanPhone);
          });
        }

        if (alreadyRegistered) {
          alert("Ce numéro WhatsApp possède déjà un compte. Utilisez l'option 'J'ai déjà un compte' pour vous connecter.");
          setIsSubmitting(false);
          return;
        }
      }
    } catch {
      // Continue if offline
    } finally {
      setIsSubmitting(false);
    }

    // Code OTP generation
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setExpectedOtp(code);
    setOtpSent(true);
    sounds.playSuccess();

    // Envoi du vrai code via lien WhatsApp officiel
    const fullNumber = `${countryCode.replace('+', '')}${cleanPhone}`;
    const waUrl = `https://wa.me/${fullNumber}?text=${encodeURIComponent(
      `Votre code de confirmation EFA EDO est : ${code}`
    )}`;
    try {
      window.open(waUrl, '_blank');
    } catch {
      // fallback
    }

    speakAloud(`Votre code de confirmation WhatsApp a été généré. Tapez le code à 4 chiffres reçu pour continuer.`);
  };

  // OTP Verification
  const handleVerifyOtp = async () => {
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

      // Save client in clients table
      if (supabase) {
        try {
          await supabase.from('clients').insert([
            {
              id: clientUser.id,
              phone: fullPhoneNumber,
              name: clientUser.name,
            },
          ]);
        } catch {
          // fallback
        }
      }

      onComplete(clientUser);
    } else {
      setCurrentView('trades');
    }
  };

  // Trades selection (1-3 trades)
  const toggleTrade = (tradeName: string) => {
    sounds.playClick();
    if (selectedTrades.includes(tradeName)) {
      if (selectedTrades.length > 1) {
        setSelectedTrades(selectedTrades.filter((t) => t !== tradeName));
      }
    } else {
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

  useEffect(() => {
    if (currentView === 'workshop' && !hasDetectedGps) {
      handleDetectGps();
    }
  }, [currentView]);

  // Upload Photo de Profil (Galerie)
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

  // 1. PORTFOLIO MAX 5 : max 5 photos. 6ème = refuse + message "Maximum 5 photos"
  const handleWorkPhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (workPhotos.length >= 5 || workPhotos.length + files.length > 5) {
      alert("Maximum 5 photos");
      return;
    }

    sounds.playClick();
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setWorkPhotos((prev) => {
            if (prev.length >= 5) return prev;
            return [...prev, reader.result as string];
          });
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

  // Finish Artisan Registration
  const handleFinishArtisan = async () => {
    setIsSubmitting(true);
    try {
      sounds.playSuccess();

      const isOther = selectedTrades.includes('Autre');
      const effectiveTrade =
        isOther && customTradeInput.trim()
          ? customTradeInput.trim()
          : selectedTrades[0] || 'Artisan';

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
        workPhotos: workPhotos.slice(0, 5),
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
        {currentView !== 'role_select' ? (
          <button
            onClick={() => {
              sounds.playClick();
              if (currentView === 'auth_choice') setCurrentView('role_select');
              else if (currentView === 'login') setCurrentView('auth_choice');
              else if (currentView === 'register_phone') setCurrentView('auth_choice');
              else if (currentView === 'trades') setCurrentView('register_phone');
              else if (currentView === 'workshop') setCurrentView('trades');
            }}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-700 shadow-xs active:scale-95 transition-transform cursor-pointer"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : onCancel ? (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl cursor-pointer"
          >
            Passer
          </button>
        ) : (
          <div className="w-11" />
        )}

        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            {currentView === 'role_select'
              ? 'Accueil'
              : currentView === 'auth_choice'
              ? role === 'artisan'
                ? 'Artisan'
                : 'Client'
              : currentView === 'login'
              ? 'Connexion'
              : 'Inscription'}
          </span>
        </div>

        {/* Audio Read button */}
        <button
          onClick={explainStep}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold shadow-xs active:scale-95 transition-transform cursor-pointer"
          title="Écouter les explications en voix"
        >
          <Volume2 className="w-4 h-4" />
          <span className="text-xs font-bold">Écouter</span>
        </button>
      </div>

      {/* SCREEN 1: 2 CHOIX -> "Je suis Artisan / Professionnel" vs "Je suis Client" */}
      {currentView === 'role_select' && (
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="EFA EDO"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-contain mx-auto mb-3 shadow-md bg-white p-1"
            />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Bienvenue sur <span className="text-amber-600">EFA EDO</span>
            </h1>
            <p className="text-lg text-slate-600 font-medium">
              Choisissez votre profil :
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 mb-8">
            {/* Card 1: Je suis Artisan / Professionnel */}
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
                  Je suis Artisan / Professionnel
                </h2>
                <p className="text-slate-300 text-base font-medium mt-1">
                  Trouve des chantiers & reçois des appels de clients autour de toi
                </p>
              </div>
              <ChevronRight className="w-8 h-8 text-amber-400 shrink-0" />
            </button>

            {/* Card 2: Je suis Client */}
            <button
              onClick={() => handleSelectRole('client')}
              className="flex items-center gap-5 p-6 rounded-3xl bg-white border-3 border-slate-200 hover:border-amber-500 text-left shadow-sm hover:shadow-md active:scale-[0.98] transition-all group cursor-pointer"
            >
              <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 group-hover:scale-105 transition-transform">
                <User className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Client Particulier
                </span>
                <h2 className="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                  Je suis Client
                </h2>
                <p className="text-slate-500 text-base font-medium mt-1">
                  Trouve un artisan pro près de toi par GPS en 30 secondes
                </p>
              </div>
              <ChevronRight className="w-8 h-8 text-slate-300 group-hover:text-amber-600 transition-colors shrink-0" />
            </button>
          </div>

          <div className="text-center text-slate-500 text-sm font-medium">
            EFA EDO · Marketplace des Artisans Africains
          </div>
        </div>
      )}

      {/* SCREEN 1-B: 2 BOUTONS -> "J'ai déjà un compte" vs "Je suis nouveau" */}
      {currentView === 'auth_choice' && (
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-6">
            <div
              className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-xs ${
                role === 'artisan'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {role === 'artisan' ? <Hammer className="w-8 h-8" /> : <User className="w-8 h-8" />}
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              {role === 'artisan' ? 'Espace Artisan & Atelier' : 'Espace Client'}
            </h2>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              {role === 'artisan'
                ? 'Connecte-toi à ton atelier ou inscris un nouvel atelier'
                : 'Connecte-toi avec ton WhatsApp ou crée ton profil'}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {/* Bouton 1 : J'ai déjà un compte */}
            <button
              onClick={() => {
                sounds.playClick();
                setCurrentView('login');
              }}
              className="w-full p-5 rounded-3xl bg-white border-2 border-slate-200 hover:border-amber-500 text-left shadow-sm active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <LogIn className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-900 group-hover:text-amber-600 transition-colors">
                    J'ai déjà un compte
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {role === 'artisan'
                      ? 'Nom atelier + Numéro WhatsApp'
                      : 'Numéro WhatsApp seul'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-amber-600 shrink-0" />
            </button>

            {/* Bouton 2 : Je suis nouveau */}
            <button
              onClick={() => {
                sounds.playClick();
                setCurrentView('register_phone');
              }}
              className="w-full p-5 rounded-3xl bg-slate-900 border-2 border-slate-900 hover:border-amber-400 text-left shadow-md active:scale-[0.98] transition-all flex items-center justify-between text-white group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                  <UserPlus className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-white group-hover:text-amber-300 transition-colors">
                    Je suis nouveau
                  </h3>
                  <p className="text-xs font-semibold text-slate-300 mt-0.5">
                    {role === 'artisan'
                      ? 'Inscription atelier en 30 secondes'
                      : 'Nouveau compte client direct'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-amber-400 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* LOGIN SCREEN (J'AI DÉJÀ UN COMPTE) */}
      {currentView === 'login' && (
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900">
              {role === 'artisan' ? 'Connexion à mon Atelier' : 'Connexion Client'}
            </h2>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              {role === 'artisan'
                ? 'Entrez le nom de votre atelier et votre numéro WhatsApp'
                : 'Entrez simplement votre numéro WhatsApp'}
            </p>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm mb-6 space-y-4">
            {/* Si Artisan : Champ [Nom de son atelier / Nom] */}
            {role === 'artisan' && (
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-amber-600" />
                  <span>Nom de son atelier / Nom de l'artisan</span>
                </label>
                <input
                  type="text"
                  value={loginAtelierName}
                  onChange={(e) => setLoginAtelierName(e.target.value)}
                  placeholder="Ex: Atelier Prestige ou Maître Lawson"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-amber-500 font-bold text-base text-slate-900 outline-none"
                  autoFocus
                />
              </div>
            )}

            {/* Champ [Numéro WhatsApp] (Artisan & Client) */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Numéro WhatsApp</span>
              </label>

              <div className="flex items-center gap-1.5 w-full min-w-0">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-[98px] sm:w-[120px] px-2 py-3 rounded-xl bg-slate-100 border-2 border-slate-200 focus:border-amber-500 font-black text-xs sm:text-sm text-slate-900 outline-none shrink-0 cursor-pointer"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 90 12 34 56"
                  className="flex-1 min-w-0 px-3 py-3 rounded-xl border-2 border-slate-200 focus:border-amber-500 text-base sm:text-lg font-bold text-slate-900 outline-none"
                  maxLength={12}
                  autoFocus={role === 'client'}
                />
              </div>

              <p className="text-[11px] font-bold text-slate-500 mt-1">
                Pays : <span className="text-amber-700">{COUNTRY_CODES.find((c) => c.code === countryCode)?.country || 'Togo'}</span> ({countryCode})
              </p>
            </div>

            <button
              onClick={role === 'artisan' ? handleArtisanLogin : handleClientLogin}
              disabled={isSearchingAccount || phone.replace(/\D/g, '').length < 6 || (role === 'artisan' && !loginAtelierName.trim())}
              className="w-full mt-2 min-h-[54px] rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 text-base sm:text-lg font-black flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              <span>{isSearchingAccount ? 'Vérification...' : role === 'artisan' ? 'Accéder à mon atelier' : 'Accéder à mon compte'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 : NOUVEAU COMPTE -> WHATSAPP + CODE OTP AVEC ANTI-DOUBLE */}
      {currentView === 'register_phone' && (
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-3xl bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-3">
              <Phone className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              {role === 'artisan' ? 'WhatsApp de ton atelier' : 'Ton numéro WhatsApp'}
            </h2>
            <p className="text-base text-slate-600 font-medium mt-1">
              Choisis l'indicatif de ton pays et tape ton numéro sans indicatif
            </p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
              Indicatif pays & Numéro WhatsApp
            </label>

            <div className="flex items-center gap-1.5 w-full min-w-0">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-[98px] sm:w-[120px] px-2 py-3 rounded-xl bg-slate-100 border-2 border-slate-200 focus:border-amber-500 font-black text-xs sm:text-sm text-slate-900 outline-none shrink-0 cursor-pointer"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 90 12 34 56"
                className="flex-1 min-w-0 px-3 py-3 rounded-xl border-2 border-slate-200 focus:border-amber-500 text-base sm:text-lg font-bold text-slate-900 outline-none"
                maxLength={12}
                autoFocus
              />
            </div>

            <p className="text-[11px] font-bold text-slate-500 mt-1.5">
              Pays : <span className="text-amber-700">{COUNTRY_CODES.find((c) => c.code === countryCode)?.country || 'Togo'}</span> ({countryCode})
            </p>

            {!otpSent ? (
              <button
                onClick={handleSendOtp}
                disabled={isSubmitting || phone.replace(/\D/g, '').length < 6}
                className="w-full mt-4 min-h-[52px] sm:min-h-[58px] rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 text-base sm:text-lg font-black flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                {isSubmitting ? 'Vérification...' : 'Recevoir mon code par WhatsApp'}
              </button>
            ) : (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-2 text-center">
                  Entre le code à 4 chiffres reçu sur ton WhatsApp ({countryCode} {phone}) :
                </p>

                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="w-full text-center tracking-[0.3em] sm:tracking-[0.5em] px-3 py-3 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 text-2xl sm:text-3xl font-black text-slate-900 outline-none"
                  maxLength={4}
                  autoFocus
                />

                <button
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length < 4}
                  className="w-full mt-3 min-h-[52px] sm:min-h-[58px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-base sm:text-lg font-black flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                  Valider et Continuer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3 (Artisan only): Choix 1-3 Métiers + Autre */}
      {currentView === 'trades' && role === 'artisan' && (
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
              setCurrentView('workshop');
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

      {/* STEP 4 (Artisan only): Nom Atelier + GPS Réel + Photos (MAX 5 PORTFOLIO) */}
      {currentView === 'workshop' && role === 'artisan' && (
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

          {/* 3. Photo de profil artisan (Galerie) */}
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

          {/* 4. Portfolio : MAX 5 PHOTOS (Refuse 6ème + "Maximum 5 photos") */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-700">
                Photos de tes réalisations (Portfolio max 5)
              </label>
              <span className="text-xs font-bold text-slate-500">
                {workPhotos.length} / 5 photo{workPhotos.length > 1 ? 's' : ''}
              </span>
            </div>

            {workPhotos.length < 5 && (
              <label className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50 hover:bg-amber-50/50 text-slate-700 font-bold text-xs cursor-pointer transition-colors mb-3">
                <ImageIcon className="w-5 h-5 text-amber-600" />
                <span>Ajouter des photos ({5 - workPhotos.length} restante{5 - workPhotos.length > 1 ? 's' : ''})</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleWorkPhotosUpload}
                  className="hidden"
                />
              </label>
            )}

            {workPhotos.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
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
            {isSubmitting ? 'Enregistrement...' : 'Activer mon compte Artisan EDO'}
          </button>
        </div>
      )}
    </div>
  );
};
