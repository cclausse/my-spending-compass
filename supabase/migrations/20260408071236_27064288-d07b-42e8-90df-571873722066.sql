
-- Create enum for import status
CREATE TYPE public.import_status AS ENUM ('uploaded', 'processing', 'parsed', 'failed');

-- Create enum for source type
CREATE TYPE public.source_type AS ENUM ('bank', 'amex', 'sasmc', 'banknorwegian');

-- Create imports table
CREATE TABLE public.imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  source_type public.source_type,
  status public.import_status NOT NULL DEFAULT 'uploaded',
  error_message TEXT,
  transaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table with normalized schema
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_id UUID NOT NULL REFERENCES public.imports(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  transaction_date DATE,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NOK',
  description_raw TEXT NOT NULL,
  merchant TEXT,
  category TEXT NOT NULL DEFAULT 'annet',
  account_external_id TEXT,
  card_external_id TEXT,
  dedup_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index for deduplication per user
CREATE UNIQUE INDEX idx_transactions_dedup ON public.transactions (user_id, dedup_hash);

-- Create indexes for common queries
CREATE INDEX idx_transactions_user_booking ON public.transactions (user_id, booking_date DESC);
CREATE INDEX idx_transactions_import ON public.transactions (import_id);
CREATE INDEX idx_imports_user ON public.imports (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for imports
CREATE POLICY "Users can view their own imports"
  ON public.imports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own imports"
  ON public.imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own imports"
  ON public.imports FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for imports updated_at
CREATE TRIGGER update_imports_updated_at
  BEFORE UPDATE ON public.imports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
