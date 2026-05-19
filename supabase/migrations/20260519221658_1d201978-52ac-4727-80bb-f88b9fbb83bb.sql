
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System inserts notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Helper: get all analista user ids
CREATE OR REPLACE FUNCTION public.get_analista_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT user_id FROM public.user_roles WHERE role = 'analista'; $$;

-- ===== Trigger: chamado updates (assign / accept) =====
CREATE OR REPLACE FUNCTION public.notify_chamado_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor UUID := auth.uid();
  is_actor_analista BOOLEAN := has_role(actor, 'analista'::app_role);
  is_actor_tecnico BOOLEAN := has_role(actor, 'tecnico'::app_role);
  actor_name TEXT;
  ch_num TEXT := NEW.numero;
  a_id UUID;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(nome || ' ' || COALESCE(sobrenome,'')),''), username, 'Alguém')
    INTO actor_name FROM public.profiles WHERE id = actor;

  -- Técnico principal atrelado
  IF NEW.tecnico_id IS DISTINCT FROM OLD.tecnico_id AND NEW.tecnico_id IS NOT NULL THEN
    IF is_actor_analista AND NEW.tecnico_id <> COALESCE(actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (NEW.tecnico_id, 'Você foi atribuído a um chamado',
              actor_name || ' atribuiu você ao chamado ' || ch_num, '/dashboard');
    ELSIF is_actor_tecnico AND NEW.tecnico_id = actor THEN
      FOR a_id IN SELECT public.get_analista_ids() LOOP
        INSERT INTO public.notifications (user_id, title, message, link)
        VALUES (a_id, 'Chamado aceito',
                actor_name || ' aceitou o chamado ' || ch_num, '/dashboard');
      END LOOP;
    END IF;
  END IF;

  -- Segundo técnico atrelado
  IF NEW.tecnico2_id IS DISTINCT FROM OLD.tecnico2_id AND NEW.tecnico2_id IS NOT NULL THEN
    IF is_actor_analista AND NEW.tecnico2_id <> COALESCE(actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (NEW.tecnico2_id, 'Você foi atribuído a um chamado',
              actor_name || ' atribuiu você ao chamado ' || ch_num, '/dashboard');
    ELSIF is_actor_tecnico AND NEW.tecnico2_id = actor THEN
      FOR a_id IN SELECT public.get_analista_ids() LOOP
        INSERT INTO public.notifications (user_id, title, message, link)
        VALUES (a_id, 'Chamado aceito',
                actor_name || ' aceitou o chamado ' || ch_num, '/dashboard');
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_chamado_changes
  AFTER UPDATE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.notify_chamado_changes();

-- ===== Trigger: chamado deletion by analista → notify técnicos atrelados =====
CREATE OR REPLACE FUNCTION public.notify_chamado_deleted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor UUID := auth.uid();
  actor_name TEXT;
BEGIN
  IF NOT has_role(actor, 'analista'::app_role) THEN RETURN OLD; END IF;
  SELECT COALESCE(NULLIF(TRIM(nome || ' ' || COALESCE(sobrenome,'')),''), username, 'Analista')
    INTO actor_name FROM public.profiles WHERE id = actor;
  IF OLD.tecnico_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (OLD.tecnico_id, 'Chamado excluído',
            actor_name || ' excluiu o chamado ' || OLD.numero);
  END IF;
  IF OLD.tecnico2_id IS NOT NULL AND OLD.tecnico2_id <> COALESCE(OLD.tecnico_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (OLD.tecnico2_id, 'Chamado excluído',
            actor_name || ' excluiu o chamado ' || OLD.numero);
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER trg_notify_chamado_deleted
  BEFORE DELETE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.notify_chamado_deleted();

-- ===== Trigger: ação adicionada → notifica analistas =====
CREATE OR REPLACE FUNCTION public.notify_acao_inserted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor UUID := auth.uid();
  actor_name TEXT;
  ch_num TEXT;
  a_id UUID;
BEGIN
  IF NOT has_role(actor, 'tecnico'::app_role) THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(nome || ' ' || COALESCE(sobrenome,'')),''), username, 'Técnico')
    INTO actor_name FROM public.profiles WHERE id = actor;
  SELECT numero INTO ch_num FROM public.chamados WHERE id = NEW.chamado_id;
  FOR a_id IN SELECT public.get_analista_ids() LOOP
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (a_id, 'Nova ação no chamado',
            actor_name || ' adicionou uma ação ao chamado ' || COALESCE(ch_num, ''), '/dashboard');
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_acao_inserted
  AFTER INSERT ON public.chamado_acoes
  FOR EACH ROW EXECUTE FUNCTION public.notify_acao_inserted();

-- ===== Trigger: ação excluída por analista → notifica técnicos atrelados =====
CREATE OR REPLACE FUNCTION public.notify_acao_deleted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor UUID := auth.uid();
  actor_name TEXT;
  t1 UUID; t2 UUID; ch_num TEXT;
BEGIN
  IF NOT has_role(actor, 'analista'::app_role) THEN RETURN OLD; END IF;
  SELECT tecnico_id, tecnico2_id, numero INTO t1, t2, ch_num
    FROM public.chamados WHERE id = OLD.chamado_id;
  SELECT COALESCE(NULLIF(TRIM(nome || ' ' || COALESCE(sobrenome,'')),''), username, 'Analista')
    INTO actor_name FROM public.profiles WHERE id = actor;
  IF t1 IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (t1, 'Ação excluída',
            actor_name || ' excluiu uma ação do chamado ' || COALESCE(ch_num,''));
  END IF;
  IF t2 IS NOT NULL AND t2 <> COALESCE(t1, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (t2, 'Ação excluída',
            actor_name || ' excluiu uma ação do chamado ' || COALESCE(ch_num,''));
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER trg_notify_acao_deleted
  BEFORE DELETE ON public.chamado_acoes
  FOR EACH ROW EXECUTE FUNCTION public.notify_acao_deleted();

-- ===== Trigger: profile update → notifica analistas =====
CREATE OR REPLACE FUNCTION public.notify_profile_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor UUID := auth.uid();
  actor_name TEXT;
  a_id UUID;
BEGIN
  IF actor IS NULL OR actor <> NEW.id THEN RETURN NEW; END IF;
  IF NEW.username = OLD.username AND NEW.email = OLD.email
     AND NEW.telefone = OLD.telefone
     AND COALESCE(NEW.nome,'') = COALESCE(OLD.nome,'')
     AND COALESCE(NEW.sobrenome,'') = COALESCE(OLD.sobrenome,'')
     AND COALESCE(NEW.unidade,'') = COALESCE(OLD.unidade,'')
     AND COALESCE(NEW.armazem,'') = COALESCE(OLD.armazem,'')
     AND COALESCE(NEW.foto_url,'') = COALESCE(OLD.foto_url,'') THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(NULLIF(TRIM(NEW.nome || ' ' || COALESCE(NEW.sobrenome,'')),''), NEW.username, 'Usuário')
    INTO actor_name;
  FOR a_id IN SELECT public.get_analista_ids() LOOP
    IF a_id <> actor THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (a_id, 'Perfil atualizado',
              actor_name || ' alterou suas informações de usuário', '/dashboard');
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_profile_updated();
