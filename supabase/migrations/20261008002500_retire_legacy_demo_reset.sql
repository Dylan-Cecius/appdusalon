-- V2: retire the legacy global demo reset RPC.
-- Demo resets now go exclusively through the authenticated seed-demo-data Edge Function.

REVOKE ALL ON FUNCTION public.reset_demo_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_demo_data() FROM authenticated;
DROP FUNCTION IF EXISTS public.reset_demo_data();
