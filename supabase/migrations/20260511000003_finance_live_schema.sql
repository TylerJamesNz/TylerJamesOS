-- Tyler James OS, Finance live-data schema (Phase J, prerequisite for T1d + T1e).
-- Adds source classification + supersedure to transactions, per-account Akahu/Gmail
-- linkage to accounts, and an external_integrations table for OAuth credentials.
-- See docs/adr/0004-live-transaction-sources.md.

CREATE TYPE transaction_source AS ENUM ('STATEMENT', 'LIVE', 'MANUAL');
CREATE TYPE integration_provider AS ENUM ('akahu', 'gmail');

ALTER TABLE public.transactions
  ADD COLUMN source transaction_source NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN superseded_at TIMESTAMPTZ;

-- Backfill: existing rows linked to a statement become STATEMENT-sourced;
-- everything else stays MANUAL (the column default).
UPDATE public.transactions SET source = 'STATEMENT' WHERE statement_id IS NOT NULL;

CREATE INDEX idx_transactions_source ON public.transactions(source);
CREATE INDEX idx_transactions_active ON public.transactions(user_id, date DESC)
  WHERE superseded_at IS NULL;

ALTER TABLE public.accounts
  ADD COLUMN akahu_account_id TEXT,
  ADD COLUMN gmail_label TEXT,
  ADD CONSTRAINT accounts_akahu_account_id_key UNIQUE (akahu_account_id);

-- OAuth credentials for external providers. Encrypted token columns hold
-- Vault-wrapped values; the Edge Function that writes here is responsible
-- for invoking vault.create_secret() or equivalent before insert.
CREATE TABLE public.external_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  provider integration_provider NOT NULL,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, provider)
);

CREATE INDEX idx_external_integrations_user_id ON public.external_integrations(user_id);

ALTER TABLE public.external_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own integrations" ON public.external_integrations
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_external_integrations_updated_at BEFORE UPDATE ON public.external_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
