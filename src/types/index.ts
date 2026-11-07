export type StandardTrade =
  | 'Menuisier Bois'
  | 'Menuisier Alu & Vitrier'
  | 'Mécanicien Auto & Moto'
  | 'Vulcanisateur'
  | 'Soudeur & Ferronnier'
  | 'Maçon'
  | 'Carreleur'
  | 'Plombier'
  | 'Électricien'
  | 'Peintre'
  | 'Couturier & Tailleur'
  | 'Coiffeur & Barbier'
  | 'Coiffeuse & Tresseuse'
  | 'Esthéticienne & Make-up'
  | 'Cordonnier'
  | 'Frigoriste & Climatisation'
  | 'Électronicien (TV & GSM)'
  | 'Tapissier'
  | 'Blanchisseur & Pressing'
  | 'Commerçant'
  | 'Autre';

export type TradeCategory = StandardTrade | (string & {});

export interface GeoCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  addressLabel?: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number; // 1 to 5
  text: string;
  date: string;
  hasAudio?: boolean;
  audioDuration?: string;
}

export interface Artisan {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  trade: string; // standard trade or custom name
  customTradeName?: string;
  additionalTrades?: string[];
  addressDetail: string; // Free text landmark, e.g. "Face pharmacie de la Paix" or "Marché central"
  lat: number | null;
  lng: number | null;
  distanceKm?: number; // Calculated dynamically via Haversine formula from client
  distanceBadge?: string; // Formatted badge, e.g. "à 0.8km"
  avatar: string;
  coverImage: string;
  workPhotos: string[];
  isOnline: boolean;
  isPro: boolean;
  isBoosted?: boolean;
  boostUntil?: string | null;
  boostLevel?: string | null;
  status?: string;
  rating: number; // Avg rating 1.0 - 5.0
  reviewCount: number;
  completedJobs: number;
  voiceNoteUrl?: string;
  bioVoiceText: string;
  reviews: Review[];
  dailyViews: number;
  dailyCalls: number;
  registeredAt?: string;
  secondPhone?: string;
  locality?: string;
  lastProfileUpdate?: string | null;
}

export interface BoostRequest {
  id: string;
  artisan_id: string;
  artisan_name?: string;
  artisan_phone?: string;
  duree: number;
  montant: number;
  statut: string;
  created_at?: string;
}

export type UserRole = 'client' | 'artisan';

export interface CurrentUser {
  id: string;
  email?: string;
  role: UserRole;
  phone: string;
  name: string;
  addressDetail?: string;
  lat?: number;
  lng?: number;
  avatar?: string;
  artisanId?: string; // If registered as artisan
  isOnline?: boolean;
  isPro?: boolean;
}

export interface TradeMeta {
  name: StandardTrade;
  iconName: string;
  color: string;
  description: string;
}

export interface CustomTradeSubmission {
  id: string;
  name: string;
  submittedBy: string;
  date: string;
  count: number;
}
