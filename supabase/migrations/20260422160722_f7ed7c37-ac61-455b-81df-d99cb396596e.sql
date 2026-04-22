UPDATE public.maquinas SET armazem = 'Armazém 1' WHERE armazem = 'AZ1';
UPDATE public.maquinas SET armazem = 'Armazém 2' WHERE armazem = 'AZ2';
DELETE FROM public.maquinas WHERE armazem = 'AZ3' OR unidade = 'Alimentos';
UPDATE public.profiles SET armazem = 'Armazém 1' WHERE armazem = 'AZ1';
UPDATE public.profiles SET armazem = 'Armazém 2' WHERE armazem = 'AZ2';
UPDATE public.profiles SET armazem = NULL WHERE armazem = 'AZ3';
UPDATE public.profiles SET unidade = NULL WHERE unidade = 'Alimentos';