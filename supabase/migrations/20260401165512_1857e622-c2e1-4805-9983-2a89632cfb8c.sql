
CREATE TABLE public.chamado_acoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  tecnico_id UUID NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chamado_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view chamado_acoes"
ON public.chamado_acoes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Assigned tecnico can insert acoes"
ON public.chamado_acoes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = tecnico_id
  AND EXISTS (
    SELECT 1 FROM public.chamados
    WHERE id = chamado_id AND tecnico_id = auth.uid()
  )
);
