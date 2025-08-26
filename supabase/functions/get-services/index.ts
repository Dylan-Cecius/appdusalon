import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Services statiques - vous pouvez les modifier selon vos besoins
const services = [
  {
    id: '1',
    name: 'Coupe Homme',
    price: 18.00,
    duration: 30,
    category: 'coupe',
    appointmentBuffer: 10
  },
  {
    id: '2',
    name: 'Coupe Femme',
    price: 25.00,
    duration: 45,
    category: 'coupe',
    appointmentBuffer: 15
  },
  {
    id: '3',
    name: 'Barbe',
    price: 12.00,
    duration: 20,
    category: 'barbe',
    appointmentBuffer: 10
  },
  {
    id: '4',
    name: 'Coupe + Barbe',
    price: 23.00,
    duration: 40,
    category: 'combo',
    appointmentBuffer: 15
  },
  {
    id: '5',
    name: 'Coupe Enfant',
    price: 15.00,
    duration: 25,
    category: 'coupe',
    appointmentBuffer: 10
  },
  {
    id: '6',
    name: 'Shampoing',
    price: 8.00,
    duration: 15,
    category: 'soin',
    appointmentBuffer: 5
  },
  {
    id: '7',
    name: 'Coloration',
    price: 45.00,
    duration: 90,
    category: 'couleur',
    appointmentBuffer: 30
  },
  {
    id: '8',
    name: 'Mèches',
    price: 55.00,
    duration: 120,
    category: 'couleur',
    appointmentBuffer: 30
  }
];

const categories = [
  { id: 'coupe', name: 'Coupes' },
  { id: 'barbe', name: 'Barbe' },
  { id: 'combo', name: 'Formules' },
  { id: 'soin', name: 'Soins' },
  { id: 'couleur', name: 'Couleurs' }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get('category');

    let filteredServices = services;
    if (category) {
      filteredServices = services.filter(service => service.category === category);
    }

    return new Response(
      JSON.stringify({ 
        services: filteredServices,
        categories: categories
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});