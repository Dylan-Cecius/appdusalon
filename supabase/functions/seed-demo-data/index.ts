import { isTrustedAppOrigin } from "../_shared/app-origin.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireMfaAssurance } from "../_shared/mfa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Deterministic-ish pseudo random so the demo stays coherent
let seed = 42;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(rnd() * (max - min + 1)) + min;

const SERVICES = [
  { name: "Coupe homme", price: 25, duration: 30, category: "coupe", color: "#10B981" },
  { name: "Coupe femme", price: 45, duration: 45, category: "coupe", color: "#10B981" },
  { name: "Brushing", price: 35, duration: 40, category: "coupe", color: "#10B981" },
  { name: "Coupe enfant", price: 20, duration: 25, category: "coupe", color: "#10B981" },
  { name: "Coloration", price: 75, duration: 90, category: "coloration", color: "#8B5CF6" },
  { name: "Mèches / Balayage", price: 90, duration: 120, category: "coloration", color: "#8B5CF6" },
  { name: "Barbe", price: 15, duration: 20, category: "barbe", color: "#3B82F6" },
  { name: "Soin cheveux", price: 30, duration: 30, category: "soin", color: "#EC4899" },
  { name: "Lissage", price: 120, duration: 150, category: "soin", color: "#EC4899" },
  { name: "Chignon / Coiffure mariée", price: 85, duration: 75, category: "coiffure", color: "#F59E0B" },
];

const PRODUCTS = [
  { name: "Shampoing réparateur 250ml", sku: "SH-REP-250", category: "revente", purchase_price: 6.5, sell_price: 18, current_stock: 24, min_stock: 6, supplier: "Kerastyle" },
  { name: "Après-shampoing hydratant", sku: "AS-HYD-200", category: "revente", purchase_price: 5.8, sell_price: 16, current_stock: 12, min_stock: 6, supplier: "Kerastyle" },
  { name: "Huile d'argan 100ml", sku: "HU-ARG-100", category: "revente", purchase_price: 9, sell_price: 26, current_stock: 4, min_stock: 6, supplier: "NatureHair" },
  { name: "Cire coiffante mate", sku: "CI-MAT-75", category: "revente", purchase_price: 4.2, sell_price: 14, current_stock: 18, min_stock: 5, supplier: "BarberPro" },
  { name: "Spray thermo-protecteur", sku: "SP-THE-200", category: "revente", purchase_price: 6, sell_price: 19, current_stock: 0, min_stock: 4, supplier: "Kerastyle" },
  { name: "Coloration châtain (pro)", sku: "CO-CHA-PRO", category: "consommable", purchase_price: 7.5, sell_price: 0, current_stock: 30, min_stock: 10, supplier: "ColorLab" },
  { name: "Oxydant 20 vol. 1L", sku: "OX-20-1L", category: "consommable", purchase_price: 5, sell_price: 0, current_stock: 8, min_stock: 4, supplier: "ColorLab" },
  { name: "Peigne carbone", sku: "AC-PEI-01", category: "accessoire", purchase_price: 2, sell_price: 7, current_stock: 15, min_stock: 3, supplier: "BarberPro" },
];

const FIRST_F = ["Sophie", "Marie", "Julie", "Emma", "Camille", "Laura", "Alice", "Chloé", "Manon", "Sarah", "Léa", "Inès", "Nina", "Clara", "Elise", "Amandine", "Céline", "Noémie"];
const FIRST_M = ["Thomas", "Lucas", "Hugo", "Pierre", "Antoine", "Maxime", "Nicolas", "Julien", "Adrien", "Kevin", "Romain", "Benoît"];
const LAST = ["Martin", "Dubois", "Bernard", "Petit", "Moreau", "Simon", "Leroy", "Roux", "Blanc", "Garnier", "Durand", "Fontaine", "Mercier", "Lambert", "Rousseau", "Girard", "Lefèvre", "Marchand", "Dupuis", "Renard", "Perrin", "Colin", "Vidal", "Barbier", "Noël", "Faure", "Chevalier", "Robin", "Gauthier", "Masson"];

const NOTES = [
  "Cliente fidèle, préfère les rendez-vous en matinée.",
  "Allergie légère à l'ammoniaque — utiliser gamme sans ammoniaque.",
  "Aime discuter, prévoir un peu plus de temps.",
  "Vient toujours avec sa fille pour une coupe enfant.",
  "Souhaite être rappelée par SMS la veille.",
  null,
  null,
  null,
];

