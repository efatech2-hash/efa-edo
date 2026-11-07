import React, { useState, useEffect } from 'react';
import {
  Volume2,
} from 'lucide-react';
import {
  Artisan,
  CurrentUser,
  GeoCoordinates,
  Review,
  UserRole,
  CustomTradeSubmission
} from './types';
import { supabase } from './utils/supabase';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Onboarding } from './components/Onboarding';
import { HomeClient } from './components/HomeClient';
import { ArtisanProfile } from './components/ArtisanProfile';
import { HomeArtisan } from './components/HomeArtisan';
import { ReviewModal } from './components/ReviewModal';
import { ProSubscriptionModal } from './components/ProSubscriptionModal';
import { VoiceGuideModal } from './components/VoiceGuideModal';
import { AdminCustomTradesModal } from './components/AdminCustomTradesModal';
import { ArtisanMap } from './components/ArtisanMap';
import { AdminPage } from './components/AdminPage';
import { speakAloud, sounds } from './utils/audio';
import {
  requestDeviceCoordinates,
  DEFAULT_AFRICA_COORDS,
} from './utils/geo';

const INITIAL_CUSTOM_TRADES: CustomTradeSubmission[] = [
  {
    id: 'ct-1',
    name: 'Forgeron d’Art & Coutellerie',
    submittedBy: 'Artisan Lomé',
    date: 'Hier',
    count: 3,
  },
  {
    id: 'ct-2',
    name: 'Potier & Céramiste Traditionnel',
    submittedBy: 'Artisan Cotonou',
    date: 'Il y a 2 jours',
    count: 2,
  },
  {
    id: 'ct-3',
    name: 'Tisserand de Pagne Traditionnel',
    submittedBy: 'Artisan Abidjan',
    date: 'Cette semaine',
    count: 4,
  },
];

