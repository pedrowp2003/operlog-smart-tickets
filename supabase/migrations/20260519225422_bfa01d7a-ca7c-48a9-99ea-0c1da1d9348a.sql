
ALTER TABLE public.maquina_tipos ADD COLUMN IF NOT EXISTS prioridade boolean NOT NULL DEFAULT false;
UPDATE public.maquina_tipos SET prioridade = true WHERE lower(nome) IN ('meclift', 'stacker');
INSERT INTO public.maquina_tipos (nome, prioridade)
SELECT v.nome, true FROM (VALUES ('Meclift'), ('Stacker')) AS v(nome)
WHERE NOT EXISTS (SELECT 1 FROM public.maquina_tipos t WHERE lower(t.nome) = lower(v.nome));