const APPT_NOTES = [
  "Retouche racines",
  "Souhaite un carré plongeant",
  "Première visite",
  "Avant un mariage",
  null,
  null,
];

type Staff = { id: string; name: string; color: string };

const isSunday = (d: Date) => d.getDay() === 0;
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const at = (day: Date, hour: number, minute: number) => {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
};

Deno.serve(async (req) => {
  if (!isTrustedAppOrigin(req)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // --- Authenticate caller and make sure it's the demo salon owner ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await requireMfaAssurance(req);

    const { data: salon } = await supabase
      .from("salons")
      .select("id, owner_user_id, is_demo")
      .eq("owner_user_id", user.id)
      .eq("is_demo", true)
      .maybeSingle();

    if (!salon) {
      return new Response(
        JSON.stringify({ error: "Not a demo salon" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const salonId = salon.id as string;
    const userId = salon.owner_user_id as string;

    let force = false;
    try {
      const body = await req.json();
      force = Boolean(body?.force);
    } catch (_) { /* no body */ }

    // --- Skip if already refreshed today (keeps demo login fast) ---
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (!force) {
      const { count } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("transaction_date", startOfToday.toISOString());

      if ((count ?? 0) > 0) {
        return new Response(JSON.stringify({ seeded: false, reason: "fresh" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    seed = 42;

    // --- Wipe generated data ---
    await supabase.from("stock_movements").delete().eq("salon_id", salonId);
    await supabase.from("transactions").delete().eq("salon_id", salonId);
    await supabase.from("appointments").delete().eq("salon_id", salonId);
    await supabase.from("todo_items").delete().eq("salon_id", salonId);
    await supabase.from("products").delete().eq("salon_id", salonId);
    await supabase.from("clients").delete().eq("salon_id", salonId);
    await supabase.from("services").delete().eq("salon_id", salonId);
    await supabase.from("opening_hours").delete().eq("salon_id", salonId);
    await supabase.from("staff").delete().eq("salon_id", salonId);
    await supabase.from("barbers").delete().eq("salon_id", salonId);

    // If the demo is opened on a Sunday, keep the salon open so the day is not empty
    const openSunday = new Date().getDay() === 0;
    const closedDay = (d: Date) => isSunday(d) && !(openSunday && sameDay(d, new Date()));

    // --- Opening hours (Mon-Sat, + Sunday when the demo starts a Sunday) ---
    await supabase.from("opening_hours").insert(
      [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        salon_id: salonId,
        day_of_week: day,
        is_open: day !== 0 || openSunday,
        open_time: day === 0 ? "10:00" : "09:00",
        close_time: day === 6 ? "17:00" : day === 0 ? "16:00" : "19:00",
        break_start: day === 0 ? null : "13:00",
        break_end: day === 0 ? null : "14:00",
      })),
    );

    // --- Staff ---
    const staffRows = [
      { name: "Marie Dupont", role: "coiffeur", color: "#8B5CF6", commission_rate: 12, phone: "0470112233", email: "marie@salon-eclat.demo" },
      { name: "Thomas Martin", role: "barbier", color: "#3B82F6", commission_rate: 15, phone: "0470223344", email: "thomas@salon-eclat.demo" },
      { name: "Sophie Laurent", role: "estheticien", color: "#EC4899", commission_rate: 10, phone: "0470334455", email: "sophie@salon-eclat.demo" },
      { name: "Lina Bensaïd", role: "coiffeur", color: "#F59E0B", commission_rate: 10, phone: "0470445566", email: "lina@salon-eclat.demo" },
    ].map((s) => ({
      ...s,
      salon_id: salonId,
      is_active: true,
      start_time: "09:00",
      end_time: "19:00",
      working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    }));

    const { data: staff } = await supabase.from("staff").insert(staffRows).select("id, name, color");
    const team: Staff[] = (staff ?? []) as Staff[];

    // Legacy "barbers" (agenda columns)
    const { data: barbers } = await supabase
      .from("barbers")
      .insert(
        team.map((s, i) => ({
          salon_id: salonId,
          user_id: userId,
          name: s.name.split(" ")[0],
          color: ["bg-purple-600", "bg-blue-600", "bg-pink-600", "bg-yellow-600"][i % 4],
          start_time: "09:00",
          end_time: "19:00",
          is_active: true,
          working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        })),
      )
      .select("id, name");

    const barberIds = (barbers ?? []).map((b: { id: string }) => b.id);

    // --- Services ---
    const { data: services } = await supabase
      .from("services")
      .insert(
        SERVICES.map((s, i) => ({
          ...s,
          salon_id: salonId,
          user_id: userId,
          is_active: true,
          display_order: i,
          appointment_buffer: 0,
        })),
      )
      .select("id, name, price, duration");

    const svc = services ?? [];

    // --- Clients (mix of loyal / recent / inactive) ---
    const clientRows: Record<string, unknown>[] = [];
    const usedNames = new Set<string>();
    for (let i = 0; i < 34; i++) {
      const female = rnd() > 0.32;
      let name = `${pick(female ? FIRST_F : FIRST_M)} ${pick(LAST)}`;
      let guard = 0;
      while (usedNames.has(name) && guard++ < 20) {
        name = `${pick(female ? FIRST_F : FIRST_M)} ${pick(LAST)}`;
      }
      usedNames.add(name);
      const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, ".");
      const createdDaysAgo = randInt(5, 420);
      const created = new Date();
      created.setDate(created.getDate() - createdDaysAgo);
      const birth = new Date(1970 + randInt(0, 35), randInt(0, 11), randInt(1, 28));
      clientRows.push({
        salon_id: salonId,
        user_id: userId,
        name,
        phone: `04${randInt(60, 79)}${String(randInt(100000, 999999))}`,
        email: rnd() > 0.15 ? `${slug}@example.com` : null,
        notes: pick(NOTES),
        birth_date: birth.toISOString().slice(0, 10),
        sms_opt_out: rnd() > 0.92,
        created_at: created.toISOString(),
      });
    }
    const { data: clients } = await supabase.from("clients").insert(clientRows).select("id, name, phone");
    const clientList = (clients ?? []) as { id: string; name: string; phone: string }[];

    // --- Products ---
    const { data: products } = await supabase
      .from("products")
      .insert(PRODUCTS.map((p) => ({ ...p, salon_id: salonId, is_active: true, unit: "unité" })))
      .select("id, name, sell_price, current_stock");
    const productList = (products ?? []) as { id: string; name: string; sell_price: number; current_stock: number }[];

    // --- Stock movements (history) ---
    const movements: Record<string, unknown>[] = [];
    for (const p of productList) {
      for (let m = 0; m < randInt(2, 4); m++) {
        const d = new Date();
        d.setDate(d.getDate() - randInt(1, 90));
        const qty = randInt(2, 12);
        const isIn = rnd() > 0.45;
        const prev = Math.max(0, p.current_stock + (isIn ? -qty : qty));
        movements.push({
          salon_id: salonId,
          product_id: p.id,
          type: isIn ? "in" : "out",
          quantity: qty,
          previous_stock: prev,
          new_stock: p.current_stock,
          reason: isIn ? "Réassort fournisseur" : "Vente / utilisation salon",
          created_at: d.toISOString(),
        });
      }
    }
    if (movements.length) await supabase.from("stock_movements").insert(movements);

    // --- Transactions: 6 months of history, growing trend ---
    const txRows: Record<string, unknown>[] = [];
    const now = new Date();
    const historyStart = new Date(now);
    historyStart.setMonth(historyStart.getMonth() - 6);
    historyStart.setDate(1);

    for (let d = new Date(historyStart); d <= now; d.setDate(d.getDate() + 1)) {
      if (closedDay(d)) continue;
      const day = new Date(d);
      const monthsAgo = (now.getFullYear() - day.getFullYear()) * 12 + now.getMonth() - day.getMonth();
      const growth = 1 + (6 - monthsAgo) * 0.05; // gentle growth over time
      const weekendBoost = day.getDay() === 5 || day.getDay() === 6 ? 1.35 : 1;
      const base = randInt(3, 6);
      let count = Math.round(base * growth * weekendBoost);
      const isToday = day.toDateString() === now.toDateString();
      if (isToday) count = Math.min(count, Math.max(2, Math.floor((now.getHours() - 9) / 1.2)));
      if (count <= 0) continue;

      for (let i = 0; i < count; i++) {
        const maxHour = isToday
          ? Math.max(9, Math.min(now.getHours() - 1, 18))
          : day.getDay() === 6
          ? 16
          : 18;
        const hour = randInt(9, maxHour);
        const when = at(day, hour, pick([0, 15, 30, 45]));
        if (when > now) continue;


        const nbItems = rnd() > 0.72 ? 2 : 1;
        const items: Record<string, unknown>[] = [];
        for (let k = 0; k < nbItems; k++) {
          const s = pick(svc) as { id: string; name: string; price: number; duration: number };
          items.push({ id: s.id, name: s.name, price: Number(s.price), quantity: 1, duration: s.duration });
        }
        // occasional retail product
        if (rnd() > 0.82 && productList.length) {
          const p = pick(productList.filter((x) => Number(x.sell_price) > 0));
          if (p) items.push({ id: p.id, name: p.name, price: Number(p.sell_price), quantity: 1, kind: "product", type: "product" });
        }
        const total = items.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0);
        const member = pick(team);
        const client = rnd() > 0.25 ? pick(clientList) : null;

        txRows.push({
          salon_id: salonId,
          user_id: userId,
          staff_id: member?.id ?? null,
          client_id: client?.id ?? null,
          items,
          total_amount: total,
          payment_method: rnd() > 0.42 ? "card" : "cash",
          transaction_date: when.toISOString(),
          created_at: when.toISOString(),
        });
      }
    }

    for (let i = 0; i < txRows.length; i += 400) {
      await supabase.from("transactions").insert(txRows.slice(i, i + 400));
    }

    // --- Appointments: 2 weeks past + today + 4 weeks ahead ---
    const apptRows: Record<string, unknown>[] = [];
    const apptStart = new Date(now);
    apptStart.setDate(apptStart.getDate() - 14);
    const apptEnd = new Date(now);
    apptEnd.setDate(apptEnd.getDate() + 28);

    for (let d = new Date(apptStart); d <= apptEnd; d.setDate(d.getDate() + 1)) {
      if (closedDay(d)) continue;
      const day = new Date(d);
      const past = day < new Date(now.toDateString());
      const daysAhead = Math.round((day.getTime() - now.getTime()) / 86400000);
      // agenda gets denser near today
      const count = past ? randInt(4, 7) : daysAhead <= 7 ? randInt(5, 9) : daysAhead <= 14 ? randInt(3, 6) : randInt(1, 4);

      const slotsPerStaff = new Map<string, number>();
      for (let i = 0; i < count; i++) {
        const member = pick(team);
        const barberId = barberIds.length ? barberIds[team.indexOf(member) % barberIds.length] : null;
        const s = pick(svc) as { id: string; name: string; price: number; duration: number };
        const startHour = slotsPerStaff.get(member.id) ?? 9;
        if (startHour >= 18) continue;
        const start = at(day, Math.floor(startHour), (startHour % 1) * 60);
        if (start.getHours() === 13) start.setHours(14, 0, 0, 0);
        const end = new Date(start.getTime() + s.duration * 60000);
        slotsPerStaff.set(member.id, end.getHours() + end.getMinutes() / 60 + (rnd() > 0.5 ? 0.5 : 0.25));

        const client = pick(clientList);
        const isPast = end < now;
        const cancelled = !isPast && rnd() > 0.94;

        apptRows.push({
          salon_id: salonId,
          user_id: userId,
          staff_id: member.id,
          barber_id: barberId,
          client_name: client.name,
          client_phone: client.phone,
          services: [{ id: s.id, name: s.name, price: Number(s.price), duration: s.duration }],
          total_price: Number(s.price),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: cancelled ? "cancelled" : isPast ? "completed" : "scheduled",
          is_paid: isPast && !cancelled,
          notes: pick(APPT_NOTES),
        });
      }
    }

    for (let i = 0; i < apptRows.length; i += 400) {
      await supabase.from("appointments").insert(apptRows.slice(i, i + 400));
    }

    // --- Todos ---
    const todoBarber = barberIds[0] ?? null;
    const todoStaff = team[0]?.id ?? null;
    if (todoBarber && todoStaff) {
      const todo = (title: string, priority: string, days: number, done = false) => {
        const due = new Date();
        due.setDate(due.getDate() + days);
        return {
          salon_id: salonId,
          user_id: userId,
          barber_id: todoBarber,
          staff_id: todoStaff,
          title,
          priority,
          due_date: due.toISOString(),
          is_completed: done,
          created_by: "admin",
        };
      };
      await supabase.from("todo_items").insert([
        todo("Commander l'huile d'argan (stock bas)", "high", 1),
        todo("Recontacter les clientes inactives depuis 3 mois", "medium", 3),
        todo("Préparer le planning des congés d'été", "low", 10),
        todo("Inventaire mensuel des produits", "medium", 5),
        todo("Publier les photos avant/après sur Instagram", "low", -1, true),
      ]);
    }

    return new Response(
      JSON.stringify({
        seeded: true,
        clients: clientList.length,
        services: svc.length,
        products: productList.length,
        transactions: txRows.length,
        appointments: apptRows.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[seed-demo-data]", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
