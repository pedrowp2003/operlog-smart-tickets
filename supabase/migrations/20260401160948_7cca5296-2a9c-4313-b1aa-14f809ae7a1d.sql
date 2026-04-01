
-- Allow gerente to delete any profile (for removing técnicos)
CREATE POLICY "Gerentes can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'gerente'::app_role)
);
