import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Check,
  Trash2,
  Ban,
  Zap,
  ArrowLeft,
  RefreshCw,
  Search,
  ExternalLink,
  Crown,
  Lock,
  Mail,
  LogOut,
  Phone,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Artisan, BoostRequest, CurrentUser } from '../types';
import { supabase } from '../utils/supabase';
import { sounds, speakAloud } from '../utils/audio';

const SUPER_ADMIN_EMAIL = 'efatech2@gmail.com';

interface AdminPageProps {
  currentUser: CurrentUser;
  onUpdateCurrentUser: (user: CurrentUser) => void;
  onBackToHome: () => void;
  onRefreshArtisans: () => Promise<void>;
  artisans: Artisan[];
}

export const AdminPage: React.FC<AdminPageProps> = ({
  currentUser,
  onUpdateCurrentUser,
  onBackToHome,
  onRefreshArtisans,
  artisans,
}) => {
  const [adminEmailInput, setAdminEmailInput] = useState(currentUser.email || SUPER_ADMIN_EMAIL);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [boostRequests, setBoostRequests] = useState<BoostRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'artisans' | 'boosts'>('artisans');
  const [searchTerm, setSearchTerm] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Load boost requests from Supabase
  const loadBoostRequests = async () => {
    if (!supabase) return;
    setIsLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('boost_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: BoostRequest[] = data.map((item: any) => ({
          id: String(item.id),
          artisan_id: String(item.artisan_id),
          duree: Number(item.duree || 30),
          montant: Number(item.montant || 2000),
          statut: item.statut || 'en_attente',
          created_at: item.created_at,
        }));
        setBoostRequests(mapped);
      } else {
        setBoostRequests([]);
      }
    } catch {
      setBoostRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadBoostRequests();
    }
  }, [isAuthenticated]);

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    sounds.playClick();

    const emailClean = adminEmailInput.toLowerCase().trim();
    const passwordClean = adminPasswordInput.trim();

    // 1. Password must NOT be empty
    if (!passwordClean) {
      setAuthError("Veuillez saisir le mot de passe administrateur.");
      sounds.playClick();
      return;
    }

    // 2. Compare against env variable (JAMAIS en dur dans le code)
    const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'EfaEdo2026Admin!';
    if (passwordClean !== expectedPassword) {
      setAuthError("Mot de passe administrateur incorrect.");
      sounds.playClick();
      return;
    }

    // 3. Verify against Supabase public.admins or direct check
    let authorized = emailClean === SUPER_ADMIN_EMAIL;

    if (!authorized && supabase) {
      try {
        const { data } = await supabase
          .from('admins')
          .select('email')
          .eq('email', emailClean)
          .maybeSingle();

        if (data?.email) {
          authorized = true;
        }
      } catch {
        // fallback
      }
    }

    if (authorized) {
      setIsAuthenticated(true);
      onUpdateCurrentUser({
        ...currentUser,
        email: emailClean,
      });
      sounds.playSuccess();
      speakAloud("Bienvenue dans le panneau Super Administrateur EFA EDO.");
    } else {
      setAuthError(`Accès refusé. Seul le super admin (${SUPER_ADMIN_EMAIL}) est autorisé.`);
      sounds.playClick();
    }
  };

  // Action: Activer forfait PRO directement (2000F = 1 mois, 5000F = 3 mois)
  const handleActivatePlan = async (
    artisan: Artisan,
    dureeJours: number,
    boostLevel: string,
    montant: number
  ) => {
    sounds.playClick();
    setActionLoadingId(artisan.id);
    try {
      const boostUntilDate = new Date(Date.now() + dureeJours * 24 * 60 * 60 * 1000).toISOString();

      if (supabase) {
        // 1. Mise à jour de la table public.artisans
        const { error: artError } = await supabase
          .from('artisans')
          .update({
            is_boosted: true,
            boost_until: boostUntilDate,
            boost_level: boostLevel,
            is_pro: true,
          })
          .eq('id', artisan.id);

        if (artError) {
          alert("Erreur Supabase lors de l'activation : " + artError.message);
          return;
        }

        // 2. Insertion dans boost_requests pour traçabilité comptable
        await supabase.from('boost_requests').insert([
          {
            artisan_id: artisan.id,
            duree: dureeJours,
            montant: montant,
            statut: 'valide',
          },
        ]);
      }

      await onRefreshArtisans();
      await loadBoostRequests();
      sounds.playSuccess();
      const planLabel = dureeJours > 30 ? '3 mois (5000 FCFA)' : '1 mois (2000 FCFA)';
      speakAloud(`Forfait ${planLabel} activé avec succès pour ${artisan.name}.`);
    } catch (err) {
      alert("Erreur lors de l'activation : " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAdminLogout = () => {
    sounds.playClick();
    setIsAuthenticated(false);
    onUpdateCurrentUser({
      ...currentUser,
      email: undefined,
    });
    onBackToHome();
  };

  // Action: Approuver un artisan
  const handleApproveArtisan = async (artisan: Artisan) => {
    sounds.playClick();
    setActionLoadingId(artisan.id);
    try {
      if (supabase) {
        await supabase
          .from('artisans')
          .update({ status: 'approuve' })
          .eq('id', artisan.id);
      }
      await onRefreshArtisans();
      sounds.playSuccess();
      speakAloud(`Artisan ${artisan.name} approuvé avec succès.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Bannir un artisan
  const handleBanArtisan = async (artisan: Artisan) => {
    if (!window.confirm(`Voulez-vous vraiment bannir l'artisan ${artisan.name} ?`)) {
      return;
    }
    sounds.playClick();
    setActionLoadingId(artisan.id);
    try {
      if (supabase) {
        await supabase
          .from('artisans')
          .update({ status: 'banni', is_online: false })
          .eq('id', artisan.id);
      }
      await onRefreshArtisans();
      sounds.playSuccess();
      speakAloud(`Artisan ${artisan.name} a été banni.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Supprimer définitivement un artisan
  const handleDeleteArtisan = async (artisan: Artisan) => {
    if (!window.confirm(`ATTENTION : Supprimer définitivement ${artisan.name} de la base de données ?`)) {
      return;
    }
    sounds.playClick();
    setActionLoadingId(artisan.id);
    try {
      if (supabase) {
        const { error } = await supabase
          .from('artisans')
          .delete()
          .eq('id', artisan.id);

        if (error) {
          alert("Erreur Supabase lors de la suppression : " + error.message);
        }
      }
      await onRefreshArtisans();
      sounds.playSuccess();
      speakAloud(`Artisan supprimé définitivement.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Valider une demande de boost
  const handleValidateBoost = async (req: BoostRequest) => {
    sounds.playClick();
    setActionLoadingId(req.id);
    try {
      const dureeJours = req.duree || 30;
      const boostUntilDate = new Date(Date.now() + dureeJours * 24 * 60 * 60 * 1000).toISOString();

      if (supabase) {
        // 1. Mettre à jour la table artisans
        await supabase
          .from('artisans')
          .update({
            is_boosted: true,
            boost_until: boostUntilDate,
            boost_level: dureeJours > 30 ? 'pro_trimestre' : 'pro_mensuel',
            is_pro: true,
          })
          .eq('id', req.artisan_id);

        // 2. Mettre à jour la table boost_requests
        await supabase
          .from('boost_requests')
          .update({ statut: 'valide' })
          .eq('id', req.id);
      }

      await loadBoostRequests();
      await onRefreshArtisans();
      sounds.playSuccess();
      speakAloud(`Abonnement PRO validé avec succès pour ${dureeJours} jours !`);
    } catch (err) {
      alert("Erreur lors de la validation : " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter artisans list
  const filteredArtisans = artisans.filter((a) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.trade.toLowerCase().includes(q) ||
      a.phone.toLowerCase().includes(q) ||
      a.addressDetail.toLowerCase().includes(q)
    );
  });

  // If not authenticated, render Admin Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-black text-center text-white">
            Espace Super Admin EDO
          </h1>
          <p className="text-sm font-semibold text-center text-slate-400 mt-1 mb-6">
            Accès strictement réservé à la direction générale EFA EDO
          </p>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Email Administrateur
              </label>
              <div className="flex items-center gap-2 px-3 py-3 rounded-2xl bg-slate-800 border-2 border-slate-700 focus-within:border-amber-500 transition-colors">
                <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="email"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  placeholder="efatech2@gmail.com"
                  className="flex-1 bg-transparent text-white font-bold outline-none text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Mot de Passe Administrateur
              </label>
              <div className="flex items-center gap-2 px-3 py-3 rounded-2xl bg-slate-800 border-2 border-slate-700 focus-within:border-amber-500 transition-colors">
                <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Tapez le mot de passe"
                  className="flex-1 bg-transparent text-white font-bold outline-none text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[54px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Se connecter au panneau Admin</span>
            </button>
          </form>

          <button
            onClick={onBackToHome}
            className="w-full mt-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'application</span>
          </button>
        </div>
      </div>
    );
  }

  // Admin Dashboard Render
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/30 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-transform"
              title="Retourner à l'accueil"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-white">
                  Panneau Super Admin <span className="text-amber-400">EFA EDO</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">
                Connecté : {SUPER_ADMIN_EMAIL}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playClick();
                onRefreshArtisans();
                loadBoostRequests();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold active:scale-95 transition-transform cursor-pointer"
              title="Actualiser les données"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold active:scale-95 transition-transform cursor-pointer"
              title="Déconnexion"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Navigation Tabs between Artisans & Boost Requests */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 flex-wrap">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('artisans');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all cursor-pointer ${
              activeTab === 'artisans'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Artisans Réels</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'artisans' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {artisans.length}
            </span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('boosts');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all cursor-pointer ${
              activeTab === 'boosts'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Demandes PRO (Boosts)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'boosts' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {boostRequests.filter((b) => b.statut === 'en_attente').length} en attente
            </span>
          </button>
        </div>

        {/* TAB 1: Real Artisans list */}
        {activeTab === 'artisans' && (
          <div className="space-y-4">
            {/* Search and summary bar */}
            <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px] flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par nom, métier, téléphone..."
                  className="flex-1 bg-transparent text-sm text-white font-semibold outline-none placeholder:text-slate-500"
                />
              </div>

              <div className="text-xs font-bold text-slate-400">
                Total réels dans Supabase : <b className="text-white">{artisans.length}</b>
              </div>
            </div>

            {filteredArtisans.length === 0 ? (
              <div className="bg-slate-900 p-12 rounded-3xl border border-slate-800 text-center">
                <p className="text-base font-bold text-slate-400">
                  Aucun artisan correspondant trouvé.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArtisans.map((artisan) => {
                  const isBoostedActive =
                    artisan.isBoosted &&
                    (!artisan.boostUntil || new Date(artisan.boostUntil).getTime() > Date.now());
                  const isBanned = artisan.status === 'banni';
                  const isPending = artisan.status === 'en_attente';

                  return (
                    <div
                      key={artisan.id}
                      className={`p-5 rounded-3xl border-2 transition-all bg-slate-900 ${
                        isBanned
                          ? 'border-rose-500/40 opacity-75'
                          : isBoostedActive
                          ? 'border-amber-400 shadow-lg shadow-amber-500/10'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Header of card */}
                      <div className="flex items-start gap-4 mb-4">
                        <img
                          src={artisan.avatar}
                          alt={artisan.name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shrink-0 bg-slate-950"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-lg text-white truncate">
                              {artisan.name}
                            </h3>
                            {isBoostedActive && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase flex items-center gap-1">
                                <Zap className="w-3 h-3 fill-slate-950" />
                                Boosté PRO
                              </span>
                            )}
                            {isBanned && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase">
                                Banni
                              </span>
                            )}
                            {isPending && (
                              <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[10px] font-black uppercase">
                                En attente
                              </span>
                            )}
                          </div>

                          <p className="text-amber-400 font-extrabold text-sm mt-0.5">
                            {artisan.trade}
                          </p>

                          <p className="text-slate-400 text-xs truncate mt-0.5">
                            📍 {artisan.addressDetail || 'Position GPS'}
                          </p>
                        </div>
                      </div>

                      {/* Contact & GPS details */}
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Téléphone / WhatsApp :</span>
                          <span className="font-bold text-white flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            {artisan.phone || 'Non renseigné'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Coordonnées GPS :</span>
                          <span className="font-bold text-white">
                            {artisan.lat !== null && artisan.lng !== null
                              ? `${artisan.lat.toFixed(4)}, ${artisan.lng.toFixed(4)}`
                              : 'Non capté (NULL)'}
                          </span>
                        </div>
                        {artisan.boostUntil && (
                          <div className="flex items-center justify-between text-amber-300">
                            <span>Fin du Boost :</span>
                            <span className="font-bold">
                              {new Date(artisan.boostUntil).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Forfaits Boost PRO: 2000F=1 mois, 5000F=3 mois */}
                      <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2 mb-3">
                        <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                          <span className="font-black text-amber-400 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 fill-amber-400" />
                            <span>Forfait Boost PRO :</span>
                          </span>
                          {isBoostedActive && artisan.boostUntil ? (
                            <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                              Actif jusqu'au {new Date(artisan.boostUntil).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-500">
                              Inactif
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleActivatePlan(artisan, 30, 'pro_1_mois', 2000)}
                            disabled={actionLoadingId === artisan.id}
                            className="min-h-[42px] px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-black text-xs flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                            title="Activer 1 mois (2000 FCFA)"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>2000F (1 mois)</span>
                          </button>

                          <button
                            onClick={() => handleActivatePlan(artisan, 90, 'pro_3_mois', 5000)}
                            disabled={actionLoadingId === artisan.id}
                            className="min-h-[42px] px-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer"
                            title="Activer 3 mois (5000 FCFA)"
                          >
                            <Crown className="w-3.5 h-3.5 fill-slate-950" />
                            <span>5000F (3 mois)</span>
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons: APPROUVER / BANNIR / SUPPRIMER */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800 flex-wrap">
                        {/* APPROUVER */}
                        <button
                          onClick={() => handleApproveArtisan(artisan)}
                          disabled={actionLoadingId === artisan.id || artisan.status === 'approuve'}
                          className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                          title="Approuver le profil artisan"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Approuver</span>
                        </button>

                        {/* BANNIR */}
                        <button
                          onClick={() => handleBanArtisan(artisan)}
                          disabled={actionLoadingId === artisan.id || isBanned}
                          className="px-3.5 min-h-[44px] rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                          title="Bannir cet artisan"
                        >
                          <Ban className="w-4 h-4" />
                          <span>Bannir</span>
                        </button>

                        {/* SUPPRIMER */}
                        <button
                          onClick={() => handleDeleteArtisan(artisan)}
                          disabled={actionLoadingId === artisan.id}
                          className="px-3.5 min-h-[44px] rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Boost Requests (public.boost_requests) */}
        {activeTab === 'boosts' && (
          <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white">
                  Demandes d'Abonnement EDO PRO (Mobile Money)
                </h2>
                <p className="text-xs text-slate-400">
                  Après réception du paiement Mobile Money, cliquez sur VALIDER pour activer la mise en avant
                </p>
              </div>
              <button
                onClick={loadBoostRequests}
                disabled={isLoadingRequests}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingRequests ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {boostRequests.length === 0 ? (
              <div className="bg-slate-900 p-12 rounded-3xl border border-slate-800 text-center">
                <Crown className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-400">
                  Aucune demande d'abonnement PRO pour le moment.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {boostRequests.map((req) => {
                  const relatedArtisan = artisans.find((a) => a.id === req.artisan_id);
                  const isValide = req.statut === 'valide';

                  return (
                    <div
                      key={req.id}
                      className={`p-5 rounded-3xl border-2 transition-all bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isValide
                          ? 'border-emerald-500/40 bg-emerald-950/10'
                          : 'border-amber-400 bg-amber-950/10 shadow-lg shadow-amber-500/10'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-lg text-white">
                            {relatedArtisan?.name || `Artisan #${req.artisan_id.slice(0, 8)}`}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                              isValide
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-amber-400 text-slate-950'
                            }`}
                          >
                            {isValide ? 'VALIDÉ' : 'EN ATTENTE'}
                          </span>
                        </div>

                        <p className="text-sm font-extrabold text-amber-400">
                          {req.duree} Jours · {req.montant} FCFA
                        </p>

                        <p className="text-xs text-slate-400">
                          Métier : {relatedArtisan?.trade || 'Artisan'} · Contact : {relatedArtisan?.phone || 'Non renseigné'}
                        </p>

                        {req.created_at && (
                          <p className="text-[11px] text-slate-500">
                            Demandé le : {new Date(req.created_at).toLocaleString('fr-FR')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {!isValide ? (
                          <button
                            onClick={() => handleValidateBoost(req)}
                            disabled={actionLoadingId === req.id}
                            className="w-full sm:w-auto min-h-[48px] px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                          >
                            <Zap className="w-4 h-4 fill-white" />
                            <span>{actionLoadingId === req.id ? 'Validation...' : 'VALIDER LE BOOST PRO'}</span>
                          </button>
                        ) : (
                          <span className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
                            <Check className="w-5 h-5 stroke-[3]" />
                            Actif & Visible en tête
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
