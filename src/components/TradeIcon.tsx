import React from 'react';
import {
  Wrench,
  Flame,
  Hammer,
  Zap,
  Droplets,
  Scissors,
  Sparkles,
  ShoppingBag,
  LayoutGrid,
  Building,
  HelpCircle,
  Disc,
  Layers,
  Paintbrush,
  Footprints,
  Snowflake,
  Smartphone,
  Armchair,
  Shirt,
  Flower2,
  PlusCircle,
  ScissorsLineDashed
} from 'lucide-react';

interface TradeIconProps {
  trade: string;
  className?: string;
  size?: number;
}

export const TradeIcon: React.FC<TradeIconProps> = ({ trade, className = 'w-6 h-6', size }) => {
  const normalized = trade.toLowerCase();

  if (normalized.includes('bois') || normalized.includes('charpentier')) {
    return <Hammer className={className} size={size} />;
  }
  if (normalized.includes('alu') || normalized.includes('vitr')) {
    return <Building className={className} size={size} />;
  }
  if (normalized.includes('mécan') || normalized.includes('mecan')) {
    return <Wrench className={className} size={size} />;
  }
  if (normalized.includes('vulcanis') || normalized.includes('pneu')) {
    return <Disc className={className} size={size} />;
  }
  if (normalized.includes('soud') || normalized.includes('ferron')) {
    return <Flame className={className} size={size} />;
  }
  if (normalized.includes('maçon') || normalized.includes('macon')) {
    return <LayoutGrid className={className} size={size} />;
  }
  if (normalized.includes('carrel')) {
    return <Layers className={className} size={size} />;
  }
  if (normalized.includes('plomb')) {
    return <Droplets className={className} size={size} />;
  }
  if (normalized.includes('électr') || normalized.includes('electr')) {
    if (normalized.includes('tv') || normalized.includes('gsm') || normalized.includes('téléphone') || normalized.includes('telephone')) {
      return <Smartphone className={className} size={size} />;
    }
    return <Zap className={className} size={size} />;
  }
  if (normalized.includes('peint')) {
    return <Paintbrush className={className} size={size} />;
  }
  if (normalized.includes('coutur') || normalized.includes('taill')) {
    return <Scissors className={className} size={size} />;
  }
  if (normalized.includes('coiffeur') || normalized.includes('barbier')) {
    return <ScissorsLineDashed className={className} size={size} />;
  }
  if (normalized.includes('coiffeuse') || normalized.includes('tress')) {
    return <Sparkles className={className} size={size} />;
  }
  if (normalized.includes('esthét') || normalized.includes('esthet') || normalized.includes('make-up')) {
    return <Flower2 className={className} size={size} />;
  }
  if (normalized.includes('cordon') || normalized.includes('chauss')) {
    return <Footprints className={className} size={size} />;
  }
  if (normalized.includes('frigo') || normalized.includes('clim')) {
    return <Snowflake className={className} size={size} />;
  }
  if (normalized.includes('tapiss') || normalized.includes('rembourr') || normalized.includes('salon')) {
    return <Armchair className={className} size={size} />;
  }
  if (normalized.includes('blanch') || normalized.includes('press') || normalized.includes('lav')) {
    return <Shirt className={className} size={size} />;
  }
  if (normalized.includes('comm') || normalized.includes('quinc')) {
    return <ShoppingBag className={className} size={size} />;
  }
  if (normalized === 'autre' || normalized.includes('autre')) {
    return <PlusCircle className={className} size={size} />;
  }

  return <HelpCircle className={className} size={size} />;
};
