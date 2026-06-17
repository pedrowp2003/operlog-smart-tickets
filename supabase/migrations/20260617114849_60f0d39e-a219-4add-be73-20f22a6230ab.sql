CREATE TABLE public.maquina_partes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.maquina_partes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maquina_partes TO authenticated;
GRANT ALL ON public.maquina_partes TO service_role;

ALTER TABLE public.maquina_partes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view partes" ON public.maquina_partes FOR SELECT USING (true);
CREATE POLICY "Analistas can insert partes" ON public.maquina_partes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'analista'::app_role));
CREATE POLICY "Analistas can update partes" ON public.maquina_partes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));
CREATE POLICY "Analistas can delete partes" ON public.maquina_partes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));

INSERT INTO public.maquina_partes (nome) VALUES
  ('Bateria'),('Motor'),('Pneus'),('Rodas'),('Lataria'),('Freios'),('Direção'),('Outros')
ON CONFLICT (nome) DO NOTHING;

ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS parte_maquina TEXT;