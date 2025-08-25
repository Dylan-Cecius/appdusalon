export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: 'coupe' | 'barbe' | 'combo' | 'produit';
  appointmentBuffer?: number; // Délai en minutes après le RDV (optionnel)
}

export const services: Service[] = [
  // Coupes
  {
    id: '1',
    name: 'Coupe Homme',
    price: 18.00,
    duration: 30,
    category: 'coupe',
    appointmentBuffer: 10
  },
  {
    id: '2',
    name: 'Coupe Enfant',
    price: 16.00,
    duration: 25,
    category: 'coupe',
    appointmentBuffer: 5
  },
  
  // Barbe
  {
    id: '3',
    name: 'Barbe',
    price: 10.00,
    duration: 15,
    category: 'barbe',
    appointmentBuffer: 5
  },
  {
    id: '4',
    name: 'Barbe à l\'Ancienne',
    price: 15.00,
    duration: 25,
    category: 'barbe',
    appointmentBuffer: 10
  },
  
  // Combos Services
  {
    id: '5',
    name: 'Coupe + Barbe',
    price: 23.00,
    duration: 40,
    category: 'combo',
    appointmentBuffer: 15
  },
  {
    id: '6',
    name: 'Coupe + Barbe à l\'Ancienne',
    price: 28.00,
    duration: 50,
    category: 'combo',
    appointmentBuffer: 15
  },
  {
    id: '7',
    name: 'Double Ancienne',
    price: 32.00,
    duration: 60,
    category: 'combo',
    appointmentBuffer: 20
  },
  
  // Produits
  {
    id: '8',
    name: 'Cire Coiffante',
    price: 7.00,
    duration: 2,
    category: 'produit'
  },
  {
    id: '9',
    name: 'Peigne Coiffant',
    price: 10.00,
    duration: 2,
    category: 'produit'
  },
  {
    id: '10',
    name: 'Huile de Barbe',
    price: 12.00,
    duration: 2,
    category: 'produit'
  },
  {
    id: '11',
    name: 'After Shave',
    price: 10.00,
    duration: 2,
    category: 'produit'
  }
];

export const getServicesByCategory = (category: Service['category']) => {
  return services.filter(service => service.category === category);
};

export const getAllCategories = () => {
  return ['coupe', 'barbe', 'combo', 'produit'] as const;
};