import { useMemo } from 'react';
import { useSupabaseAppointments } from './useSupabaseAppointments';
import { useSupabaseServices } from './useSupabaseServices';
import { useSupabaseTransactions } from './useSupabaseTransactions';
import { useStaff } from './useStaff';
import { useOpeningHours } from './useOpeningHours';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  format,
  getHours,
  addDays,
  isSameDay,
  getDay,
} from 'date-fns';
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
}

export interface OccupancyData {
  date: string;
  occupancyRate: number;
  totalSlots: number;
  bookedSlots: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const overlapMinutes = (startA: number, endA: number, startB: number, endB: number) =>
  Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));

export const useAdvancedStats = () => {
  const { appointments } = useSupabaseAppointments();
  const { services } = useSupabaseServices();
  const { transactions } = useSupabaseTransactions();
  const { activeStaff } = useStaff();
  const { schedule: openingSchedule, hasData: hasOpeningHours } = useOpeningHours();

  const clientRetentionStats = useMemo((): ClientRetentionData[] => {
    const now = new Date();
    const periods = [
      { name: 'Cette semaine', start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) },
      { name: 'Ce mois', start: startOfMonth(now), end: endOfMonth(now) },
      { name: 'Mois dernier', start: startOfMonth(addDays(now, -30)), end: endOfMonth(addDays(now, -30)) },
    ];

    return periods.map(period => {
      const periodAppointments = appointments.filter(
        appointment =>
          appointment.status !== 'cancelled' &&
          appointment.startTime >= period.start &&
          appointment.startTime <= period.end
      );

      const clients = new Set<string>();
      const newClients = new Set<string>();

      periodAppointments.forEach(appointment => {
        const clientKey = `${appointment.clientName}-${appointment.clientPhone}`;
        clients.add(clientKey);

        const firstAppointment = appointments
          .filter(candidate =>
            candidate.status !== 'cancelled' &&
            `${candidate.clientName}-${candidate.clientPhone}` === clientKey
          )
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];

        if (firstAppointment && firstAppointment.startTime >= period.start) {
          newClients.add(clientKey);
        }
      });

      const returningClients = clients.size - newClients.size;

      return {
        period: period.name,
        newClients: newClients.size,
        returningClients,
        retentionRate: clients.size > 0 ? (returningClients / clients.size) * 100 : 0,
      };
    });
  }, [appointments]);

  const barberPerformanceStats = useMemo((): BarberPerformanceData[] => {
    const staffNameMap = new Map(activeStaff.map(member => [member.id, member.name]));

    const employeeMap = new Map<string, {
      appointmentCount: number;
      appointmentRevenue: number;
      transactionRevenue: number;
      totalDuration: number;
      name: string;
    }>();

    const ensureEmployee = (employeeId: string) => {
      const current = employeeMap.get(employeeId);
      if (current) return current;

      const created = {
        appointmentCount: 0,
        appointmentRevenue: 0,
        transactionRevenue: 0,
        totalDuration: 0,
        name: staffNameMap.get(employeeId) || 'Membre inconnu',
      };
      employeeMap.set(employeeId, created);
      return created;
    };

    appointments
      .filter(appointment => appointment.status !== 'cancelled')
      .forEach(appointment => {
        const employeeId = appointment.staffId || appointment.barberId;
        if (!employeeId) return;

        const employee = ensureEmployee(employeeId);
        employee.appointmentCount += 1;
        employee.totalDuration += appointment.endTime.getTime() - appointment.startTime.getTime();

        if (appointment.isPaid) {
          employee.appointmentRevenue += Number(appointment.totalPrice);
        }
      });

    transactions.forEach(transaction => {
      if (!transaction.staffId) return;
      const employee = ensureEmployee(transaction.staffId);
      employee.transactionRevenue += Number(transaction.totalAmount);
    });

    return Array.from(employeeMap.entries())
      .map(([employeeId, data]) => ({
        barberName: data.name,
        employeeId,
        appointmentCount: data.appointmentCount,
        revenue: data.transactionRevenue > 0 ? data.transactionRevenue : data.appointmentRevenue,
        averageServiceTime:
          data.appointmentCount > 0
            ? data.totalDuration / (data.appointmentCount * 60_000)
            : 0,
      }))
      .filter(employee => employee.appointmentCount > 0 || employee.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [appointments, transactions, activeStaff]);

  const peakHoursStats = useMemo((): PeakHoursData[] => {
    const hourMap = new Map<number, { count: number; revenue: number }>();

    transactions.forEach(transaction => {
      const hour = getHours(new Date(transaction.transactionDate));
      const existing = hourMap.get(hour) || { count: 0, revenue: 0 };
      hourMap.set(hour, {
        count: existing.count + 1,
        revenue: existing.revenue + Number(transaction.totalAmount),
      });
    });

    if (hourMap.size === 0) {
      appointments
        .filter(appointment => appointment.status !== 'cancelled')
        .forEach(appointment => {
          const hour = getHours(appointment.startTime);
          const existing = hourMap.get(hour) || { count: 0, revenue: 0 };
          hourMap.set(hour, {
            count: existing.count + 1,
            revenue: existing.revenue + (appointment.isPaid ? Number(appointment.totalPrice) : 0),
          });
        });
    }

    return Array.from(hourMap.entries())
      .map(([hour, data]) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        appointmentCount: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [appointments, transactions]);

  const cancellationStats = useMemo((): CancellationData[] => {
    const now = new Date();
    const periods = [
      { name: 'Cette semaine', start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) },
      { name: 'Ce mois', start: startOfMonth(now), end: endOfMonth(now) },
      { name: 'Mois dernier', start: startOfMonth(addDays(now, -30)), end: endOfMonth(addDays(now, -30)) },
    ];

    return periods.map(period => {
      const periodAppointments = appointments.filter(
        appointment => appointment.startTime >= period.start && appointment.startTime <= period.end
      );
      const cancelledAppointments = periodAppointments.filter(
        appointment => appointment.status === 'cancelled'
      ).length;

      return {
        period: period.name,
        totalAppointments: periodAppointments.length,
        cancelledAppointments,
        cancellationRate:
          periodAppointments.length > 0
            ? (cancelledAppointments / periodAppointments.length) * 100
            : 0,
      };
    });
  }, [appointments]);

  const serviceProfitabilityStats = useMemo((): ServiceProfitabilityData[] => {
    const serviceNames = new Set(services.map(service => service.name.toLowerCase().trim()));
    const transactionStats = new Map<string, { count: number; revenue: number; displayName: string }>();
    const appointmentStats = new Map<string, { count: number; revenue: number; displayName: string }>();

    transactions.forEach(transaction => {
      transaction.items?.forEach(item => {
        const normalizedName = item.name?.toLowerCase().trim();
        if (!normalizedName || !serviceNames.has(normalizedName)) return;

        const existing = transactionStats.get(normalizedName) || {
          count: 0,
          revenue: 0,
          displayName: item.name,
        };
        const quantity = item.quantity || 1;

        transactionStats.set(normalizedName, {
          count: existing.count + quantity,
          revenue: existing.revenue + Number(item.price || 0) * quantity,
          displayName: existing.displayName,
        });
      });
    });

    appointments
      .filter(appointment => appointment.status !== 'cancelled' && appointment.isPaid)
      .forEach(appointment => {
        appointment.services?.forEach(service => {
          const normalizedName = service.name?.toLowerCase().trim();
          if (!normalizedName) return;

          const existing = appointmentStats.get(normalizedName) || {
            count: 0,
            revenue: 0,
            displayName: service.name,
          };

          appointmentStats.set(normalizedName, {
            count: existing.count + 1,
            revenue: existing.revenue + Number(service.price || 0),
            displayName: existing.displayName,
          });
        });
      });

    const allNames = new Set([...transactionStats.keys(), ...appointmentStats.keys()]);

    return Array.from(allNames)
      .map(name => {
        const transactionData = transactionStats.get(name);
        const appointmentData = appointmentStats.get(name);
        const selected = transactionData && transactionData.count > 0 ? transactionData : appointmentData;

        if (!selected) return null;

        return {
          serviceName: selected.displayName,
          appointmentCount: selected.count,
          revenue: selected.revenue,
          averagePrice: selected.count > 0 ? selected.revenue / selected.count : 0,
        };
      })
      .filter((service): service is ServiceProfitabilityData => service !== null)
      .sort((a, b) => b.revenue - a.revenue);
  }, [appointments, services, transactions]);

  const occupancyStats = useMemo((): OccupancyData[] => {
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, index) =>
      startOfDay(addDays(now, -6 + index))
    );

    return last7Days.map(date => {
      const jsDay = getDay(date);
      const dayName = DAY_NAMES[jsDay];
      const openingDayIndex = jsDay === 0 ? 6 : jsDay - 1;
      const salonDay = openingSchedule.find(day => day.day_of_week === openingDayIndex);

      if (hasOpeningHours && salonDay && !salonDay.is_open) {
        return {
          date: format(date, 'dd/MM', { locale: fr }),
          occupancyRate: 0,
          totalSlots: 0,
          bookedSlots: 0,
        };
      }

      const salonStart = hasOpeningHours && salonDay ? timeToMinutes(salonDay.open_time) : 0;
      const salonEnd = hasOpeningHours && salonDay ? timeToMinutes(salonDay.close_time) : 24 * 60;
      const breakStart = hasOpeningHours && salonDay?.break_start
        ? timeToMinutes(salonDay.break_start)
        : null;
      const breakEnd = hasOpeningHours && salonDay?.break_end
        ? timeToMinutes(salonDay.break_end)
        : null;

      let totalAvailableSlots = 0;

      activeStaff.forEach(member => {
        const daySchedule = member.daily_schedules?.[dayName];
        if (!daySchedule) return;

        const staffStart = timeToMinutes(daySchedule.start);
        const staffEnd = timeToMinutes(daySchedule.end);
        const effectiveStart = Math.max(staffStart, salonStart);
        const effectiveEnd = Math.min(staffEnd, salonEnd);

        if (effectiveEnd <= effectiveStart) return;

        let availableMinutes = effectiveEnd - effectiveStart;

        if (breakStart !== null && breakEnd !== null) {
          availableMinutes -= overlapMinutes(
            effectiveStart,
            effectiveEnd,
            breakStart,
            breakEnd
          );
        }

        totalAvailableSlots += Math.max(0, Math.floor(availableMinutes / 15));
      });

      const dayAppointments = appointments.filter(
        appointment =>
          appointment.status !== 'cancelled' &&
          isSameDay(appointment.startTime, date)
      );

      const bookedSlots = dayAppointments.reduce((sum, appointment) => {
        const durationMinutes = Math.max(
          0,
          Math.ceil((appointment.endTime.getTime() - appointment.startTime.getTime()) / 60_000)
        );
        return sum + Math.ceil(durationMinutes / 15);
      }, 0);

      return {
        date: format(date, 'dd/MM', { locale: fr }),
        occupancyRate:
          totalAvailableSlots > 0
            ? Math.min((bookedSlots / totalAvailableSlots) * 100, 100)
            : 0,
        totalSlots: totalAvailableSlots,
        bookedSlots,
      };
    });
  }, [appointments, activeStaff, openingSchedule, hasOpeningHours]);

  return {
    clientRetentionStats,
    barberPerformanceStats,
    peakHoursStats,
    cancellationStats,
    serviceProfitabilityStats,
    occupancyStats,
  };
};
