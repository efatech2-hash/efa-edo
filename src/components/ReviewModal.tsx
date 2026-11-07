import React, { useState } from 'react';
import {
  Star,
  Mic,
  MicOff,
  Volume2,
  X,
  Check,
} from 'lucide-react';
import { Artisan, Review } from '../types';
import { speakAloud, startVoiceRecognition, sounds } from '../utils/audio';

interface ReviewModalProps {
  artisan: Artisan;
  onClose: () => void;
  onSubmitReview: (artisanId: string, review: Review) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  artisan,
  onClose,
  onSubmitReview,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [authorName, setAuthorName] = useState('Client satisfait');
  const [commentText, setCommentText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);

  const quickBadges = [
    'Travail très propre',
    'Arrivé à l’heure',
    'Prix très honnête',
    'Matériel de qualité',
    'Artisan respectueux',
  ];

  const handleVoiceExplanation = () => {
    sounds.playClick();
    speakAloud(
      `Comment s'est passé le travail de ${artisan.name} ? Choisis le nombre d'étoiles de 1 à 5, ou parle au micro pour laisser un avis vocal.`
    );
  };

  const toggleVoiceRecording = () => {
    sounds.playClick();
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    speakAloud("Dis ton avis à voix haute.");

    startVoiceRecognition(
      (transcript) => {
        setIsRecording(false);
        setCommentText((prev) => (prev ? `${prev} - ${transcript}` : transcript));
        setHasRecordedAudio(true);
        sounds.playSuccess();
      },
      () => {
        setIsRecording(false);
      }
    );
  };

  const handleSelectStar = (val: number) => {
    sounds.playClick();
    setRating(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playSuccess();
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      author: authorName.trim() || 'Client vérifié',
      rating: rating,
      text: commentText.trim() || 'Travail très soigné et rapide. Je recommande !',
      date: 'À l’instant',
      hasAudio: hasRecordedAudio,
      audioDuration: hasRecordedAudio ? '0:15' : undefined,
    };
    onSubmitReview(artisan.id, newRev);
    onClose();
    speakAloud(`Merci beaucoup pour votre avis sur ${artisan.name}. C'est enregistré !`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border-2 border-amber-400 relative animate-in fade-in zoom-in-95 duration-200">
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

        {/* Audio Helper */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            Évaluation EDO
          </span>
          <button
            onClick={handleVoiceExplanation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black mr-8 shadow-xs"
          >
            <Volume2 className="w-4 h-4" />
            <span>Écouter</span>
          </button>
        </div>

        <div className="text-center mb-6">
          {artisan.avatar ? (
            <img
              src={artisan.avatar}
              alt={artisan.name}
              className="w-20 h-20 rounded-3xl object-cover mx-auto mb-3 border-2 border-amber-500 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center mx-auto mb-3 border-2 border-white shadow-md uppercase">
              {(artisan.name?.charAt(0) || 'A').toUpperCase()}
            </div>
          )}
          <h2 className="text-2xl font-black text-slate-900">
            Comment s'est passé le travail ?
          </h2>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Artisan : <span className="text-amber-700 font-bold">{artisan.name}</span> ({artisan.trade})
          </p>
        </div>

        {/* 5 Giant Stars */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((starVal) => (
            <button
              key={starVal}
              type="button"
              onClick={() => handleSelectStar(starVal)}
              className="p-2 transition-transform active:scale-90 hover:scale-110"
              aria-label={`${starVal} étoiles`}
            >
              <Star
                className={`w-12 h-12 ${
                  starVal <= rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-200 fill-slate-100'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Quick Review Badges */}
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {quickBadges.map((badge) => (
            <button
              key={badge}
              type="button"
              onClick={() => {
                sounds.playClick();
                setCommentText((prev) => (prev ? `${prev}, ${badge}` : badge));
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-800 text-xs font-bold transition-colors"
            >
              + {badge}
            </button>
          ))}
        </div>

        {/* Voice or text input */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Ton commentaire (ou utilise le micro)..."
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-amber-500 font-bold text-slate-900 text-base outline-none"
            />
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-xs active:scale-95 transition-all shrink-0 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-amber-400 hover:bg-amber-500 text-slate-950'
              }`}
              title="Dicter un avis vocal"
            >
              {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
          </div>

          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Ton nom (ex: Kodjo, Afi...)"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 outline-none"
          />
        </div>

        {/* Submit Button: Big tactile 56px */}
        <button
          onClick={handleSubmit}
          className="w-full min-h-[58px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10 active:scale-[0.98] transition-transform"
        >
          <Check className="w-6 h-6 stroke-[3]" />
          Envoyer ma note ({rating}/5 étoiles)
        </button>
      </div>
    </div>
  );
};
