ALTER TABLE public.chamados
  ADD COLUMN data_inicio timestamp with time zone,
  ADD COLUMN data_prevista_termino timestamp with time zone,
  ADD COLUMN progresso integer NOT NULL DEFAULT 0;