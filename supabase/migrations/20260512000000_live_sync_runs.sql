-- Tyler James OS, T1d: append-only log of every live-data sync invocation.
-- Powers the RefreshButton's last-synced affordance and the error drawer.
-- One row per akahu-sync (or future Gmail) invocation; idempotency on the
-- transactions side already covers retries, so duplicates here are harmless
-- and there is no UNIQUE constraint.

CREATE TABLE public.live_sync_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  provider integration_provider NOT NULL,
  trigger TEXT NOT NULL,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  inserted_count INT NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_live_sync_runs_user_started ON public.live_sync_runs(user_id, started_at DESC);

ALTER TABLE public.live_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sync runs" ON public.live_sync_runs
  FOR SELECT USING (auth.uid() = user_id);
