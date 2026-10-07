-- V2: ensure Supabase Vault is available for scheduler secrets.

CREATE EXTENSION IF NOT EXISTS supabase_vault
WITH SCHEMA vault;

COMMENT ON EXTENSION supabase_vault IS
  'Stores encrypted scheduler secrets used by report and SMS cron jobs.';
