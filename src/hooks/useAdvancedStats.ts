import { useMemo } from 'react';
import { useSupabaseAppointments } from './useSupabaseAppointments';
import { useSupabaseServices } from './useSupabaseServices';
import { useSupabaseTransactions } from './useSupabaseTransactions';
import { useSupabaseLunchBreaks } from './useSupabaseLunchBreaks';
import { useSupabaseCustomBlocks } from './useSupabaseCustomBlocks';
import { useSupabaseSettings } from './useSupabaseSettings';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, format, parseISO, getHours, addDays, isSameDay, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ClientRetentionData {
  period: string;
  newClients: number;
  returningClients: number;
  retentionRate: number;
}

export interface BarberPerformanceData {
  barberName: string;
  employeeId: string | null;
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
  const { lunchBreaks, isLunchBreakTime } = useSupabaseLunchBreaks();
  const { customBlocks } = useSupabaseCustomBlocks();
  const { barbers } = useSupabaseSettings();

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
    // Créer un map des coiffeurs depuis la base de données barbers avec leur nom réel
    const barberNameMap = new Map<string, string>();
    barbers.forEach(barber => {
      if (barber.id && barber.name) {
        barberNameMap.set(barber.id, barber.name);
      }
    });

    const barberMap = new Map<string, {
      appointmentCount: number;
      revenue: number;
      totalDuration: number;
      realName: string;
      employeeId: string | null;
    }>();

    // Traiter les rendez-vous - utiliser l'ID comme clé
    appointments.forEach(appointment => {
      const barberId = appointment.barberId || 'non-assigne';
      const barberName = barberNameMap.get(barberId) || appointment.barberId || 'Non assigné';
      
      const existing = barberMap.get(barberId) || {
        appointmentCount: 0,
        revenue: 0,
        totalDuration: 0,
        realName: barberName,
        employeeId: barberId !== 'non-assigne' ? barberId : null
      };

      const duration = appointment.endTime.getTime() - appointment.startTime.getTime();
      const revenue = appointment.isPaid ? Number(appointment.totalPrice) : 0;

      barberMap.set(barberId, {
        appointmentCount: existing.appointmentCount + 1,
        revenue: existing.revenue + revenue,
        totalDuration: existing.totalDuration + duration,
        realName: barberName,
        employeeId: existing.employeeId
      });
    });

    // Traiter les transactions - essayer de les associer aux bons coiffeurs
    transactions.forEach(transaction => {
      if (transaction.items && Array.isArray(transaction.items)) {
        transaction.items.forEach((item: any) => {
          let barberId = item.barberId;
          
          // Si pas de barberId dans l'item, essayer de deviner depuis le contexte
          if (!barberId && transaction.items.length === 1) {
            // Si une seule prestation, associer au coiffeur principal actif
            const activeBarbers = Array.from(barberMap.keys()).filter(id => id !== 'non-assigne');
            if (activeBarbers.length === 1) {
              barberId = activeBarbers[0];
            }
          }
          
          barberId = barberId || 'non-assigne';
          const barberName = barberNameMap.get(barberId) || 'Non assigné';
          
          const existing = barberMap.get(barberId) || {
            appointmentCount: 0,
            revenue: 0,
            totalDuration: 0,
            realName: barberName,
            employeeId: barberId !== 'non-assigne' ? barberId : null
          };

          // Calculer la part de revenus de cet item dans la transaction
          const itemRevenue = (item.price || 0) * (item.quantity || 1);
          
          barberMap.set(barberId, {
            ...existing,
            revenue: existing.revenue + itemRevenue,
            realName: barberName
          });
        });
      } else {
        // Transaction sans items détaillés - associer au coiffeur principal si possible
        const activeBarbers = Array.from(barberMap.keys()).filter(id => id !== 'non-assigne');
        const barberId = activeBarbers.length === 1 ? activeBarbers[0] : 'non-assigne';
        const barberName = barberNameMap.get(barberId) || 'Non assigné';
        
        const existing = barberMap.get(barberId) || {
          appointmentCount: 0,
          revenue: 0,
          totalDuration: 0,
          realName: barberName,
          employeeId: barberId !== 'non-assigne' ? barberId : null
        };

        barberMap.set(barberId, {
          ...existing,
          revenue: existing.revenue + Number(transaction.totalAmount),
          realName: barberName
        });
      }
    });

