import { Property } from "../types";

export const mockProperties: Property[] = [
  {
    id: '1',
    name: 'HEADINGLEY',
    type: 'Residential',
    address: {
      street: '1 Jacobs Avenue',
      suburb: 'Fairway',
      city: 'Johannesburg',
      country: 'South Africa'
    },
    coordinates: [-26.1311, 28.0536],
    specs: {
      bedrooms: 3,
      bathrooms: 2,
      garages: 1,
      carports: 1,
      floorSize: 143,
      standSize: 0,
      titleType: 'Sectional title',
      floor: '3rd'
    },
    financials: {
      purchasePrice: 1000000,
      marketValue: 1476300,
      expectedGrowth: 5,
      bondAmount: 1000000,
      deposit: 200000,
      interestRate: 11.1,
      termYears: 30,
      income: 13000,
      expenses: 7578
    }
  },
  {
    id: '2',
    name: 'ROSEBANK HUB',
    type: 'Commercial',
    address: {
      street: '50 Bath Ave',
      suburb: 'Rosebank',
      city: 'Johannesburg',
      country: 'South Africa'
    },
    coordinates: [-26.1455, 28.0435],
    specs: {
      bedrooms: 0,
      bathrooms: 4,
      garages: 20,
      carports: 5,
      floorSize: 450,
      standSize: 800,
      titleType: 'Full title'
    },
    financials: {
      purchasePrice: 5500000,
      marketValue: 6200000,
      expectedGrowth: 7,
      bondAmount: 4000000,
      deposit: 1500000,
      interestRate: 10.5,
      termYears: 20,
      income: 65000,
      expenses: 22000
    }
  },
  {
    id: '3',
    name: 'WYNBERG LOGISTICS',
    type: 'Industrial',
    address: {
      street: '12 Arkwright Ave',
      suburb: 'Wynberg',
      city: 'Johannesburg',
      country: 'South Africa'
    },
    coordinates: [-26.1082, 28.0831],
    specs: {
      bedrooms: 0,
      bathrooms: 2,
      garages: 2,
      carports: 2,
      floorSize: 1200,
      standSize: 2500,
      titleType: 'Full title'
    },
    financials: {
      purchasePrice: 8200000,
      marketValue: 9000000,
      expectedGrowth: 4,
      bondAmount: 6000000,
      deposit: 2200000,
      interestRate: 9.8,
      termYears: 15,
      income: 110000,
      expenses: 35000
    }
  },
  {
    id: '4',
    name: 'SANDTON MEWS',
    type: 'Residential',
    address: {
      street: '14 Alice Lane',
      suburb: 'Sandown',
      city: 'Sandton',
      country: 'South Africa'
    },
    coordinates: [-26.1070, 28.0567],
    specs: {
      bedrooms: 2,
      bathrooms: 2,
      garages: 2,
      carports: 0,
      floorSize: 110,
      standSize: 0,
      titleType: 'Sectional title',
      floor: '1st'
    },
    financials: {
      purchasePrice: 2800000,
      marketValue: 3100000,
      expectedGrowth: 6,
      bondAmount: 2000000,
      deposit: 800000,
      interestRate: 11.1,
      termYears: 25,
      income: 22000,
      expenses: 12000
    }
  }
];
