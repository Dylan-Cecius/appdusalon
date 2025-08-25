import { Service } from './services';

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  services: Service[];
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  totalPrice: number;
  notes?: string;
  isPaid: boolean;
  barberId?: string; // ID du coiffeur assigné
}

// Mock appointments for demonstration
export const mockAppointments: Appointment[] = [
  {
    id: '1',
    clientName: 'Jean Dupont',
    clientPhone: '0123456789',
    services: [
      {
        id: '1',
        name: 'Coupe Homme',
        price: 18.00,
        duration: 30,
        category: 'coupe',
        appointmentBuffer: 10
      }
    ],
    startTime: new Date(new Date().setHours(10, 0, 0, 0)),
    endTime: new Date(new Date().setHours(10, 30, 0, 0)),
    status: 'scheduled',
    totalPrice: 18.00,
    isPaid: false,
    barberId: '1'
  },
  {
    id: '2',
    clientName: 'Pierre Martin',
    clientPhone: '0987654321',
    services: [
      {
        id: '5',
        name: 'Coupe + Barbe',
        price: 23.00,
        duration: 40,
        category: 'combo',
        appointmentBuffer: 15
      }
    ],
    startTime: new Date(new Date().setHours(14, 0, 0, 0)),
    endTime: new Date(new Date().setHours(14, 40, 0, 0)),
    status: 'scheduled',
    totalPrice: 23.00,
    isPaid: false,
    barberId: '2'
  }
];

export const getAppointmentsForDate = (date: Date): Appointment[] => {
  return mockAppointments.filter(apt => 
    apt.startTime.toDateString() === date.toDateString()
  );
};

export const calculateAppointmentDuration = (services: Service[]): number => {
  return services.reduce((total, service) => total + service.duration + (service.appointmentBuffer || 0), 0);
};