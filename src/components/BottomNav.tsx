import {
  Search,
  MapPin,
  Hammer,
  Volume2,
} from 'lucide-react';
import { UserRole } from '../types';
import { sounds } from '../utils/audio';

interface BottomNavProps {
  activeTab: 'home' | 'map' | 'artisan' | 'pro' | 'voice';
  setActiveTab: (tab: 'home' | 'map' | 'artisan' | 'pro' | 'voice') => void;
  role: UserRole;
  isArtisanOnline?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  role,
  isArtisanOnline,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg md:hidden">
      <div className="grid grid-cols-4 items-center h-18 px-2 max-w-lg mx-auto">
        {/* Tab 1: Home / Recherche */}
        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('home');
          }}
          className={`flex flex-col items-center justify-center py-2 h-full transition-colors ${
            activeTab === 'home'
              ? 'text-amber-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-semibold'
          }`}
        >
          <Search className="w-6 h-6 stroke-[2.2]" />
          <span className="text-[11px] mt-1 tracking-tight">Recherche</span>
        </button>

        {/* Tab 2: Carte GPS */}
        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('map');
          }}
          className={`flex flex-col items-center justify-center py-2 h-full transition-colors ${
            activeTab === 'map'
              ? 'text-amber-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-semibold'
          }`}
        >
          <MapPin className="w-6 h-6 stroke-[2.2]" />
          <span className="text-[11px] mt-1 tracking-tight">Carte GPS</span>
        </button>

        {/* Tab 3: Mode Artisan */}
        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('artisan');
          }}
          className={`flex flex-col items-center justify-center py-2 h-full relative transition-colors ${
            activeTab === 'artisan'
              ? 'text-amber-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-semibold'
          }`}
        >
          {role === 'artisan' && isArtisanOnline && (
            <span className="absolute top-2 right-6 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
          )}
          <Hammer className="w-6 h-6 stroke-[2.2]" />
          <span className="text-[11px] mt-1 tracking-tight">
            {role === 'artisan' ? 'Mon Atelier' : 'Artisan'}
          </span>
        </button>

        {/* Tab 4: Assistance Vocale */}
        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('voice');
          }}
          className={`flex flex-col items-center justify-center py-2 h-full transition-colors ${
            activeTab === 'voice'
              ? 'text-amber-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-semibold'
          }`}
        >
          <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
            <Volume2 className="w-4 h-4" />
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Aide Voix</span>
        </button>
      </div>
    </nav>
  );
};
