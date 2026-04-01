
-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN email text;

-- Update existing profiles with email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- Make email NOT NULL after populating
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;

-- Update handle_new_user to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, role, nome, sobrenome, telefone, foto_url, unidade, armazem)
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
    NEW.raw_user_meta_data->>'armazem'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role);
  
  RETURN NEW;
END;
$$;

-- Create function to get email by username (accessible to anon for login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM public.profiles WHERE username = _username LIMIT 1;
$$;
