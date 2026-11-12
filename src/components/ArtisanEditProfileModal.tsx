import React, { useState } from 'react';
import {
  X,
  Camera,
  Upload,
  Trash2,
  MapPin,
  Phone,
  Building,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  Lock,
  Navigation,
  FileText,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Artisan, GeoCoordinates } from '../types';
import { supabase } from '../utils/supabase';
import { requestDeviceCoordinates } from '../utils/geo';
import { sounds, speakAloud } from '../utils/audio';

interface ArtisanEditProfileModalProps {
  artisan: Artisan;
  onClose: () => void;
  onSaveSuccess: (updated: Artisan) => void;
}

export const ArtisanEditProfileModal: React.FC<ArtisanEditProfileModalProps> = ({
  artisan,
  onClose,
  onSaveSuccess,
}) => {
  // Check 7-day restriction rule
  const lastUpdate = artisan.lastProfileUpdate ? new Date(artisan.lastProfileUpdate).getTime() : 0;
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const timeSinceUpdate = now - lastUpdate;
  const isLocked = lastUpdate > 0 && timeSinceUpdate < SEVEN_DAYS_MS;
  const daysRemaining = isLocked
    ? Math.ceil((SEVEN_DAYS_MS - timeSinceUpdate) / (24 * 60 * 60 * 1000))
    : 0;
  const nextAllowedDate = new Date(lastUpdate + SEVEN_DAYS_MS);
  const formattedNextDate = nextAllowedDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Form states
  const [avatar, setAvatar] = useState(artisan.avatar || '');
  const [coverImage, setCoverImage] = useState(artisan.coverImage || '');
  const [workPhotos, setWorkPhotos] = useState<string[]>(artisan.workPhotos || []);
  const [addressDetail, setAddressDetail] = useState(artisan.addressDetail || '');
  const [locality, setLocality] = useState(artisan.locality || '');
  const [secondPhone, setSecondPhone] = useState(artisan.secondPhone || '');
  const [description, setDescription] = useState(
    artisan.description || (artisan.bioVoiceText && !artisan.bioVoiceText.startsWith('TEL2:') ? artisan.bioVoiceText : '')
  );
  const [showInspirationModal, setShowInspirationModal] = useState(false);

  const countWords = (text: string) => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };

  const [coords, setCoords] = useState<GeoCoordinates | null>(
    artisan.lat !== null && artisan.lng !== null
      ? { lat: artisan.lat, lng: artisan.lng }
      : null
  );
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Upload single profile photo from gallery
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
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

  // Upload cover photo from gallery (comme Facebook/WhatsApp)
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const file = e.target.files?.[0];
    if (!file) return;
    sounds.playClick();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverImage(reader.result);
        sounds.playSuccess();
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload portfolio photos from gallery (max 5)
  const handleWorkPhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    sounds.playClick();
    const currentCount = workPhotos.length;
    const remainingSlots = 5 - currentCount;

    if (remainingSlots <= 0) {
      alert("Le portfolio est limité à 5 photos maximum. Supprimez-en une pour en ajouter une nouvelle.");
      return;
    }

    const filesToRead = Array.from(files).slice(0, remainingSlots);
    filesToRead.forEach((file) => {
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

  const handleRemoveWorkPhoto = (idx: number) => {
    if (isLocked) return;
    sounds.playClick();
    setWorkPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // GPS coords refresh
  const handleRefreshGps = async () => {
    if (isLocked) return;
    sounds.playClick();
    setIsGpsLoading(true);
    try {
      const newPos = await requestDeviceCoordinates();
      setCoords(newPos);
      sounds.playSuccess();
      speakAloud("Position GPS de votre atelier actualisée avec succès !");
    } catch {
      alert("Impossible de capter la position GPS actuelle.");
    } finally {
      setIsGpsLoading(false);
    }
  };

  // Submit profile edits
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      alert(`Modification bloquée. Vous pourrez modifier votre profil à partir du ${formattedNextDate} (dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}).`);
      return;
    }

    const wordCount = countWords(description);
    if (wordCount > 1500) {
      alert(`La description contient ${wordCount} mots. La limite maximale est de 1500 mots.`);
      return;
    }

    setIsSaving(true);
    sounds.playClick();

    try {
      const nowIso = new Date().toISOString();

      if (supabase) {
        // Enregistrer quartier/repère dans address_detail (ne pas envoyer la colonne 'locality' qui n'existe pas en base)
        const combinedAddress = locality.trim()
          ? `${addressDetail.trim()} (${locality.trim()})`.trim()
          : addressDetail.trim();

        const updatePayload: Record<string, any> = {
          avatar: avatar,
          cover_image: coverImage,
          work_photos: workPhotos.slice(0, 5),
          address_detail: combinedAddress,
          second_phone: secondPhone.trim(),
          description: description.trim(),
          lat: coords ? coords.lat : null,
          lng: coords ? coords.lng : null,
          last_profile_update: nowIso,
        };

        let { error } = await supabase
          .from('artisans')
          .update(updatePayload)
          .eq('id', artisan.id);

        // Fallback si la colonne 'description' ou 'second_phone' n'existe pas encore dans le schema Supabase
        if (error && (error.message.includes('description') || error.message.includes('second_phone') || error.message.includes('column') || error.message.includes('schema cache'))) {
          // Préservation sûre dans les colonnes standard
          const fallbackBio = description.trim()
            ? description.trim()
            : (secondPhone.trim() ? `TEL2:${secondPhone.trim()}` : (artisan.bioVoiceText || null));

          const fallbackPayload: Record<string, any> = {
            avatar: avatar,
            cover_image: coverImage,
            work_photos: workPhotos.slice(0, 5),
            address_detail: combinedAddress,
            lat: coords ? coords.lat : null,
            lng: coords ? coords.lng : null,
            last_profile_update: nowIso,
            bio_voice_text: fallbackBio,
          };
          if (secondPhone.trim()) {
            fallbackPayload.second_phone = secondPhone.trim();
          }
          const retryRes = await supabase
            .from('artisans')
            .update(fallbackPayload)
            .eq('id', artisan.id);
          error = retryRes.error;
        }

        if (error) {
          alert("Erreur lors de la mise à jour : " + error.message);
          setIsSaving(false);
          return;
        }
      }

      const updatedArtisan: Artisan = {
        ...artisan,
        avatar,
        coverImage,
        workPhotos: workPhotos.slice(0, 5),
        addressDetail: addressDetail.trim(),
        locality: locality.trim(),
        secondPhone: secondPhone.trim(),
        description: description.trim(),
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null,
        lastProfileUpdate: nowIso,
      };

      onSaveSuccess(updatedArtisan);
      sounds.playSuccess();
      speakAloud(`Profil mis à jour avec succès ! Prochaine modification autorisée à partir du ${formattedNextDate}.`);
      onClose();
    } catch (err) {
      alert("Erreur imprévue : " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-amber-400 relative my-6 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Édition Profil Artisan
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-2">
            Modifier mes informations
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            Règle de sécurité EFA EDO : Modifiable 1 seule fois par période de 7 jours
          </p>
        </div>

        {/* 7-DAY RESTRICTION BANNER IF LOCKED */}
        {isLocked ? (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-900 space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="font-black text-sm uppercase">
                Modification verrouillée (1x / 7 jours)
              </h3>
            </div>
            <p className="text-sm font-bold">
              Tu as déjà modifié ton profil récemment. Réessaie dans{' '}
              <span className="text-amber-800 underline font-black">
                {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}
              </span>.
            </p>
            <p className="text-xs text-amber-800/80">
              Dernière modification :{' '}
              {artisan.lastProfileUpdate
                ? new Date(artisan.lastProfileUpdate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Récemment'}
            </p>
          </div>
        ) : (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Votre profil est disponible à la modification aujourd'hui.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* 1. Photo de profil (1 image galerie) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="block text-xs font-black uppercase text-slate-700 mb-2">
              Photo de profil (1 photo galerie)
            </label>
            <div className="flex items-center gap-4">
              {avatar ? (
                <div className="relative shrink-0">
                  <img
                    src={avatar}
                    alt="Aperçu profil"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500 shadow-xs"
                  />
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs"
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
              )}

              <div className="flex-1">
                <label
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-transform ${
                    isLocked
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Importer depuis la galerie</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={isLocked}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Photo de couverture modifiable (comme Facebook/WhatsApp) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-black uppercase text-slate-700">
                Photo de couverture (Bannière atelier)
              </label>
              {coverImage && !isLocked && (
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Supprimer
                </button>
              )}
            </div>

            <div className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 flex items-center justify-center mb-3">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt="Couverture"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-2 text-white/90">
                  <ImageIcon className="w-6 h-6 text-amber-200 mx-auto mb-1" />
                  <span className="text-[11px] font-bold">
                    Bannière élégante EDO par défaut
                  </span>
                </div>
              )}
            </div>

            {!isLocked && (
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-transform">
                <Upload className="w-4 h-4" />
                <span>Changer la photo de couverture</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  disabled={isLocked}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* 2. Portfolio : Réalisations (max 5 images) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-black uppercase text-slate-700">
                Portfolio (Max 5 photos)
              </label>
              <span className="text-xs font-bold text-slate-500">
                {workPhotos.length} / 5
              </span>
            </div>

            {!isLocked && workPhotos.length < 5 && (
              <label className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 bg-white text-slate-700 font-bold text-xs cursor-pointer transition-colors mb-3">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>Ajouter des photos ({5 - workPhotos.length} restantes)</span>
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
              <div className="grid grid-cols-5 gap-1.5">
                {workPhotos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWorkPhoto(idx)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center text-[10px]"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-1">
                Aucune photo de réalisation.
              </p>
            )}
          </div>

          {/* 3. Coordonnées boutique/atelier (Nom ou repère) */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-amber-600" />
              <span>Coordonnées Boutique / Atelier (Repère)</span>
            </label>
            <input
              type="text"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              disabled={isLocked}
              placeholder="Ex: Face pharmacie de la Paix, Grand Marché"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 focus:border-amber-500 text-sm font-bold text-slate-900 outline-none"
            />
          </div>

          {/* 4. Localité / Quartier / Ville */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>Localité / Quartier / Ville</span>
            </label>
            <input
              type="text"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              disabled={isLocked}
              placeholder="Ex: Tokoin, Lomé ou Akpakpa, Cotonou"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 focus:border-amber-500 text-sm font-bold text-slate-900 outline-none"
            />
          </div>

          {/* 5. 2ème Téléphone */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>2ème Téléphone (Appels ou WhatsApp secondaire)</span>
            </label>
            <input
              type="tel"
              value={secondPhone}
              onChange={(e) => setSecondPhone(e.target.value)}
              disabled={isLocked}
              placeholder="Ex: +228 91 23 45 67"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 focus:border-amber-500 text-sm font-bold text-slate-900 outline-none"
            />
          </div>

          {/* 6. Description / Présentation */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="block text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Description (Présentation de votre activité)</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowInspirationModal(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                title="Voir un exemple inspirant"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>Voir un exemple</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Présentez votre savoir-faire et vos services (optionnel, max 1500 mots). Ne bloque rien si vide.
            </p>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLocked}
              placeholder="Ex : Bonjour, je m'appelle ..., je suis menuisier à Lomé, j'ai 8 ans d'expérience..."
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 focus:border-amber-500 text-sm font-medium text-slate-900 outline-none resize-y"
            />
            <div className="flex justify-between items-center mt-1 text-[11px] font-bold text-slate-500">
              <span>Optionnel</span>
              <span className={countWords(description) > 1500 ? 'text-rose-600 font-black' : ''}>
                {countWords(description)} / 1500 mots
              </span>
            </div>
          </div>

          {/* 7. Coordonnées GPS réelles + Bouton Actualiser GPS */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black uppercase text-slate-800">
                  Position GPS de l'atelier
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefreshGps}
                disabled={isLocked || isGpsLoading}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-xs flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{isGpsLoading ? 'Détection...' : 'Actualiser GPS'}</span>
              </button>
            </div>
            <div className="text-xs font-bold text-slate-600">
              {coords
                ? `Coordonnées actives : ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                : 'Aucune coordonnée GPS enregistrée.'}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLocked || isSaving}
            className="w-full min-h-[54px] rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>
              {isLocked
                ? `Bloqué (${daysRemaining} jours restants)`
                : isSaving
                ? 'Enregistrement...'
                : 'Enregistrer mes modifications'}
            </span>
          </button>
        </form>

        {/* Modal Exemple Inspirant */}
        {showInspirationModal && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-amber-400 relative animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowInspirationModal(false);
                }}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Exemple de présentation
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Modèle simple pour inspirer vos clients
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-slate-800 text-sm leading-relaxed mb-4 font-medium">
                « Bonjour, je m'appelle ..., je suis menuisier à Lomé, j'ai 8 ans d'expérience, je fabrique des meubles, portes, etc. Je travaille avec sérieux et je respecte les délais. Contactez-moi pour vos projets. »
              </div>

              <p className="text-xs text-slate-500 mb-5 italic text-center">
                Conseil : Adaptez simplement avec votre prénom, votre ville, votre métier et vos réalisations.
              </p>

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowInspirationModal(false);
                }}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm shadow-sm active:scale-95 transition-transform cursor-pointer"
              >
                Fermer / Utiliser comme inspiration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
