
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('gerente', 'coordenador', 'supervisor', 'tecnico');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  role app_role NOT NULL,
  nome TEXT,
  sobrenome TEXT,
  telefone TEXT NOT NULL,
  foto_url TEXT,
  unidade TEXT,
  armazem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (for security-definer checks)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Everyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Everyone can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Maquinas table
CREATE TABLE public.maquinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  frota TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  unidade TEXT NOT NULL,
  armazem TEXT NOT NULL,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maquinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view maquinas" ON public.maquinas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Non-tecnicos can insert maquinas" ON public.maquinas FOR INSERT TO authenticated
  WITH CHECK (NOT public.has_role(auth.uid(), 'tecnico'));
CREATE POLICY "Non-tecnicos can update maquinas" ON public.maquinas FOR UPDATE TO authenticated
  USING (NOT public.has_role(auth.uid(), 'tecnico'));
CREATE POLICY "Non-tecnicos can delete maquinas" ON public.maquinas FOR DELETE TO authenticated
  USING (NOT public.has_role(auth.uid(), 'tecnico'));

-- Chamados table
CREATE TABLE public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  maquina_id UUID NOT NULL REFERENCES public.maquinas(id) ON DELETE CASCADE,
  situacao_maquina TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aberto',
  categoria TEXT,
  tecnico_id UUID REFERENCES auth.users(id),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view chamados" ON public.chamados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Non-tecnicos can create chamados" ON public.chamados FOR INSERT TO authenticated
  WITH CHECK (NOT public.has_role(auth.uid(), 'tecnico'));
CREATE POLICY "Gerentes can delete chamados" ON public.chamados FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Assigned tecnico or non-tecnico can update chamados" ON public.chamados FOR UPDATE TO authenticated
  USING (
    NOT public.has_role(auth.uid(), 'tecnico')
    OR tecnico_id = auth.uid()
    OR (tecnico_id IS NULL AND public.has_role(auth.uid(), 'tecnico'))
  );

-- Auto-generate chamado number
CREATE OR REPLACE FUNCTION public.generate_chamado_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 4) AS INT)), 0) + 1
    INTO next_num FROM public.chamados;
  NEW.numero := 'CH-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_chamado_numero
  BEFORE INSERT ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_chamado_numero();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maquinas_updated_at BEFORE UPDATE ON public.maquinas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chamados_updated_at BEFORE UPDATE ON public.chamados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile trigger (from auth signup metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, nome, sobrenome, telefone, foto_url, unidade, armazem)
  VALUES (
    NEW.id,
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

CREATE POLICY "Anyone can view images" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Authenticated users can upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');
CREATE POLICY "Authenticated users can update their images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'images');
CREATE POLICY "Authenticated users can delete their images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images');
