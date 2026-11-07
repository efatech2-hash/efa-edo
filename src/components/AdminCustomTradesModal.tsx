import React from 'react';
import { X, Trash2, CheckCircle, Tag, Clock, Volume2 } from 'lucide-react';
import { CustomTradeSubmission } from '../types';
import { sounds, speakAloud } from '../utils/audio';

interface AdminCustomTradesModalProps {
  customTrades: CustomTradeSubmission[];
  onClose: () => void;
  onApproveTrade: (tradeName: string) => void;
  onDeleteTrade: (id: string) => void;
}

export const AdminCustomTradesModal: React.FC<AdminCustomTradesModalProps> = ({
  customTrades,
  onClose,
  onApproveTrade,
  onDeleteTrade,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl p-6 shadow-2xl border-2 border-amber-400 relative my-6 animate-in fade-in zoom-in-95">
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

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
            Espace Administration
          </span>
          <button
            onClick={() => {
              sounds.playClick();
              speakAloud("Voici la liste des métiers personnalisés soumis par les artisans lors de leur inscription avec l'option Autre.");
            }}
            className="p-1 text-slate-400 hover:text-amber-600"
            title="Écouter"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-1">
          Métiers suggérés (« Autre »)
        </h2>
        <p className="text-sm font-semibold text-slate-600 mb-6">
          Tous les métiers artisanaux saisis sur le terrain par les artisans pour enrichir la liste principale EFA EDO.
        </p>

        {customTrades.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <Tag className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-base font-bold text-slate-700">
              Aucun métier personnalisé pour le moment.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Dès qu'un artisan choisira « Autre » lors de son inscription, sa proposition apparaîtra ici.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 mb-6">
            {customTrades.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900">
                      {item.name}
                    </h3>
                    <span className="text-[11px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                      {item.count} artisan{item.count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Par : {item.submittedBy}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.date}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      sounds.playSuccess();
                      onApproveTrade(item.name);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs"
                    title="Valider et ajouter aux métiers"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Intégrer</span>
                  </button>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onDeleteTrade(item.id);
                    }}
                    className="p-2 rounded-xl bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-600 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="w-full min-h-[52px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm"
        >
          Fermer l'administration
        </button>
      </div>
    </div>
  );
};
