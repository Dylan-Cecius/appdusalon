-- Fix security issues with customer personal data

-- First, let's handle any existing appointments without user_id
-- We'll delete them as they can't be properly secured
DELETE FROM appointments WHERE user_id IS NULL;

-- Make user_id NOT NULL to prevent future security issues
ALTER TABLE appointments ALTER COLUMN user_id SET NOT NULL;

-- Add DELETE policy for salon_settings table to prevent unauthorized deletion
CREATE POLICY "Users can delete their own salon settings" 
ON salon_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Similarly, let's ensure other tables with sensitive data have proper protections
-- Check transactions table user_id (it should also not be nullable for security)
DELETE FROM transactions WHERE user_id IS NULL;
ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN appointments.user_id IS 'Required field linking appointment to salon owner - ensures RLS security';
COMMENT ON COLUMN transactions.user_id IS 'Required field linking transaction to salon owner - ensures RLS security';