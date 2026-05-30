-- Remove deletion notification trigger/function (chamados can't be deleted anyway)
DROP TRIGGER IF EXISTS trg_notify_chamado_deleted ON public.chamados;
DROP FUNCTION IF EXISTS public.notify_chamado_deleted();

-- Notify técnicos when chamado is archived (status -> Encerrado)
CREATE OR REPLACE FUNCTION public.notify_chamado_archived()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  actor UUID := auth.uid();
  actor_name TEXT;
BEGIN
  IF NEW.status = 'Encerrado' AND OLD.status <> 'Encerrado' THEN
    SELECT COALESCE(NULLIF(TRIM(nome || ' ' || COALESCE(sobrenome,'')),''), username, 'Analista')
      INTO actor_name FROM public.profiles WHERE id = actor;
    IF NEW.tecnico_id IS NOT NULL AND NEW.tecnico_id <> COALESCE(actor,'00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (NEW.tecnico_id, 'Chamado arquivado',
              actor_name || ' arquivou o chamado ' || NEW.numero, '/dashboard');
    END IF;
    IF NEW.tecnico2_id IS NOT NULL
       AND NEW.tecnico2_id <> COALESCE(NEW.tecnico_id,'00000000-0000-0000-0000-000000000000'::uuid)
       AND NEW.tecnico2_id <> COALESCE(actor,'00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (NEW.tecnico2_id, 'Chamado arquivado',
              actor_name || ' arquivou o chamado ' || NEW.numero, '/dashboard');
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_notify_chamado_archived ON public.chamados;
CREATE TRIGGER trg_notify_chamado_archived
AFTER UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.notify_chamado_archived();

-- Notify técnicos when an ação is marked desconsiderada (false -> true)
CREATE OR REPLACE FUNCTION public.notify_acao_desconsiderada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  actor UUID := auth.uid();
  actor_name TEXT;
  t1 UUID; t2 UUID; ch_num TEXT;
BEGIN
  IF NEW.desconsiderada = true AND COALESCE(OLD.desconsiderada,false) = false THEN
    SELECT tecnico_id, tecnico2_id, numero INTO t1, t2, ch_num
      FROM public.chamados WHERE id = NEW.chamado_id;
    SELECT COALESCE(NULLIF(TRIM(nome || ' ' || COALESCE(sobrenome,'')),''), username, 'Analista')
      INTO actor_name FROM public.profiles WHERE id = actor;
    IF t1 IS NOT NULL AND t1 <> COALESCE(actor,'00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (t1, 'Ação desconsiderada',
              actor_name || ' desconsiderou uma ação do chamado ' || COALESCE(ch_num,''), '/dashboard');
    END IF;
    IF t2 IS NOT NULL
       AND t2 <> COALESCE(t1,'00000000-0000-0000-0000-000000000000'::uuid)
       AND t2 <> COALESCE(actor,'00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (t2, 'Ação desconsiderada',
              actor_name || ' desconsiderou uma ação do chamado ' || COALESCE(ch_num,''), '/dashboard');
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_notify_acao_desconsiderada ON public.chamado_acoes;
CREATE TRIGGER trg_notify_acao_desconsiderada
AFTER UPDATE ON public.chamado_acoes
FOR EACH ROW EXECUTE FUNCTION public.notify_acao_desconsiderada();

-- Drop legacy acao-deleted notifier (acoes can no longer be deleted)
DROP TRIGGER IF EXISTS trg_notify_acao_deleted ON public.chamado_acoes;
DROP FUNCTION IF EXISTS public.notify_acao_deleted();
