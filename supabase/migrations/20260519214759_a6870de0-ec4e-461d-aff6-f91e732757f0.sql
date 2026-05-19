
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Make handle_new_user copy must_change_password from metadata (default false)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, username, role, nome, sobrenome, telefone, foto_url, unidade, armazem, area, must_change_password)
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
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role);
  
  RETURN NEW;
END;
$function$;
