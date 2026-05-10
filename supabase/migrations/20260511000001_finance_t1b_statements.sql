-- Tyler James OS, Finance T1b schema
-- statements (source PDFs) and balance_snapshots (balance over time).
-- Statement.parser_strategy defaults to MANUAL until T1c lands the ANZ NZ parser.

CREATE TYPE parser_strategy AS ENUM ('TEXT_FORMAT_SPECIFIC', 'TEXT_GENERIC', 'OCR_GENERIC', 'MANUAL');
CREATE TYPE statement_status AS ENUM ('IMPORTED', 'NEEDS_REVIEW', 'FAILED');
CREATE TYPE snapshot_source AS ENUM ('STATEMENT', 'MANUAL');

CREATE TABLE public.statements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  storage_path TEXT NOT NULL,

  parser_strategy parser_strategy NOT NULL,
  parser_version TEXT,
  opening_balance NUMERIC(14, 2),
  closing_balance NUMERIC(14, 2),

  status statement_status NOT NULL DEFAULT 'NEEDS_REVIEW',
  imported_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (account_id, period_start, period_end)
);

CREATE TABLE public.balance_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,

  date DATE NOT NULL,
  balance NUMERIC(14, 2) NOT NULL,
  source snapshot_source NOT NULL,
  statement_id UUID REFERENCES public.statements(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add statement_id to transactions (nullable; manual entries stay null).
ALTER TABLE public.transactions
  ADD COLUMN statement_id UUID REFERENCES public.statements(id) ON DELETE SET NULL;

CREATE INDEX idx_statements_user_id ON public.statements(user_id);
CREATE INDEX idx_statements_account_id ON public.statements(account_id);
CREATE INDEX idx_balance_snapshots_user_id ON public.balance_snapshots(user_id);
CREATE INDEX idx_balance_snapshots_account_date ON public.balance_snapshots(account_id, date DESC);
CREATE INDEX idx_transactions_statement_id ON public.transactions(statement_id);

ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own statements" ON public.statements
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own balance snapshots" ON public.balance_snapshots
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_statements_updated_at BEFORE UPDATE ON public.statements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
