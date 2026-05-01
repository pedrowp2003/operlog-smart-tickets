ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS foto_defeito_url text,
  ADD COLUMN IF NOT EXISTS codigo_erro text;