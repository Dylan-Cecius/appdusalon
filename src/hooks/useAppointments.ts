import { useState } from 'react';
import { Appointment, mockAppointments } from '@/data/appointments';

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);

  const addAppointment = (appointment: Omit<Appointment, 'id'>) => {
    const newAppointment: Appointment = {
      ...appointment,
      id: Date.now().toString()
    };
    setAppointments(prev => [...prev, newAppointment]);
    return newAppointment;
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments(prev => 
      prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt)
    );
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(apt => apt.id !== id));
  };

  const markAsPaid = (id: string) => {
    updateAppointment(id, { isPaid: true, status: 'completed' });
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => 
      apt.startTime.toDateString() === date.toDateString()
    );
  };

  return {
    appointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    markAsPaid,
    getAppointmentsForDate
  };
};