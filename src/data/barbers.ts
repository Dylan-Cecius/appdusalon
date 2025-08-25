export interface Barber {
  id: string;
  name: string;
  startTime: string; // Format: "10:00"
  endTime: string;   // Format: "19:00"
  isActive: boolean;
  color: string;     // Couleur pour identifier le coiffeur
}

export const defaultBarbers: Barber[] = [
  {
    id: '1',
    name: 'Alex',
    startTime: '10:00',
    endTime: '19:00',
    isActive: true,
    color: 'bg-blue-600'
  },
  {
    id: '2',
    name: 'Marie',
    startTime: '10:00',
    endTime: '17:00',
    isActive: true,
    color: 'bg-purple-600'
  },
  {
    id: '3',
    name: 'Thomas',
    startTime: '12:00',
    endTime: '19:00',
    isActive: true,
    color: 'bg-green-600'
  }
];

export const getActiveBarbers = (barbers: Barber[]) => {
  return barbers.filter(barber => barber.isActive);
};

export const getBarberById = (barbers: Barber[], id: string) => {
  return barbers.find(barber => barber.id === id);
};