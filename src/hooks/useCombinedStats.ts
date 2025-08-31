import { useMemo } from 'react';
import { useSupabaseTransactions } from './useSupabaseTransactions';
import { useSupabaseAppointments } from './useSupabaseAppointments';

export const useCombinedStats = () => {
  const { transactions } = useSupabaseTransactions();
  const { appointments } = useSupabaseAppointments();
  
  const stats = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Calculate week start (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    console.log('Date ranges:', {
      today: startOfToday.toISOString(),
      week: startOfWeek.toISOString(),
      month: startOfMonth.toISOString(),
      transactionsCount: transactions.length,
      appointmentsCount: appointments.length
    });

    // Filter transactions by date - Convert string dates to Date objects for comparison
    const todayTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return txDate >= startOfToday;
    });
    const weekTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return txDate >= startOfWeek;
    });
    const monthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return txDate >= startOfMonth;
    });

    // Filter appointments by date - Convert string dates to Date objects for comparison
    const todayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfToday;
    });
    const weekAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfWeek;
    });
    const monthAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfMonth;
    });

    console.log('Filtered data:', {
      todayTx: todayTransactions.length,
      weekTx: weekTransactions.length,
      monthTx: monthTransactions.length,
      todayApt: todayAppointments.length,
      weekApt: weekAppointments.length,
      monthApt: monthAppointments.length
    });

    // Calculate combined revenue (transactions + appointments)
    const todayTransactionRevenue = todayTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const todayAppointmentRevenue = todayAppointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
    const todayRevenue = todayTransactionRevenue + todayAppointmentRevenue;
    
    const weeklyTransactionRevenue = weekTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const weeklyAppointmentRevenue = weekAppointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
    const weeklyRevenue = weeklyTransactionRevenue + weeklyAppointmentRevenue;
    
    const monthlyTransactionRevenue = monthTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const monthlyAppointmentRevenue = monthAppointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
    const monthlyRevenue = monthlyTransactionRevenue + monthlyAppointmentRevenue;

    // Calculate combined client count (transactions + appointments)
    const todayClients = todayTransactions.length + todayAppointments.length;
    const weeklyClients = weekTransactions.length + weekAppointments.length;
    const monthlyClients = monthTransactions.length + monthAppointments.length;

    // Payment method stats (only from transactions - appointments don't have payment method data)
    const todayCash = todayTransactions.filter(tx => tx.paymentMethod === 'cash').length;
    const todayCard = todayTransactions.filter(tx => tx.paymentMethod === 'card').length;
    const weeklyCash = weekTransactions.filter(tx => tx.paymentMethod === 'cash').length;
    const weeklyCard = weekTransactions.filter(tx => tx.paymentMethod === 'card').length;
    const monthlyCash = monthTransactions.filter(tx => tx.paymentMethod === 'cash').length;
    const monthlyCard = monthTransactions.filter(tx => tx.paymentMethod === 'card').length;

    // Add appointments as "paid" transactions for payment stats
    const todayAppointmentsPaid = todayAppointments.filter(apt => apt.isPaid).length;
    const weeklyAppointmentsPaid = weekAppointments.filter(apt => apt.isPaid).length;
    const monthlyAppointmentsPaid = monthAppointments.filter(apt => apt.isPaid).length;

    // Calculate percentages including appointments
    const totalTodayPaid = todayCash + todayCard + todayAppointmentsPaid;
    const totalWeeklyPaid = weeklyCash + weeklyCard + weeklyAppointmentsPaid;
    const totalMonthlyPaid = monthlyCash + monthlyCard + monthlyAppointmentsPaid;

    const todayCashPercent = totalTodayPaid > 0 ? (todayCash / totalTodayPaid) * 100 : 0;
    const todayCardPercent = totalTodayPaid > 0 ? (todayCard / totalTodayPaid) * 100 : 0;
    const todayAppointmentPercent = totalTodayPaid > 0 ? (todayAppointmentsPaid / totalTodayPaid) * 100 : 0;
    
    const weeklyCashPercent = totalWeeklyPaid > 0 ? (weeklyCash / totalWeeklyPaid) * 100 : 0;
    const weeklyCardPercent = totalWeeklyPaid > 0 ? (weeklyCard / totalWeeklyPaid) * 100 : 0;
    const weeklyAppointmentPercent = totalWeeklyPaid > 0 ? (weeklyAppointmentsPaid / totalWeeklyPaid) * 100 : 0;
    
    const monthlyCashPercent = totalMonthlyPaid > 0 ? (monthlyCash / totalMonthlyPaid) * 100 : 0;
    const monthlyCardPercent = totalMonthlyPaid > 0 ? (monthlyCard / totalMonthlyPaid) * 100 : 0;
    const monthlyAppointmentPercent = totalMonthlyPaid > 0 ? (monthlyAppointmentsPaid / totalMonthlyPaid) * 100 : 0;

    return {
      todayRevenue,
      todayClients,
      weeklyRevenue,
      weeklyClients,
      monthlyRevenue,
      monthlyClients,
      // Payment method stats (enhanced with appointments)
      paymentStats: {
        today: {
          cash: todayCash,
          card: todayCard,
          appointments: todayAppointmentsPaid,
          cashPercent: todayCashPercent,
          cardPercent: todayCardPercent,
          appointmentPercent: todayAppointmentPercent
        },
        weekly: {
          cash: weeklyCash,
          card: weeklyCard,
          appointments: weeklyAppointmentsPaid,
          cashPercent: weeklyCashPercent,
          cardPercent: weeklyCardPercent,
          appointmentPercent: weeklyAppointmentPercent
        },
        monthly: {
          cash: monthlyCash,
          card: monthlyCard,
          appointments: monthlyAppointmentsPaid,
          cashPercent: monthlyCashPercent,
          cardPercent: monthlyCardPercent,
          appointmentPercent: monthlyAppointmentPercent
        }
      }
    };
  }, [transactions, appointments]);

  return { stats };
};