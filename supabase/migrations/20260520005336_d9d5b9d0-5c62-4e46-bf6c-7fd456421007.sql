CREATE OR REPLACE FUNCTION public.notify_chamado_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  actor_name TEXT;
  a_id UUID;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(nome || ' ' || COALESCE(sobrenome,'')),''), username, 'Usuário')
    INTO actor_name FROM public.profiles WHERE id = NEW.criado_por;
  FOR a_id IN SELECT public.get_analista_ids() LOOP
    IF a_id <> NEW.criado_por THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (a_id, 'Novo chamado aberto',
              actor_name || ' abriu o chamado ' || NEW.numero, '/dashboard');
    END IF;
  END LOOP;
  RETURN NEW;
END $function$;