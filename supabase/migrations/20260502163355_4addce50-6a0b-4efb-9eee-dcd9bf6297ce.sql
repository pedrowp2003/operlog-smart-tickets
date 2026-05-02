DROP POLICY IF EXISTS "Assigned or analista can update chamados" ON public.chamados;
CREATE POLICY "Assigned or analista can update chamados"
ON public.chamados FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(),'analista'::app_role)
  OR has_role(auth.uid(),'gerente'::app_role)
  OR has_role(auth.uid(),'coordenador'::app_role)
  OR has_role(auth.uid(),'supervisor'::app_role)
  OR tecnico_id = auth.uid()
  OR tecnico2_id = auth.uid()
  OR (tecnico_id IS NULL AND has_role(auth.uid(),'tecnico'::app_role))
  OR (tecnico2_id IS NULL AND has_role(auth.uid(),'tecnico'::app_role))
);

CREATE POLICY "Analistas can update acoes"
ON public.chamado_acoes FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'analista'::app_role));

CREATE POLICY "Analistas can delete acoes"
ON public.chamado_acoes FOR DELETE TO authenticated
USING (has_role(auth.uid(),'analista'::app_role));