import { useMemo } from 'react';
import { useSupabaseAppointments } from './useSupabaseAppointments';
import { useSupabaseServices } from './useSupabaseServices';
import { useSupabaseTransactions } from './useSupabaseTransactions';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, format, parseISO, getHours, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ClientLoyaltyData {
  clientName: string;
  appointmentCount: number;
  totalSpent: number;
  lastVisit: Date;
  averageSpending: number;
}

export interface ClientRetentionData {
  period: string;
  newClients: number;
  returningClients: number;
  retentionRate: number;
}

export interface BarberPerformanceData {
  barberName: string;
  appointmentCount: number;
  revenue: number;
  averageServiceTime: number;
  clientSatisfaction: number;
}

export interface PeakHoursData {
  hour: string;
  appointmentCount: number;
  revenue: number;
}

export interface CancellationData {
  period: string;
  totalAppointments: number;
  cancelledAppointments: number;
  cancellationRate: number;
}

export interface ServiceProfitabilityData {
  serviceName: string;
  appointmentCount: number;
  revenue: number;
  averagePrice: number;
  profitMargin: number;
}

export interface OccupancyData {
  date: string;
  occupancyRate: number;
  totalSlots: number;
  bookedSlots: number;
}

export const useAdvancedStats = () => {
  const { appointments } = useSupabaseAppointments();
  const { services } = useSupabaseServices();
  const { transactions } = useSupabaseTransactions();

  const clientLoyaltyStats = useMemo((): ClientLoyaltyData[] => {
    const clientMap = new Map<string, {
      appointmentCount: number;
      totalSpent: number;
      lastVisit: Date;
    }>();

    // Utiliser les transactions pour les données financières réelles
    transactions.forEach(transaction => {
      if (transaction.items && Array.isArray(transaction.items)) {
        transaction.items.forEach((item: any) => {
          if (item.clientName && item.clientPhone) {
            const clientKey = `${item.clientName}-${item.clientPhone}`;
            const existing = clientMap.get(clientKey) || {
              appointmentCount: 0,
              totalSpent: 0,
              lastVisit: new Date(0)
            };

            const transactionDate = new Date(transaction.transactionDate);

            clientMap.set(clientKey, {
              appointmentCount: existing.appointmentCount + 1,
              totalSpent: existing.totalSpent + Number(transaction.totalAmount),
              lastVisit: transactionDate > existing.lastVisit 
                ? transactionDate 
                : existing.lastVisit
            });
          }
        });
      }
    });

    // Si pas de données de transactions avec clients, fallback sur appointments
    if (clientMap.size === 0) {
      appointments.forEach(appointment => {
        const clientKey = `${appointment.clientName}-${appointment.clientPhone}`;
        const existing = clientMap.get(clientKey) || {
          appointmentCount: 0,
          totalSpent: 0,
          lastVisit: new Date(0)
        };

        clientMap.set(clientKey, {
          appointmentCount: existing.appointmentCount + 1,
          totalSpent: existing.totalSpent + Number(appointment.totalPrice),
          lastVisit: appointment.startTime > existing.lastVisit 
            ? appointment.startTime 
            : existing.lastVisit
        });
      });
    }

    return Array.from(clientMap.entries())
      .map(([clientName, data]) => ({
        clientName: clientName.split('-')[0],
        appointmentCount: data.appointmentCount,
        totalSpent: data.totalSpent,
        lastVisit: data.lastVisit,
        averageSpending: data.totalSpent / data.appointmentCount
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  }, [appointments, transactions]);

  const clientRetentionStats = useMemo((): ClientRetentionData[] => {
    const now = new Date();
    const periods = [
      { name: 'Cette semaine', start: startOfWeek(now, { locale: fr }), end: endOfWeek(now, { locale: fr }) },
      { name: 'Ce mois', start: startOfMonth(now), end: endOfMonth(now) },
      { name: 'Mois dernier', start: startOfMonth(addDays(now, -30)), end: endOfMonth(addDays(now, -30)) }
    ];

    return periods.map(period => {
      const periodAppointments = appointments.filter(apt => {
        return apt.startTime >= period.start && apt.startTime <= period.end;
      });

      const clients = new Set<string>();
      const newClients = new Set<string>();

      periodAppointments.forEach(apt => {
        const clientKey = `${apt.clientName}-${apt.clientPhone}`;
        clients.add(clientKey);

        // Check if this is the client's first appointment
        const firstAppointment = appointments
          .filter(a => `${a.clientName}-${a.clientPhone}` === clientKey)
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];

        if (firstAppointment && firstAppointment.startTime >= period.start) {
          newClients.add(clientKey);
        }
      });

      const returningClients = clients.size - newClients.size;
      const retentionRate = clients.size > 0 ? (returningClients / clients.size) * 100 : 0;

      return {
        period: period.name,
        newClients: newClients.size,
        returningClients,
        retentionRate
      };
    });
  }, [appointments]);

  const barberPerformanceStats = useMemo((): BarberPerformanceData[] => {
    const barberMap = new Map<string, {
      appointmentCount: number;
      revenue: number;
      totalDuration: number;
    }>();

    // Combiner données d'appointments et de transactions
    const appointmentsByBarber = new Map<string, typeof appointments>();
    appointments.forEach(appointment => {
      const barberName = appointment.barberId || 'Non assigné';
      if (!appointmentsByBarber.has(barberName)) {
        appointmentsByBarber.set(barberName, []);
      }
      appointmentsByBarber.get(barberName)!.push(appointment);
    });

    // Calculer les revenus depuis les transactions
    const revenueByBarber = new Map<string, number>();
    transactions.forEach(transaction => {
      if (transaction.items && Array.isArray(transaction.items)) {
        transaction.items.forEach((item: any) => {
          const barberName = item.barberId || 'Non assigné';
          const existing = revenueByBarber.get(barberName) || 0;
          revenueByBarber.set(barberName, existing + (Number(transaction.totalAmount) / transaction.items.length));
        });
      }
    });

    // Si pas de données de transactions avec barbers, utiliser les appointments
    if (revenueByBarber.size === 0) {
      appointments.forEach(appointment => {
        const barberName = appointment.barberId || 'Non assigné';
        const existing = revenueByBarber.get(barberName) || 0;
        revenueByBarber.set(barberName, existing + Number(appointment.totalPrice));
      });
    }

    // Fusionner les données
    const allBarbers = new Set([...appointmentsByBarber.keys(), ...revenueByBarber.keys()]);
    
    Array.from(allBarbers).forEach(barberName => {
      const barberAppointments = appointmentsByBarber.get(barberName) || [];
      const revenue = revenueByBarber.get(barberName) || 0;
      
      const totalDuration = barberAppointments.reduce((sum, apt) => 
        sum + (apt.endTime.getTime() - apt.startTime.getTime()), 0
      );

      barberMap.set(barberName, {
        appointmentCount: barberAppointments.length,
        revenue,
        totalDuration
      });
    });

    return Array.from(barberMap.entries()).map(([barberName, data]) => ({
      barberName,
      appointmentCount: data.appointmentCount,
      revenue: data.revenue,
      averageServiceTime: data.appointmentCount > 0 ? data.totalDuration / (data.appointmentCount * 60000) : 0, // en minutes
      clientSatisfaction: 85 + Math.random() * 15 // Simulation pour l'instant
    }));
  }, [appointments, transactions]);

  const peakHoursStats = useMemo((): PeakHoursData[] => {
    const hourMap = new Map<number, { count: number; revenue: number }>();

    // Utiliser les transactions pour les revenus réels
    transactions.forEach(transaction => {
      const hour = getHours(new Date(transaction.transactionDate));
      const existing = hourMap.get(hour) || { count: 0, revenue: 0 };
      
      hourMap.set(hour, {
        count: existing.count + 1,
        revenue: existing.revenue + Number(transaction.totalAmount)
      });
    });

    // Si pas de transactions, fallback sur appointments
    if (hourMap.size === 0) {
      appointments.forEach(appointment => {
        const hour = getHours(appointment.startTime);
        const existing = hourMap.get(hour) || { count: 0, revenue: 0 };
        
        hourMap.set(hour, {
          count: existing.count + 1,
          revenue: existing.revenue + Number(appointment.totalPrice)
        });
      });
    }

    return Array.from(hourMap.entries())
      .map(([hour, data]) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        appointmentCount: data.count,
        revenue: data.revenue
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [appointments, transactions]);

  const cancellationStats = useMemo((): CancellationData[] => {
    const now = new Date();
    const periods = [
      { name: 'Cette semaine', start: startOfWeek(now, { locale: fr }), end: endOfWeek(now, { locale: fr }) },
      { name: 'Ce mois', start: startOfMonth(now), end: endOfMonth(now) },
      { name: 'Mois dernier', start: startOfMonth(addDays(now, -30)), end: endOfMonth(addDays(now, -30)) }
    ];

    return periods.map(period => {
      const periodAppointments = appointments.filter(apt => {
        return apt.startTime >= period.start && apt.startTime <= period.end;
      });

      const totalAppointments = periodAppointments.length;
      const cancelledAppointments = periodAppointments.filter(apt => apt.status === 'cancelled').length;
      const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0;

      return {
        period: period.name,
        totalAppointments,
        cancelledAppointments,
        cancellationRate
      };
    });
  }, [appointments]);

  const serviceProfitabilityStats = useMemo((): ServiceProfitabilityData[] => {
    const serviceMap = new Map<string, { count: number; revenue: number }>();

    // Utiliser les données des transactions pour les revenus réels
    transactions.forEach(transaction => {
      if (transaction.items && Array.isArray(transaction.items)) {
        transaction.items.forEach((item: any) => {
          const serviceName = item.name || 'Service inconnu';
          const existing = serviceMap.get(serviceName) || { count: 0, revenue: 0 };
          
          // Calculer la part de revenus de cet item dans la transaction
          const itemRevenue = (item.price || 0) * (item.quantity || 1);
          
          serviceMap.set(serviceName, {
            count: existing.count + (item.quantity || 1),
            revenue: existing.revenue + itemRevenue
          });
        });
      }
    });

    // Si pas de transactions avec items détaillés, fallback sur appointments
    if (serviceMap.size === 0) {
      appointments.forEach(appointment => {
        if (appointment.services && Array.isArray(appointment.services)) {
          appointment.services.forEach((service: any) => {
            const serviceName = service.name || 'Service inconnu';
            const existing = serviceMap.get(serviceName) || { count: 0, revenue: 0 };
            
            serviceMap.set(serviceName, {
              count: existing.count + 1,
              revenue: existing.revenue + Number(service.price || 0)
            });
          });
        }
      });
    }

    return Array.from(serviceMap.entries())
      .map(([serviceName, data]) => ({
        serviceName,
        appointmentCount: data.count,
        revenue: data.revenue,
        averagePrice: data.count > 0 ? data.revenue / data.count : 0,
        profitMargin: 60 + Math.random() * 30 // Simulation pour l'instant - pourrait être calculé depuis les coûts réels
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [appointments, services, transactions]);

  const occupancyStats = useMemo((): OccupancyData[] => {
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(now, -6 + i);
      return startOfDay(date);
    });

    return last7Days.map(date => {
      const dayAppointments = appointments.filter(apt => 
        isSameDay(apt.startTime, date)
      );

      // Simulation de créneaux disponibles (10h-19h = 9h * 4 créneaux/heure = 36 créneaux par jour)
      const totalSlots = 36;
      const bookedSlots = dayAppointments.length;
      const occupancyRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

      return {
        date: format(date, 'dd/MM', { locale: fr }),
        occupancyRate,
        totalSlots,
        bookedSlots
      };
    });
  }, [appointments]);

  return {
    clientLoyaltyStats,
    clientRetentionStats,
    barberPerformanceStats,
    peakHoursStats,
    cancellationStats,
    serviceProfitabilityStats,
    occupancyStats
  };
};