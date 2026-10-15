export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  birth_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientStats {
  totalSpent: number;
  visitCount: number;
  lastVisit: string | null;
}
