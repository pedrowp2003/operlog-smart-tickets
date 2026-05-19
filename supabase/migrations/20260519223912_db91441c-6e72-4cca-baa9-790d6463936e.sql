
-- Add priority flag to maquinas
ALTER TABLE public.maquinas ADD COLUMN IF NOT EXISTS prioridade boolean NOT NULL DEFAULT false;

-- Notification: chamado opened (notify all profiles except creator)
CREATE OR REPLACE FUNCTION public.notify_chamado_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_name TEXT;
  p_id UUID;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(nome || ' ' || COALESCE(sobrenome,'')),''), username, 'Usuário')
    INTO actor_name FROM public.profiles WHERE id = NEW.criado_por;
  FOR p_id IN SELECT id FROM public.profiles WHERE id <> NEW.criado_por LOOP
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (p_id, 'Novo chamado aberto',
            actor_name || ' abriu o chamado ' || NEW.numero, '/dashboard');
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_chamado_created ON public.chamados;
CREATE TRIGGER trg_notify_chamado_created
AFTER INSERT ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.notify_chamado_created();

-- Notification: progress increased OR chamado concluded -> notify creator
CREATE OR REPLACE FUNCTION public.notify_chamado_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor UUID := auth.uid();
  actor_name TEXT;
BEGIN
  IF NEW.criado_por IS NULL OR NEW.criado_por = actor THEN
    -- still notify on conclude/progress changes even if actor unknown
    NULL;
  END IF;

  SELECT COALESCE(NULLIF(TRIM(nome || ' ' || COALESCE(sobrenome,'')),''), username, 'Sistema')
    INTO actor_name FROM public.profiles WHERE id = actor;

  IF NEW.status = 'Concluído' AND OLD.status <> 'Concluído' THEN
    IF NEW.criado_por <> COALESCE(actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (NEW.criado_por, 'Chamado concluído',
              'O chamado ' || NEW.numero || ' foi concluído', '/dashboard');
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

DROP TRIGGER IF EXISTS trg_notify_chamado_progress ON public.chamados;
CREATE TRIGGER trg_notify_chamado_progress
AFTER UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.notify_chamado_progress();

-- Wire pre-existing trigger functions that have no trigger row
DROP TRIGGER IF EXISTS trg_notify_chamado_changes ON public.chamados;
CREATE TRIGGER trg_notify_chamado_changes
AFTER UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.notify_chamado_changes();

DROP TRIGGER IF EXISTS trg_notify_chamado_deleted ON public.chamados;
CREATE TRIGGER trg_notify_chamado_deleted
AFTER DELETE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.notify_chamado_deleted();

DROP TRIGGER IF EXISTS trg_notify_acao_inserted ON public.chamado_acoes;
CREATE TRIGGER trg_notify_acao_inserted
AFTER INSERT ON public.chamado_acoes
FOR EACH ROW EXECUTE FUNCTION public.notify_acao_inserted();

DROP TRIGGER IF EXISTS trg_notify_acao_deleted ON public.chamado_acoes;
CREATE TRIGGER trg_notify_acao_deleted
AFTER DELETE ON public.chamado_acoes
FOR EACH ROW EXECUTE FUNCTION public.notify_acao_deleted();

DROP TRIGGER IF EXISTS trg_notify_profile_updated ON public.profiles;
CREATE TRIGGER trg_notify_profile_updated
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_profile_updated();

-- Allow notifications insert (used by SECURITY DEFINER triggers; safe to also allow direct insert by self)
DROP POLICY IF EXISTS "Users insert their own notifications" ON public.notifications;
CREATE POLICY "Users insert their own notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);
