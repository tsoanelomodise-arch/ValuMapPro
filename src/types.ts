export type PropertyType = 'Residential' | 'Commercial' | 'Industrial' | 'Vacant Land';

export interface Property {
  id: string;
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
    bedrooms: number;
    bathrooms: number;
    garages: number;
    carports: number;
    floorSize: number;
    standSize: number;
    titleType: 'Sectional title' | 'Full title';
    floor?: string;
  };
  financials: {
    purchasePrice: number;
    marketValue: number;
    expectedGrowth: number;
    bondAmount: number;
    deposit: number;
    interestRate: number;
    termYears: number;
    income: number;
    expenses: number;
  };
}

export interface MarkerColor {
  type: PropertyType;
  color: string;
}

export const PROPERTY_TYPE_COLORS: Record<PropertyType, string> = {
  'Residential': '#3b82f6', // blue
  'Commercial': '#ef4444', // red
  'Industrial': '#10b981', // green
  'Vacant Land': '#f59e0b', // amber
};
