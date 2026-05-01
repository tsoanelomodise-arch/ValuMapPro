export type PropertyType = 'Residential' | 'Commercial' | 'Industrial' | 'Agricultural';

export interface Property {
  id: string;
  listingNumber?: string;
  p24Url?: string;
  agent?: string;
  agentPhone?: string;
  description?: string;
  googleMapsUrl?: string;
  name: string;
  type: PropertyType;
  address: {
    street: string;
    suburb: string;
    city: string;
    country: string;
  };
  coordinates: [number, number];
  specs: {
    standSize: number;
    titleType: 'Sectional title' | 'Full title';
    floor?: string;
  };
  financials: {
    purchasePrice: number;
    marketValue: number;
    bondAmount: number;
    deposit: number;
    interestRate: number;
    termYears: number;
  };
  images?: string[];
}

export interface MarkerColor {
  type: PropertyType;
  color: string;
}

export const PROPERTY_TYPE_COLORS: Record<PropertyType, string> = {
  'Residential': '#3b82f6', // blue
  'Commercial': '#ef4444', // red
  'Industrial': '#10b981', // green
  'Agricultural': '#854d0e', // brown/olive
};

export interface Substation {
  id: string;
  name: string;
  address: string;
  coordinates: [number, number];
  googleMapsUrl?: string;
  capacity?: string;
  status: 'Active' | 'Under Maintenance' | 'Planned';
  mvaCapacity?: number;
  voltageKV?: number;
  availableAmps?: number;
}

export const SUBSTATION_COLOR = '#8b5cf6'; // Violet
