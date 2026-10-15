import { Calendar, DollarSign, Users, BarChart3 } from 'lucide-react';
export const REPORT_TYPES = [
  { id: 'revenue', label: 'Revenus et ventes', icon: DollarSign },
  { id: 'appointments', label: 'Rendez-vous', icon: Calendar },
  { id: 'stats', label: 'Statistiques avancées', icon: BarChart3 },
  { id: 'clients', label: 'Données clients', icon: Users },
];

export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
];

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
];
