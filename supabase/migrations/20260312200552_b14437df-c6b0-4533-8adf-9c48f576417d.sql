
-- 1. Add funil_id column to lista_interesses
ALTER TABLE public.lista_interesses 
  ADD COLUMN funil_id bigint REFERENCES public.funis(id) ON DELETE SET NULL;

-- 2. Populate funil_id for existing interests by matching funis.tipo = lista_interesses.nome AND same empresa
UPDATE public.lista_interesses li
SET funil_id = f.id
FROM public.funis f
WHERE f.tipo = li.nome
  AND f.id_empresa = li.empresa_id
  AND f.ativo = true;

-- 3. Drop the old conflicting etiqueta trigger that uses gasto_mensal 
-- (keeping only the consumo_mensal one from the more recent migration)
DROP TRIGGER IF EXISTS trg_sync_etiqueta ON public.contatos_sdr_maquinagelo;
DROP FUNCTION IF EXISTS public.sync_etiqueta_por_gasto();
