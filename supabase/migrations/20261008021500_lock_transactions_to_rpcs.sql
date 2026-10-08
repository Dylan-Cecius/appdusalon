-- V2: force transaction mutations through vetted SECURITY DEFINER RPCs.
-- Legacy RLS allowed callers to insert/update/delete rows with user_id = auth.uid(),
-- bypassing canonical price validation, stock movement, and admin-only cancellation.

DROP POLICY IF EXISTS "Public access to transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions in their salon" ON public.transactions;
DROP POLICY IF EXISTS "Members can create transactions in accessible salon" ON public.transactions;

-- Reads remain governed by the subscription-aware policy created earlier.
-- record_pos_transaction(), settle_appointment(), and delete_pos_transaction()
-- are the only supported mutation paths for authenticated application users.
