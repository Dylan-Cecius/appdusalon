import { useMemo } from 'react';
import { useSupabaseTransactions } from './useSupabaseTransactions';
import { useSupabaseAppointments } from './useSupabaseAppointments';

export const useCombinedStats = () => {
  const { transactions } = useSupabaseTransactions();
  const { appointments } = useSupabaseAppointments();
  
  const stats = useMemo(() => {
    // Use UTC dates to match Supabase timestamp format
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Calculate week start (Monday)
    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Filter transactions by date
    const todayTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      const txDateLocal = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
      return txDateLocal >= startOfToday;
    });
    const weekTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return txDate >= startOfWeek;
    });
    const monthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return txDate >= startOfMonth;
    });

    // Filter appointments by date - Convert to local date for comparison
    const todayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      const aptDateLocal = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());
      return aptDateLocal >= startOfToday;
    });
    const weekAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfWeek;
    });
    const monthAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfMonth;
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

    // Payment method stats - count and amounts
    const todayCashTx = todayTransactions.filter(tx => tx.paymentMethod === 'cash');
    const todayCardTx = todayTransactions.filter(tx => tx.paymentMethod === 'card');
    const weeklyCashTx = weekTransactions.filter(tx => tx.paymentMethod === 'cash');
    const weeklyCardTx = weekTransactions.filter(tx => tx.paymentMethod === 'card');
    const monthlyCashTx = monthTransactions.filter(tx => tx.paymentMethod === 'cash');
    const monthlyCardTx = monthTransactions.filter(tx => tx.paymentMethod === 'card');

    // Count
    const todayCash = todayCashTx.length;
    const todayCard = todayCardTx.length;
    const weeklyCash = weeklyCashTx.length;
    const weeklyCard = weeklyCardTx.length;
    const monthlyCash = monthlyCashTx.length;
    const monthlyCard = monthlyCardTx.length;

    // Amounts
    const todayCashAmount = todayCashTx.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const todayCardAmount = todayCardTx.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const weeklyCashAmount = weeklyCashTx.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const weeklyCardAmount = weeklyCardTx.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const monthlyCashAmount = monthlyCashTx.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const monthlyCardAmount = monthlyCardTx.reduce((sum, tx) => sum + tx.totalAmount, 0);

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
          cashAmount: todayCashAmount,
          cardAmount: todayCardAmount,
          cashPercent: todayCashPercent,
          cardPercent: todayCardPercent,
          appointmentPercent: todayAppointmentPercent
        },
        weekly: {
          cash: weeklyCash,
          card: weeklyCard,
          appointments: weeklyAppointmentsPaid,
          cashAmount: weeklyCashAmount,
          cardAmount: weeklyCardAmount,
          cashPercent: weeklyCashPercent,
          cardPercent: weeklyCardPercent,
          appointmentPercent: weeklyAppointmentPercent
        },
        monthly: {
          cash: monthlyCash,
          card: monthlyCard,
          appointments: monthlyAppointmentsPaid,
          cashAmount: monthlyCashAmount,
          cardAmount: monthlyCardAmount,
          cashPercent: monthlyCashPercent,
          cardPercent: monthlyCardPercent,
          appointmentPercent: monthlyAppointmentPercent
        }
      }
    };
  }, [transactions, appointments]);

  return { stats };
};