export default function App() {
  // State for artisans: loaded exclusively from Supabase (0 localStorage, 0 mock data)
  const [artisans, setArtisans] = useState<Artisan[]>([]);

  // State for custom trades submitted via "Autre"
  const [customTrades, setCustomTrades] = useState<CustomTradeSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('efa_edo_custom_trades');
      return saved ? JSON.parse(saved) : INITIAL_CUSTOM_TRADES;
    } catch {
      return INITIAL_CUSTOM_TRADES;
    }
  });

  // User client GPS location
  const [userLocation, setUserLocation] = useState<GeoCoordinates | null>(() => {
    try {
      const saved = localStorage.getItem('efa_edo_user_coords');
      return saved ? JSON.parse(saved) : DEFAULT_AFRICA_COORDS;
    } catch {
      return DEFAULT_AFRICA_COORDS;
    }
  });
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // Current session user
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    try {
      const saved = localStorage.getItem('efa_edo_user');
      return saved
        ? JSON.parse(saved)
        : {
            id: 'user-client-default',
            role: 'client',
            phone: '+228 90 12 34 56',
            name: 'Client EDO',
            artisanId: 'art-1',
            lat: DEFAULT_AFRICA_COORDS.lat,
            lng: DEFAULT_AFRICA_COORDS.lng,
          };
    } catch {
      return {
        id: 'user-client-default',
        role: 'client',
        phone: '+228 90 12 34 56',
        name: 'Client EDO',
        artisanId: 'art-1',
        lat: DEFAULT_AFRICA_COORDS.lat,
        lng: DEFAULT_AFRICA_COORDS.lng,
      };
    }
  });

  // Active onboarding state
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(true);

  // Navigation tab and role
  const [currentRole, setCurrentRole] = useState<UserRole>('client');
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'artisan' | 'pro' | 'voice'>('home');

  // Super Admin view route state: /admin or #admin
  const [isAdminViewOpen, setIsAdminViewOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/admin' || window.location.hash === '#admin';
    }
    return false;
  });

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminViewOpen(
        window.location.pathname === '/admin' || window.location.hash === '#admin'
      );
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const handleOpenAdminView = () => {
    setIsAdminViewOpen(true);
    if (window.location.pathname !== '/admin') {
      try {
        window.history.pushState(null, '', '/admin');
      } catch {
        window.location.hash = '#admin';
      }
    }
  };

  const handleCloseAdminView = () => {
    setIsAdminViewOpen(false);
    if (window.location.pathname === '/admin') {
      try {
        window.history.pushState(null, '', '/');
      } catch {
        window.location.hash = '';
      }
    } else if (window.location.hash === '#admin') {
      window.location.hash = '';
    }
  };

  const isSuperAdmin = currentUser.email?.toLowerCase().trim() === 'efatech2@gmail.com';

  // Modals & view selection
  const [selectedArtisanProfile, setSelectedArtisanProfile] = useState<Artisan | null>(null);
  const [reviewModalArtisan, setReviewModalArtisan] = useState<Artisan | null>(null);
  const [showProModal, setShowProModal] = useState<boolean>(false);
  const [showVoiceGuide, setShowVoiceGuide] = useState<boolean>(false);
  const [showAdminTradesModal, setShowAdminTradesModal] = useState<boolean>(false);

  // Post-call rating simulation
  const [recentCalledArtisan, setRecentCalledArtisan] = useState<Artisan | null>(null);

  // Auto-locate client on app open
  const refreshClientGps = async (announce = false) => {
    setIsGpsLoading(true);
    try {
      const coords = await requestDeviceCoordinates();
      setUserLocation(coords);
      localStorage.setItem('efa_edo_user_coords', JSON.stringify(coords));
      setIsGpsLoading(false);
      if (announce) {
        sounds.playSuccess();
        speakAloud("Position GPS actualisée avec succès !");
      }
    } catch {
      setIsGpsLoading(false);
      // Keep default or previous coordinates
    }
  };

  useEffect(() => {
    refreshClientGps(false);
  }, []);

  // Load real artisans and reviews from Supabase
  const loadArtisansFromSupabase = async () => {
    if (!supabase) return;
    try {
      const [artisansRes, reviewsRes] = await Promise.all([
        supabase.from('artisans').select('*'),
        supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      ]);

      const artisansData = artisansRes.data;
      const reviewsData = reviewsRes.data;

      if (!artisansRes.error && Array.isArray(artisansData)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Artisan[] = artisansData.map((item: any) => {
          const artisanId = String(item.id);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const matchedReviews: Review[] = Array.isArray(reviewsData)
            ? reviewsData
                .filter((r: any) => String(r.artisan_id) === artisanId)
                .map((r: any) => ({
                  id: String(r.id),
                  author: r.client_name || r.author || 'Client vérifié',
                  rating: Number(r.rating || 5),
                  text: r.comment || r.text || '',
                  date: r.created_at
                    ? new Date(r.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'Récemment',
                }))
            : [];

          let computedRating = Number(item.rating ?? 5.0);
          let computedReviewCount = Number(item.review_count ?? item.reviewCount ?? 0);

          if (matchedReviews.length > 0) {
            const sum = matchedReviews.reduce((acc, curr) => acc + curr.rating, 0);
            computedRating = parseFloat((sum / matchedReviews.length).toFixed(1));
            computedReviewCount = matchedReviews.length;
          }

          return {
            id: artisanId,
            name: item.name || item.full_name || 'Artisan',
            phone: item.phone || item.tel || '',
            whatsapp: item.whatsapp || item.phone?.replace(/\D/g, '') || '',
            trade: item.trade || item.metier || 'Artisan',
            customTradeName: item.customTradeName || item.custom_trade_name,
            additionalTrades: item.additionalTrades || item.additional_trades || [],
            addressDetail: item.addressDetail || item.address_detail || item.address || '',
            lat: item.lat !== null && item.lat !== undefined ? Number(item.lat) : null,
            lng: item.lng !== null && item.lng !== undefined ? Number(item.lng) : null,
            avatar: item.avatar || item.avatar_url || '',
            coverImage: item.coverImage || item.cover_image || '',
            workPhotos: item.workPhotos || item.work_photos || [],
            isOnline: item.isOnline ?? item.is_online ?? true,
            isPro: Boolean(item.isPro ?? item.is_pro ?? false),
            isBoosted: Boolean(item.is_boosted ?? item.isBoosted ?? false),
            boostUntil: item.boost_until || item.boostUntil || null,
            boostLevel: item.boost_level || item.boostLevel || null,
            status: item.status || 'approuve',
            rating: computedRating,
            reviewCount: computedReviewCount,
            completedJobs: Number(item.completedJobs ?? item.completed_jobs ?? 0),
            bioVoiceText: item.bioVoiceText || item.bio_voice_text || item.bio || '',
            reviews: matchedReviews,
            dailyViews: Number(item.dailyViews ?? item.daily_views ?? 0),
            dailyCalls: Number(item.dailyCalls ?? item.daily_calls ?? 0),
            registeredAt: item.registeredAt || item.registered_at || item.created_at,
          };
        });
        setArtisans(mapped);
      } else {
        setArtisans([]);
      }
    } catch {
      setArtisans([]);
    }
  };

  useEffect(() => {
    loadArtisansFromSupabase();
  }, []);

  // Save custom trades to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('efa_edo_custom_trades', JSON.stringify(customTrades));
    } catch {
      // fallback
    }
  }, [customTrades]);

  // Save current user to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('efa_edo_user', JSON.stringify(currentUser));
    } catch {
      // fallback
    }
  }, [currentUser]);

  // Find artisan profile associated with current user
  const currentArtisanProfile =
    artisans.find((a) => a.id === currentUser.artisanId) || artisans[0];

  // Handler: Save custom trade name when artisan selects "Autre"
  const handleSaveCustomTrade = (tradeName: string) => {
    if (!tradeName || !tradeName.trim()) return;
    const clean = tradeName.trim();
    setCustomTrades((prev) => {
      const existing = prev.find((t) => t.name.toLowerCase() === clean.toLowerCase());
      if (existing) {
        return prev.map((t) =>
          t.id === existing.id ? { ...t, count: t.count + 1, date: 'Aujourd’hui' } : t
        );
      }
      const newEntry: CustomTradeSubmission = {
        id: `ct-${Date.now()}`,
        name: clean,
        submittedBy: currentUser.name || 'Artisan',
        date: 'Aujourd’hui',
        count: 1,
      };
      return [newEntry, ...prev];
    });
  };

  // Handler: Admin approves custom trade
  const handleApproveTrade = (tradeName: string) => {
    sounds.playSuccess();
    speakAloud(`Le métier ${tradeName} a été validé et intégré.`);
  };

  // Handler: Admin deletes custom trade
  const handleDeleteTrade = (id: string) => {
    setCustomTrades((prev) => prev.filter((t) => t.id !== id));
  };

  // Handler: Complete Onboarding (Artisan or Client)
  const handleOnboardingComplete = async (
    user: CurrentUser,
    artisanData?: {
      trade: string;
      additionalTrades: string[];
      workPhotos: string[];
      addressDetail: string;
      lat: number | null;
      lng: number | null;
      customTradeName?: string;
    }
  ) => {
    // Si c'est un client, connexion directe
    if (user.role === 'client') {
      setCurrentUser(user);
      setCurrentRole('client');
      setHasCompletedOnboarding(true);
      setActiveTab('home');
      return;
    }

    // Si c'est un artisan, INSERT réel obligatoire sur Supabase
    if (user.role === 'artisan' && artisanData) {
      if (!supabase) {
        alert("Erreur Supabase : Le client Supabase n'est pas initialisé. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
        return;
      }

      // 1. Vrai INSERT dans Supabase AVANT d'afficher le compte
      const { data, error } = await supabase
        .from('artisans')
        .insert([
          {
            name: user.name,
            phone: user.phone,
            whatsapp: user.phone ? user.phone.replace(/\D/g, '') : '',
            trade: artisanData.trade,
            custom_trade_name: artisanData.customTradeName || null,
            additional_trades: artisanData.additionalTrades || [],
            address_detail: artisanData.addressDetail || '',
            lat: artisanData.lat,
            lng: artisanData.lng,
            avatar: user.avatar || '',
            cover_image: '',
            work_photos: artisanData.workPhotos || [],
          },
        ])
        .select()
        .single();

      // 2. Si error n'est pas null, alerte et NE PAS afficher le compte
      if (error) {
        alert('Erreur Supabase : ' + error.message);
        return;
      }

      // 3. Après l'INSERT réussi, recharger la liste avec supabase.from('artisans').select('*')
      await loadArtisansFromSupabase();

      // 4. Activer le compte pour l'utilisateur
      setCurrentUser({
        ...user,
        artisanId: data?.id ? String(data.id) : user.id,
      });
      setCurrentRole('artisan');
      setHasCompletedOnboarding(true);
      setActiveTab('artisan');
    }
  };

  // Handler: Toggle Artisan Availability
  const handleToggleArtisanStatus = (newStatus: boolean) => {
    if (!currentArtisanProfile) return;
    setArtisans((prev) =>
      prev.map((a) => (a.id === currentArtisanProfile.id ? { ...a, isOnline: newStatus } : a))
    );
    if (supabase) {
      supabase
        .from('artisans')
        .update({ is_online: newStatus, isOnline: newStatus })
        .eq('id', currentArtisanProfile.id)
        .then(() => {}, () => {});
    }
  };

  // Handler: Call Initiated -> triggers review prompt after service
  const handleCallInitiated = (artisan: Artisan) => {
    setArtisans((prev) =>
      prev.map((a) => (a.id === artisan.id ? { ...a, dailyCalls: a.dailyCalls + 1 } : a))
    );

    // Show simulated post-service review prompt
    setTimeout(() => {
      setRecentCalledArtisan(artisan);
    }, 3500);
  };

  // Handler: Submit review with average rating recalculation & Supabase sync
  const handleSubmitReview = async (artisanId: string, review: Review) => {
    // 1. Local optimistic update
    const targetArtisan = artisans.find((a) => a.id === artisanId);
    const existingReviews = targetArtisan?.reviews || [];
    const updatedReviews = [review, ...existingReviews];
    const totalRating = updatedReviews.reduce((acc, r) => acc + r.rating, 0);
    const newAvgRating = parseFloat((totalRating / updatedReviews.length).toFixed(1));
    const newCount = updatedReviews.length;

    setArtisans((prev) =>
      prev.map((artisan) => {
        if (artisan.id === artisanId) {
          return {
            ...artisan,
            reviews: updatedReviews,
            reviewCount: newCount,
            rating: newAvgRating,
          };
        }
        return artisan;
      })
    );

    setSelectedArtisanProfile((prev) => {
      if (prev && prev.id === artisanId) {
        return {
          ...prev,
          reviews: updatedReviews,
          reviewCount: newCount,
          rating: newAvgRating,
        };
      }
      return prev;
    });

    setRecentCalledArtisan(null);

    // 2. Vrai INSERT dans la table public.reviews et mise à jour de la note de l'artisan
    if (supabase) {
      try {
        const { error: revError } = await supabase.from('reviews').insert([
          {
            artisan_id: artisanId,
            client_name: review.author,
            rating: review.rating,
            comment: review.text,
          },
        ]);

        if (!revError) {
          await supabase
            .from('artisans')
            .update({
              rating: newAvgRating,
              review_count: newCount,
            })
            .eq('id', artisanId);
        }
      } catch {
        // ignore
      }
    }
  };

  // Handler: Pro upgrade
  const handleUpgradeSuccess = (artisanId: string) => {
    setArtisans((prev) =>
      prev.map((a) => (a.id === artisanId ? { ...a, isPro: true } : a))
    );
  };

  // Super Admin page: /admin or #admin
  if (isAdminViewOpen) {
    return (
      <AdminPage
        currentUser={currentUser}
        onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
        onBackToHome={handleCloseAdminView}
        onRefreshArtisans={loadArtisansFromSupabase}
        artisans={artisans}
      />
    );
  }

  // Onboarding screen
  if (!hasCompletedOnboarding) {
    return (
      <Onboarding
        onComplete={handleOnboardingComplete}
        onCancel={() => setHasCompletedOnboarding(true)}
        onSaveCustomTrade={handleSaveCustomTrade}
        initialCoords={userLocation}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 antialiased">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        currentRole={currentRole}
        isAdmin={isSuperAdmin}
        onOpenAdminPage={handleOpenAdminView}
        onSwitchRole={(newRole) => {
          setCurrentRole(newRole);
          if (newRole === 'artisan') {
            setActiveTab('artisan');
          } else {
            setActiveTab('home');
          }
        }}
        onRestartOnboarding={() => {
          sounds.playClick();
          setHasCompletedOnboarding(false);
        }}
        onOpenVoiceGuide={() => setShowVoiceGuide(true)}
        onOpenAdminTrades={() => setShowAdminTradesModal(true)}
        customTradesCount={customTrades.length}
      />

      {/* Slogan Banner */}
      <div className="bg-slate-900 border-b border-amber-500/30 text-amber-300 py-2.5 px-4 text-center">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          <p className="text-sm sm:text-base font-extrabold tracking-tight text-white">
            « Trouve un artisan pro près de toi en <span className="text-amber-400">30 secondes</span> »
          </p>
          <button
            onClick={() => {
              sounds.playClick();
              speakAloud("Trouve un artisan pro près de toi en 30 secondes. EFA EDO par EFA TECHNOLOGIE.");
            }}
            className="text-amber-400 hover:text-amber-300 p-1"
            title="Écouter le slogan"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {/* Post-Call Simulated Rating Prompt Banner */}
        {recentCalledArtisan && (
          <div className="mb-6 p-4 rounded-3xl bg-amber-50 border-2 border-amber-400 shadow-md flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <img
                src={recentCalledArtisan.avatar}
                alt={recentCalledArtisan.name}
                className="w-12 h-12 rounded-2xl object-cover border border-amber-400"
              />
              <div>
                <span className="text-xs font-black uppercase text-amber-800 tracking-wider">
                  Service terminé avec {recentCalledArtisan.name}
                </span>
                <p className="text-sm font-bold text-slate-900">
                  Comment s'est passé le travail de cet artisan ?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sounds.playClick();
                  setReviewModalArtisan(recentCalledArtisan);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs active:scale-95 transition-transform"
              >
                Noter (1-5 étoiles)
              </button>
              <button
                onClick={() => setRecentCalledArtisan(null)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* View Selection: If an artisan profile is open */}
        {selectedArtisanProfile ? (
          <ArtisanProfile
            artisan={selectedArtisanProfile}
            userLocation={userLocation}
            onBack={() => setSelectedArtisanProfile(null)}
            onCall={handleCallInitiated}
            onOpenReviewModal={(artisan) => setReviewModalArtisan(artisan)}
          />
        ) : (
          <>
            {/* TAB: HOME CLIENT */}
            {activeTab === 'home' && (
              <HomeClient
                artisans={artisans}
                userLocation={userLocation}
                onSelectArtisan={(artisan) => setSelectedArtisanProfile(artisan)}
                onCallInitiated={handleCallInitiated}
                onOpenVoiceAssistant={() => setShowVoiceGuide(true)}
                onOpenReviewModal={(artisan) => setReviewModalArtisan(artisan)}
                onRefreshGps={() => refreshClientGps(true)}
                isGpsLoading={isGpsLoading}
              />
            )}

            {/* TAB: CARTE GPS */}
            {activeTab === 'map' && (
              <div className="space-y-4 pb-24">
                <div className="bg-white p-4 rounded-3xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">
                      Carte GPS en Direct
                    </h1>
                    <p className="text-sm font-semibold text-slate-500">
                      Artisans géolocalisés autour de votre position en temps réel
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      speakAloud("Carte GPS en direct. Les artisans ayant un point vert sont immédiatement disponibles. Touchez un marqueur pour appeler le pro.");
                    }}
                    className="p-3 rounded-2xl bg-amber-400 text-slate-950"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                <ArtisanMap
                  artisans={artisans}
                  selectedArtisan={null}
                  onSelectArtisan={(artisan) => setSelectedArtisanProfile(artisan)}
                  userLocation={userLocation}
                  heightClass="h-[520px]"
                />
              </div>
            )}

            {/* TAB: MODE ARTISAN */}
            {activeTab === 'artisan' && (
              currentArtisanProfile ? (
                <HomeArtisan
                  currentArtisan={currentArtisanProfile}
                  currentUser={currentUser}
                  onToggleStatus={handleToggleArtisanStatus}
                  onOpenProModal={() => setShowProModal(true)}
                  onViewPublicProfile={(artisan) => setSelectedArtisanProfile(artisan)}
                />
              ) : (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-lg mx-auto my-6">
                  <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔨</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">
                    Espace Artisan
                  </h2>
                  <p className="text-sm font-semibold text-slate-600 mb-6">
                    Aucun profil artisan actif pour le moment. Enregistrez votre atelier en 30 secondes pour apparaître sur la carte GPS.
                  </p>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setHasCompletedOnboarding(false);
                    }}
                    className="w-full min-h-[56px] rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-base shadow-sm"
                  >
                    Activer mon profil artisan (30s)
                  </button>
                </div>
              )
            )}

            {/* TAB: VOICE GUIDE */}
            {activeTab === 'voice' && (
              <div className="space-y-4 max-w-xl mx-auto pb-24">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-md">
                    <Volume2 className="w-9 h-9" />
                  </div>
                  <h1 className="text-2xl font-black text-slate-900">
                    Aide Vocale pour Tous
                  </h1>
                  <p className="text-sm font-semibold text-slate-600 mt-1 mb-4">
                    Pas besoin de savoir lire ou écrire. EFA EDO parle à voix haute.
                  </p>
                  <button
                    onClick={() => setShowVoiceGuide(true)}
                    className="w-full min-h-[56px] rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-lg flex items-center justify-center gap-2 shadow-sm"
                  >
                    Ouvrir le lecteur vocal
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation for Mobile Ergonomics */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedArtisanProfile(null);
          if (tab === 'voice') {
            setShowVoiceGuide(true);
          } else {
            setActiveTab(tab);
          }
        }}
        role={currentRole}
        isArtisanOnline={currentArtisanProfile?.isOnline}
      />

      {/* Review Modal */}
      {reviewModalArtisan && (
        <ReviewModal
          artisan={reviewModalArtisan}
          onClose={() => setReviewModalArtisan(null)}
          onSubmitReview={handleSubmitReview}
        />
      )}

      {/* Pro Subscription Modal */}
      {showProModal && currentArtisanProfile && (
        <ProSubscriptionModal
          currentArtisan={currentArtisanProfile}
          onClose={() => setShowProModal(false)}
          onUpgradeSuccess={handleUpgradeSuccess}
        />
      )}

      {/* Voice Guide Modal */}
      {showVoiceGuide && (
        <VoiceGuideModal onClose={() => setShowVoiceGuide(false)} />
      )}

      {/* Admin Custom Trades Modal */}
      {showAdminTradesModal && (
        <AdminCustomTradesModal
          customTrades={customTrades}
          onClose={() => setShowAdminTradesModal(false)}
          onApproveTrade={handleApproveTrade}
          onDeleteTrade={handleDeleteTrade}
        />
      )}

      {/* Footer Branding Info */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 hidden md:block">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-29_at_23.28.39_4ef8d08c.jpg"
              alt="EFA EDO"
              className="w-[48px] h-[48px] rounded-[12px] object-contain shrink-0 bg-slate-950"
            />
            <div>
              <p className="font-extrabold text-white text-sm">
                EFA EDO · Marketplace des Artisans Africains
              </p>
              <p className="text-slate-400">
                EFA TECHNOLOGIE · Géolocalisation Universelle Afrique
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-semibold">
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => setShowAdminTradesModal(true)}
                  className="hover:text-amber-400 text-xs flex items-center gap-1 text-slate-400 cursor-pointer"
                >
                  <span>Administration Métiers</span>
                  {customTrades.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded-full text-[10px]">
                      {customTrades.length}
                    </span>
                  )}
                </button>
                <span>·</span>
              </>
            )}
            <button
              onClick={() => setShowVoiceGuide(true)}
              className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Assistance Vocale
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
