
-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins of the salon can read logs
CREATE POLICY "Admins can read activity logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    salon_id = get_user_salon_id(auth.uid())
    AND is_salon_admin(auth.uid())
  );

-- Any authenticated user can insert logs (for their own salon)
CREATE POLICY "Users can insert activity logs"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    salon_id = get_user_salon_id(auth.uid())
    AND user_id = auth.uid()
  );

-- Create index for performance
CREATE INDEX idx_activity_logs_salon_created ON public.activity_logs(salon_id, created_at DESC);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
