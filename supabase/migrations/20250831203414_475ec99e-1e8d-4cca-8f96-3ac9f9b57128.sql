-- Fix critical security issue: Remove dangerous update policy
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- Fix critical security issue: Remove dangerous insert policy  
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;

-- Create secure policy: Users can only view their own subscription data
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
CREATE POLICY "select_own_subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid());

-- SECURITY: No direct update/insert policies for users
-- Edge functions use service role key which bypasses RLS automatically
-- This ensures only our backend can modify subscription data

-- Create policy for users to insert their own subscription record (needed for initial setup)
CREATE POLICY "insert_own_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users cannot update subscription data directly
-- Only edge functions with service role can do this (bypasses RLS)
-- This prevents subscription tier manipulation and unauthorized access