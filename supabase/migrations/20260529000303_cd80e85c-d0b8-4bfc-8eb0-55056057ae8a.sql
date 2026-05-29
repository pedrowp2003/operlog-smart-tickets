
-- 1. Add new columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_master_analista boolean NOT NULL DEFAULT false;
ALTER TABLE public.chamado_acoes ADD COLUMN IF NOT EXISTS desconsiderada boolean NOT NULL DEFAULT false;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS servico_descricao text;

-- 2. Helper function
CREATE OR REPLACE FUNCTION public.is_master_analista(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_master_analista FROM public.profiles WHERE id = _user_id), false)
$$;

-- 3. Update handle_new_user to read is_master_analista from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, role, nome, sobrenome, telefone, foto_url, unidade, armazem, area, must_change_password, is_master_analista)
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
    NEW.raw_user_meta_data->>'area',
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'is_master_analista')::boolean, false)
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role);
  RETURN NEW;
END;
$$;

-- 4. Drop profile-update notification function and any trigger
DROP TRIGGER IF EXISTS notify_profile_updated_trigger ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
DROP FUNCTION IF EXISTS public.notify_profile_updated() CASCADE;

-- 5. Update notify_chamado_progress to include pickup message and service description
CREATE OR REPLACE FUNCTION public.notify_chamado_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor UUID := auth.uid();
BEGIN
  IF NEW.status = 'Concluído' AND OLD.status <> 'Concluído' THEN
    IF NEW.criado_por <> COALESCE(actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (NEW.criado_por, 'Chamado concluído',
              'O chamado ' || NEW.numero || ' foi concluído. Venha buscar a máquina.' ||
              CASE WHEN COALESCE(NEW.servico_descricao,'') <> '' THEN ' Serviço: ' || NEW.servico_descricao ELSE '' END,
              '/dashboard');
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.progresso IS DISTINCT FROM OLD.progresso AND NEW.progresso > COALESCE(OLD.progresso, 0) THEN
    IF NEW.criado_por <> COALESCE(actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (NEW.criado_por, 'Progresso atualizado',
              'Chamado ' || NEW.numero || ' agora em ' || NEW.progresso || '%', '/dashboard');
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- 6. Remove delete privileges for analistas on chamados and chamado_acoes
DROP POLICY IF EXISTS "Analistas can delete chamados" ON public.chamados;
DROP POLICY IF EXISTS "Analistas can delete acoes" ON public.chamado_acoes;

-- 7. Replace profiles delete/update analista policies with hierarchy-aware versions
DROP POLICY IF EXISTS "Analistas can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Analistas can update profiles" ON public.profiles;

CREATE POLICY "Analistas can delete profiles by hierarchy"
ON public.profiles FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'analista'::app_role)
  AND id <> auth.uid()
  AND (
    NOT has_role(id, 'analista'::app_role)
    OR (is_master_analista(auth.uid()) AND NOT is_master_analista(id))
  )
);

CREATE POLICY "Analistas can update profiles by hierarchy"
ON public.profiles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'analista'::app_role)
  AND (
    NOT has_role(id, 'analista'::app_role)
    OR (is_master_analista(auth.uid()) AND NOT is_master_analista(id))
    OR id = auth.uid()
  )
);
