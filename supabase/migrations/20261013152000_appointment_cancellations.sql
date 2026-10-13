-- V2.1: cancellation/no-show audit trail and refund state.
-- Cancellation no longer requires deleting an appointment.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS late_cancellation_policy text NOT NULL DEFAULT 'keep_deposit',
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_source text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS refund_amount numeric(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_late_cancellation_policy_check,
  DROP CONSTRAINT IF EXISTS appointments_cancellation_source_check,
  DROP CONSTRAINT IF EXISTS appointments_refund_status_check,
  DROP CONSTRAINT IF EXISTS appointments_refund_amount_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_late_cancellation_policy_check
    CHECK (late_cancellation_policy IN ('keep_deposit', 'refund_deposit')),
  ADD CONSTRAINT appointments_cancellation_source_check
    CHECK (
      cancellation_source IS NULL
      OR cancellation_source IN ('salon', 'client', 'system')
    ),
  ADD CONSTRAINT appointments_refund_status_check
    CHECK (refund_status IN ('not_applicable', 'pending', 'refunded', 'failed', 'kept')),
  ADD CONSTRAINT appointments_refund_amount_check
    CHECK (refund_amount >= 0);

CREATE INDEX IF NOT EXISTS appointments_refund_followup_idx
  ON public.appointments (refund_status, cancelled_at)
  WHERE refund_status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS appointments_cancelled_history_idx
  ON public.appointments (salon_id, cancelled_at DESC)
  WHERE status IN ('cancelled', 'no_show');
