export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: 'coupe' | 'barbe' | 'soin' | 'combo';
}

export const services: Service[] = [
  // Coupes
  {
    id: '1',
    name: 'Coupe Classique',
    price: 25.00,
    duration: 30,
    category: 'coupe'
  },
  {
    id: '2',
    name: 'Coupe + Styling',
    price: 35.00,
    duration: 45,
    category: 'coupe'
  },
  {
    id: '3',
    name: 'Coupe Enfant',
    price: 20.00,
    duration: 25,
    category: 'coupe'
  },
  
  // Barbe
  {
    id: '4',
    name: 'Taille de Barbe',
    price: 15.00,
    duration: 20,
    category: 'barbe'
  },
  {
    id: '5',
    name: 'Rasage Traditionnel',
    price: 25.00,
    duration: 30,
    category: 'barbe'
  },
  {
    id: '6',
    name: 'Barbe + Moustache',
    price: 20.00,
    duration: 25,
    category: 'barbe'
  },
  
  // Soins
  {
    id: '7',
    name: 'Shampooing',
    price: 8.00,
    duration: 10,
    category: 'soin'
  },
  {
    id: '8',
    name: 'Soin du Cuir Chevelu',
    price: 18.00,
    duration: 20,
    category: 'soin'
  },
  
  // Combos
  {
    id: '9',
    name: 'Coupe + Barbe',
    price: 40.00,
    duration: 50,
    category: 'combo'
  },
  {
    id: '10',
    name: 'Service Complet',
    price: 55.00,
    duration: 70,
    category: 'combo'
  }
];

export const getServicesByCategory = (category: Service['category']) => {
  return services.filter(service => service.category === category);
};

export const getAllCategories = () => {
  return ['coupe', 'barbe', 'soin', 'combo'] as const;
};