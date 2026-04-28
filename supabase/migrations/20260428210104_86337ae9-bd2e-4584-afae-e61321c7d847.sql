
-- profiles: área de atuação do técnico
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS area TEXT;

-- chamados: segundo técnico, garantir progresso/data_inicio
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS tecnico2_id UUID;

-- chamado_acoes: fornecedor e valor
ALTER TABLE public.chamado_acoes ADD COLUMN IF NOT EXISTS fornecedor_id UUID;
ALTER TABLE public.chamado_acoes ADD COLUMN IF NOT EXISTS valor NUMERIC(12,2);

-- fornecedores
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view fornecedores" ON public.fornecedores;
CREATE POLICY "Everyone can view fornecedores" ON public.fornecedores
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Analistas can insert fornecedores" ON public.fornecedores;
CREATE POLICY "Analistas can insert fornecedores" ON public.fornecedores
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'analista'::app_role));

DROP POLICY IF EXISTS "Analistas can update fornecedores" ON public.fornecedores;
CREATE POLICY "Analistas can update fornecedores" ON public.fornecedores
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));

DROP POLICY IF EXISTS "Analistas can delete fornecedores" ON public.fornecedores;
CREATE POLICY "Analistas can delete fornecedores" ON public.fornecedores
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));

CREATE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- unidades
CREATE TABLE IF NOT EXISTS public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view unidades" ON public.unidades;
CREATE POLICY "Everyone can view unidades" ON public.unidades
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Analistas can insert unidades" ON public.unidades;
CREATE POLICY "Analistas can insert unidades" ON public.unidades
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'analista'::app_role));
DROP POLICY IF EXISTS "Analistas can update unidades" ON public.unidades;
CREATE POLICY "Analistas can update unidades" ON public.unidades
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));
DROP POLICY IF EXISTS "Analistas can delete unidades" ON public.unidades;
CREATE POLICY "Analistas can delete unidades" ON public.unidades
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));

INSERT INTO public.unidades (nome) VALUES ('Polo Saúde'), ('Pátio')
  ON CONFLICT (nome) DO NOTHING;

-- armazens
CREATE TABLE IF NOT EXISTS public.armazens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.armazens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view armazens" ON public.armazens;
CREATE POLICY "Everyone can view armazens" ON public.armazens
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Analistas can insert armazens" ON public.armazens;
CREATE POLICY "Analistas can insert armazens" ON public.armazens
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'analista'::app_role));
DROP POLICY IF EXISTS "Analistas can update armazens" ON public.armazens;
CREATE POLICY "Analistas can update armazens" ON public.armazens
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));
DROP POLICY IF EXISTS "Analistas can delete armazens" ON public.armazens;
CREATE POLICY "Analistas can delete armazens" ON public.armazens
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));

INSERT INTO public.armazens (nome) VALUES ('Armazém 1'), ('Armazém 2')
  ON CONFLICT (nome) DO NOTHING;

-- maquinas: restringir CRUD apenas a analistas
DROP POLICY IF EXISTS "Non-tecnicos can insert maquinas" ON public.maquinas;
DROP POLICY IF EXISTS "Non-tecnicos can update maquinas" ON public.maquinas;
DROP POLICY IF EXISTS "Non-tecnicos can delete maquinas" ON public.maquinas;

CREATE POLICY "Analistas can insert maquinas" ON public.maquinas
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'analista'::app_role));
CREATE POLICY "Analistas can update maquinas" ON public.maquinas
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));
CREATE POLICY "Analistas can delete maquinas" ON public.maquinas
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));

-- chamados: políticas atualizadas
DROP POLICY IF EXISTS "Non-tecnicos can create chamados" ON public.chamados;
CREATE POLICY "Non-tecnicos can create chamados" ON public.chamados
  FOR INSERT TO authenticated
  WITH CHECK (NOT public.has_role(auth.uid(), 'tecnico'::app_role));

DROP POLICY IF EXISTS "Assigned tecnico or non-tecnico can update chamados" ON public.chamados;
CREATE POLICY "Assigned or analista can update chamados" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'analista'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
    OR tecnico_id = auth.uid()
    OR tecnico2_id = auth.uid()
    OR (tecnico_id IS NULL AND public.has_role(auth.uid(), 'tecnico'::app_role))
  );

CREATE POLICY "Analistas can delete chamados" ON public.chamados
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));

-- chamado_acoes: técnico principal, segundo, ou analista
DROP POLICY IF EXISTS "Assigned tecnico can insert acoes" ON public.chamado_acoes;
CREATE POLICY "Assigned or analista can insert acoes" ON public.chamado_acoes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = tecnico_id
    AND (
      public.has_role(auth.uid(), 'analista'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.chamados c
        WHERE c.id = chamado_acoes.chamado_id
          AND (c.tecnico_id = auth.uid() OR c.tecnico2_id = auth.uid())
      )
    )
  );

-- profiles: analista pode excluir e atualizar qualquer perfil
CREATE POLICY "Analistas can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));

CREATE POLICY "Analistas can update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'analista'::app_role));

-- handle_new_user: incluir o campo 'area'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, username, role, nome, sobrenome, telefone, foto_url, unidade, armazem, area)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    (NEW.raw_user_meta_data->>'role')::app_role,
    NEW.raw_user_meta_data->>'nome',
    NEW.raw_user_meta_data->>'sobrenome',
    COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
    NEW.raw_user_meta_data->>'foto_url',
    NEW.raw_user_meta_data->>'unidade',
    NEW.raw_user_meta_data->>'armazem',
    NEW.raw_user_meta_data->>'area'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role);
  
  RETURN NEW;
END;
$function$;
