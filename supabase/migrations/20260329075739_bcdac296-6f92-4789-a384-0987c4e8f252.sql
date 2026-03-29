CREATE TABLE public.energy_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bill_type text NOT NULL DEFAULT 'electricity',
  provider text,
  period_start date,
  period_end date,
  kwh double precision,
  cost_euros double precision,
  gas_smc double precision,
  raw_extraction jsonb DEFAULT '{}'::jsonb,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.energy_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bills" ON public.energy_bills FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bills" ON public.energy_bills FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bills" ON public.energy_bills FOR DELETE TO authenticated USING (auth.uid() = user_id);