    return Array.from(barberMap.entries())
      .map(([barberId, data]) => ({
        barberName: data.realName,
        employeeId: data.employeeId,
        appointmentCount: data.appointmentCount,
        revenue: data.revenue,
        averageServiceTime: data.appointmentCount > 0 ? data.totalDuration / (data.appointmentCount * 60000) : 0, // en minutes
        clientSatisfaction: 85 + Math.random() * 15 // Simulation pour l'instant
      }))
      .filter(barber => 
        (barber.appointmentCount > 0 || barber.revenue > 0) && 
        barber.barberName !== 'Non assigné' // Filtrer "non assigné"
      )
      .sort((a, b) => b.revenue - a.revenue);
  }, [appointments, transactions, barbers]);

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

    // Utiliser les données des transactions pour les revenus réels des services uniquement
    transactions.forEach(transaction => {
      if (transaction.items && Array.isArray(transaction.items)) {
        transaction.items.forEach((item: any) => {
          // Filtrer seulement les services/prestations (pas les produits)
          if (item.category !== 'product' && item.type !== 'product') {
            const serviceName = item.name || 'Service inconnu';
            const existing = serviceMap.get(serviceName) || { count: 0, revenue: 0 };
            
            // Calculer la part de revenus de cet item dans la transaction
            const itemRevenue = (item.price || 0) * (item.quantity || 1);
            
            serviceMap.set(serviceName, {
              count: existing.count + (item.quantity || 1),
              revenue: existing.revenue + itemRevenue
            });
          }
        });
      }
    });

    // Si pas de transactions avec items détaillés, fallback sur appointments (services seulement)
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
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][getDay(date)];
      
      // Calculer les créneaux disponibles réels pour ce jour
      let totalAvailableSlots = 0;
      
      // Pour chaque coiffeur actif qui travaille ce jour
      const activeBarbers = barbers.filter(barber => 
        barber.is_active && 
        barber.working_days && 
        barber.working_days.includes(dayName)
      );
      
      activeBarbers.forEach(barber => {
        // Calculer les créneaux de 15 minutes entre start_time et end_time
        const [startHour, startMinute] = barber.start_time.split(':').map(Number);
        const [endHour, endMinute] = barber.end_time.split(':').map(Number);
        
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;
        const totalMinutes = endTime - startTime;
        let availableSlots = Math.floor(totalMinutes / 15); // Créneaux de 15 min
        
        // Soustraire les créneaux de pause déjeuner
        const lunchBreak = lunchBreaks.find(lb => 
          lb.barberId === barber.id && lb.isActive
        );
        
        if (lunchBreak) {
          const [lunchStartHour, lunchStartMinute] = lunchBreak.startTime.split(':').map(Number);
          const [lunchEndHour, lunchEndMinute] = lunchBreak.endTime.split(':').map(Number);
          
          const lunchStartTime = lunchStartHour * 60 + lunchStartMinute;
          const lunchEndTime = lunchEndHour * 60 + lunchEndMinute;
          
          // Si la pause déjeuner est dans les heures de travail
          if (lunchStartTime >= startTime && lunchEndTime <= endTime) {
            const lunchDuration = lunchEndTime - lunchStartTime;
            availableSlots -= Math.floor(lunchDuration / 15);
          }
        }
        
        // Soustraire les créneaux bloqués personnalisés valides uniquement
        const dayBlocks = customBlocks.filter(block => 
          block.barberId === barber.id &&
          isSameDay(block.blockDate, date) &&
          block.type === 'unavailable' &&
          block.startTime && 
          block.endTime &&
          block.startTime !== '' && 
          block.endTime !== '' &&
          !isNaN(parseInt(block.startTime.split(':')[0])) &&
          !isNaN(parseInt(block.endTime.split(':')[0]))
        );
        
        dayBlocks.forEach(block => {
          const [blockStartHour, blockStartMinute] = block.startTime.split(':').map(Number);
          const [blockEndHour, blockEndMinute] = block.endTime.split(':').map(Number);
          
          const blockStartTime = blockStartHour * 60 + blockStartMinute;
          const blockEndTime = blockEndHour * 60 + blockEndMinute;
          
          // Si le bloc est dans les heures de travail
          if (blockStartTime >= startTime && blockEndTime <= endTime) {
            const blockDuration = blockEndTime - blockStartTime;
            availableSlots -= Math.floor(blockDuration / 15);
          }
        });
        
        totalAvailableSlots += Math.max(0, availableSlots);
      });
      
      // Compter les rendez-vous réels pour ce jour
      const dayAppointments = appointments.filter(apt => 
        isSameDay(apt.startTime, date)
      );
      
      // Compter les transactions (encaissements) pour ce jour
      const dayTransactions = transactions.filter(tx => 
        isSameDay(new Date(tx.transactionDate), date)
      );
      
      // Calculer les créneaux occupés (rendez-vous + transactions)
      let bookedSlots = 0;
      
      // Créneaux des rendez-vous (en considérant la durée réelle)
      dayAppointments.forEach(apt => {
        const duration = apt.endTime.getTime() - apt.startTime.getTime();
        const durationInMinutes = Math.ceil(duration / (1000 * 60));
        bookedSlots += Math.ceil(durationInMinutes / 15); // Arrondir au créneau de 15min supérieur
      });
      
      // Créneaux des transactions (estimer 30min par transaction en moyenne)
      dayTransactions.forEach(tx => {
        // Estimer la durée selon le nombre d'items/services
        let estimatedDuration = 30; // 30min par défaut
        
        if (tx.items && Array.isArray(tx.items)) {
          // Calculer la durée selon les services dans la transaction
          const serviceCount = tx.items.filter((item: any) => 
            item.category !== 'product' && item.type !== 'product'
          ).length;
          estimatedDuration = Math.max(15, serviceCount * 20); // 20min par service, minimum 15min
        }
        
        bookedSlots += Math.ceil(estimatedDuration / 15); // Convertir en créneaux de 15min
      });
      
      // Fallback si pas de coiffeurs configurés
      if (totalAvailableSlots === 0) {
        totalAvailableSlots = 36; // 9h * 4 créneaux/heure comme avant
        bookedSlots = dayAppointments.length + dayTransactions.length;
      }
      
      const occupancyRate = totalAvailableSlots > 0 ? (bookedSlots / totalAvailableSlots) * 100 : 0;

      return {
        date: format(date, 'dd/MM', { locale: fr }),
        occupancyRate: Math.min(occupancyRate, 100), // Cap à 100%
        totalSlots: totalAvailableSlots,
        bookedSlots
      };
    });
  }, [appointments, barbers, lunchBreaks, customBlocks, transactions]);

  return {
    clientRetentionStats,
    barberPerformanceStats,
    peakHoursStats,
    cancellationStats,
    serviceProfitabilityStats,
    occupancyStats
  };
};