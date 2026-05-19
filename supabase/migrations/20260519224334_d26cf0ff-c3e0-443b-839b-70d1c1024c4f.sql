
CREATE TABLE IF NOT EXISTS public.maquina_tipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.maquina_frotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.maquina_marcas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.maquina_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maquina_tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquina_frotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquina_marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquina_modelos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['maquina_tipos','maquina_frotas','maquina_marcas','maquina_modelos'] LOOP
    EXECUTE format('CREATE POLICY "Everyone view %1$s" ON public.%1$s FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "Analistas insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), ''analista''::app_role))', t);
    EXECUTE format('CREATE POLICY "Analistas update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (has_role(auth.uid(), ''analista''::app_role))', t);
    EXECUTE format('CREATE POLICY "Analistas delete %1$s" ON public.%1$s FOR DELETE TO authenticated USING (has_role(auth.uid(), ''analista''::app_role))', t);
  END LOOP;
END $$;

INSERT INTO public.maquina_tipos (nome) VALUES ('Stacker'),('Meclift'),('Caminhão'),('Empilhadeira elétrica') ON CONFLICT (nome) DO NOTHING;
INSERT INTO public.maquina_frotas (nome) VALUES ('EP-03'),('EP-17'),('EP-39'),('EP-387') ON CONFLICT (nome) DO NOTHING;
INSERT INTO public.maquina_marcas (nome) VALUES ('Yale'),('Still'),('Hyster'),('Linde') ON CONFLICT (nome) DO NOTHING;
INSERT INTO public.maquina_modelos (nome) VALUES ('GTP050'),('H55XM'),('R17'),('R1.6H') ON CONFLICT (nome) DO NOTHING;
