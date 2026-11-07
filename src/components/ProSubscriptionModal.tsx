import React, { useState } from 'react';
import {
  Crown,
  Check,
  X,
  Volume2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Artisan } from '../types';
import { speakAloud, sounds } from '../utils/audio';
import { supabase } from '../utils/supabase';

interface ProSubscriptionModalProps {
  currentArtisan: Artisan;
  onClose: () => void;
  onUpgradeSuccess?: (artisanId: string) => void;
}

export type ProPlanId = 'free' | 'month' | 'quarter';

interface PlanDetail {
  id: ProPlanId;
  name: string;
  badgeName: string;
  priceText: string;
  periodText: string;
  amountNumber: number;
  durationDays: number;
  isPopular?: boolean;
  features: string[];
}

const PLANS: PlanDetail[] = [
  {
    id: 'free',
    name: 'Gratuit',
    badgeName: 'Gratuit',
    priceText: '0F',
    periodText: '',
    amountNumber: 0,
    durationDays: 0,
    features: [
      'Profil avec photos',
      'Visible sur carte quand en ligne',
      'Réception directe d\'appels',
    ],
  },
  {
    id: 'month',
    name: 'PRO 1 Mois',
    badgeName: 'PRO 1 Mois',
    priceText: '2000 FCFA',
    periodText: '/mois',
    amountNumber: 2000,
    durationDays: 30,
    features: [
      'En tête recherches autour de toi',
      'Badge EFA EDO PRO Or',
      'Jusqu\'à 5x plus d\'appels/jour',
      'Support prioritaire WhatsApp',
    ],
  },
  {
    id: 'quarter',
    name: 'PRO 3 Mois',
    badgeName: 'PRO 3 Mois',
    priceText: '5000 FCFA',
    periodText: '/trimestre (Économise 1000F)',
    amountNumber: 5000,
    durationDays: 90,
    isPopular: true,
    features: [
      'Tous avantages PRO',
      'En tête dans tout ton secteur',
      'Statistiques avancées appels',
      'Badge Diamant vérifié',
    ],
  },
];

const WHATSAPP_PHONE = '22896100972';

export const ProSubscriptionModal: React.FC<ProSubscriptionModalProps> = ({
  currentArtisan,
  onClose,
  onUpgradeSuccess,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<ProPlanId>('quarter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1];

  const handleVoiceExplanation = () => {
    sounds.playClick();
    speakAloud(
      "Abonnement EFA EDO PRO. L'offre 1 mois à 2000 Francs ou 3 mois à 5000 Francs vous place en tête des recherches autour de votre atelier. Appuyez sur continuer pour recevoir les modalités de paiement par WhatsApp."
    );
  };

  const handleAction = async () => {
    sounds.playClick();

    if (selectedPlan.id === 'free') {
      sounds.playSuccess();
      speakAloud("Vous êtes sur l'offre gratuite. Vos coordonnées restent visibles pour les clients.");
      onClose();
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Enregistrer la demande dans public.boost_requests sur Supabase
      if (supabase && currentArtisan.id) {
        try {
          await supabase.from('boost_requests').insert([
            {
              artisan_id: currentArtisan.id,
              duree: selectedPlan.durationDays,
              montant: selectedPlan.amountNumber,
              statut: 'en_attente',
            },
          ]);
        } catch {
          // continue to WhatsApp anyway
        }
      }

      // 2. Message auto WhatsApp avec nom artisan et offre choisie
      const messageText = `Bonjour EFA EDO, je veux passer en PRO ${selectedPlan.name} - ${selectedPlan.priceText}. Donnez-moi les modalités de paiement Mobile Money. Artisan: ${currentArtisan.name} (Tél: ${currentArtisan.phone || 'Non renseigné'}).`;
      const encodedMsg = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodedMsg}`;

      sounds.playSuccess();
      window.open(whatsappUrl, '_blank');

      if (onUpgradeSuccess) {
        onUpgradeSuccess(currentArtisan.id);
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bouton bas dynamique selon offre sélectionnée
  const buttonLabel =
    selectedPlan.id === 'free'
      ? "Continuer avec l'offre Gratuit"
      : `Continuer avec l'offre ${selectedPlan.priceText}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-amber-400 relative my-auto max-h-[92vh] flex flex-col overflow-hidden">
        {/* Croix X en haut à droite pour fermer et revenir à la page précédente */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition-transform z-10 cursor-pointer"
          aria-label="Fermer"
          title="Fermer"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Top Header */}
        <div className="flex items-center justify-between pr-12 mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black">
            <Crown className="w-4 h-4 fill-amber-500 text-amber-600 shrink-0" />
            <span>ABONNEMENT EDO PRO</span>
          </div>

          <button
            onClick={handleVoiceExplanation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-xs active:scale-95 transition-transform cursor-pointer"
            title="Écouter les explications"
          >
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>Écouter</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Passe en tête des recherches autour de toi
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
              Les clients appellent en priorité les artisans EDO PRO vérifiés.
            </p>
          </div>

          {/* Cards list */}
          <div className="space-y-3">
            {PLANS.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const isFree = plan.id === 'free';

              return (
                <div
                  key={plan.id}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedPlanId(plan.id);
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-500/20'
                      : isFree
                      ? 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {/* Badge LE PLUS POPULAIRE */}
                  {plan.isPopular && (
                    <span className="absolute -top-2.5 right-4 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3 fill-slate-950" />
                      LE PLUS POPULAIRE
                    </span>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-black text-base sm:text-lg text-slate-900">
                        {plan.name}
                      </h3>
                      <div className="text-lg sm:text-xl font-black text-amber-700">
                        {plan.priceText}{' '}
                        {plan.periodText && (
                          <span className="text-xs font-bold text-slate-500">
                            {plan.periodText}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-amber-600 bg-amber-500 text-slate-950'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>

                  <ul className="space-y-1 text-xs font-semibold text-slate-700 mt-2">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic bottom button */}
        <div className="pt-4 border-t border-slate-100 mt-2">
          <button
            onClick={handleAction}
            disabled={isSubmitting}
            className="w-full min-h-[56px] rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-base sm:text-lg font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-900/10 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span>{isSubmitting ? 'Traitement en cours...' : buttonLabel}</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
