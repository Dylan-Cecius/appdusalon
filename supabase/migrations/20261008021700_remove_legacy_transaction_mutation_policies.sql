-- V2: remove every remaining legacy transaction mutation policy.
-- Transactions are immutable from direct authenticated table writes; mutations
-- must use the validated SECURITY DEFINER RPCs.

DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions in their salon" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions in their salon" ON public.transactions;
DROP POLICY IF EXISTS "Admins can delete transactions in their salon" ON public.transactions;
DROP POLICY IF EXISTS "Members can create transactions in accessible salon" ON public.transactions;
DROP POLICY IF EXISTS "Public access to transactions" ON public.transactions;
