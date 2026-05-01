import { Property } from "../types";

export const mockProperties: Property[] = [
  {
    id: '1',
    listingNumber: '112233445',
    p24Url: 'https://www.property24.com/for-sale/sea-point/cape-town/western-cape/112233445',
    googleMapsUrl: 'https://goo.gl/maps/1 Jacobs Avenue',
    agent: 'Pam Golding Properties',
    agentPhone: '011 234 5678',
    description: 'Stunning luxury apartment with panoramic ocean views in the heart of Sea Point. Features high-end finishes and spacious balcony.',
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
      standSize: 0,
      titleType: 'Sectional title',
      floor: '3rd'
    },
    financials: {
      purchasePrice: 1000000,
      marketValue: 1476300,
      bondAmount: 1000000,
      deposit: 200000,
      interestRate: 11.1,
      termYears: 30
    },
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600607687940-4e2a09695d51?fit=crop&w=800&q=80'
    ]
  },
  {
    id: '2',
    listingNumber: '223344556',
    p24Url: 'https://www.property24.com/for-sale/rosebank/johannesburg/gauteng/223344556',
    googleMapsUrl: 'https://goo.gl/maps/50 Bath Ave',
    agent: 'Savills Commercial',
    agentPhone: '011 345 6789',
    description: 'Premier office space in the heart of Rosebank. High foot traffic area with modern facilities and green building certification.',
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
      standSize: 800,
      titleType: 'Full title'
    },
    financials: {
      purchasePrice: 5500000,
      marketValue: 6200000,
      bondAmount: 4000000,
      deposit: 1500000,
      interestRate: 10.5,
      termYears: 20
    },
    images: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?fit=crop&w=800&q=80'
    ]
  },
  {
    id: '3',
    listingNumber: '334455667',
    p24Url: 'https://www.property24.com/for-sale/wynberg/johannesburg/gauteng/334455667',
    googleMapsUrl: 'https://goo.gl/maps/12 Arkwright Ave',
    agent: 'Broll Property Group',
    agentPhone: '011 456 7890',
    description: 'Large distribution warehouse with high eaves, multiple roller shutter doors, and excellent access to the M1 highway.',
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
      standSize: 2500,
      titleType: 'Full title'
    },
    financials: {
      purchasePrice: 8200000,
      marketValue: 9000000,
      bondAmount: 6000000,
      deposit: 2200000,
      interestRate: 9.8,
      termYears: 15
    },
    images: [
      'https://images.unsplash.com/photo-1553413077-190dd305871c?fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1586528116311-ad86d7c49b82?fit=crop&w=800&q=80'
    ]
  },
  {
    id: '4',
    listingNumber: '445566778',
    p24Url: 'https://www.property24.com/for-sale/sandown/sandton/gauteng/445566778',
    googleMapsUrl: 'https://goo.gl/maps/14 Alice Lane',
    agent: 'RE/MAX Masters',
    agentPhone: '011 567 8901',
    description: 'Designer sectional title apartment in a secure complex. Modern kitchen, spacious bedrooms, and prime location near Alice Lane.',
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
      standSize: 0,
      titleType: 'Sectional title',
      floor: '1st'
    },
    financials: {
      purchasePrice: 2800000,
      marketValue: 3100000,
      bondAmount: 2000000,
      deposit: 800000,
      interestRate: 11.1,
      termYears: 25
    },
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?fit=crop&w=800&q=80'
    ]
  }
];
