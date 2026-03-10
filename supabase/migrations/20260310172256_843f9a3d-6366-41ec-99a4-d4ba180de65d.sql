-- Allow 'email' as a valid tipo
ALTER TABLE public.convites DROP CONSTRAINT convites_tipo_check;
ALTER TABLE public.convites ADD CONSTRAINT convites_tipo_check CHECK (tipo = ANY (ARRAY['link'::text, 'codigo'::text, 'email'::text]));

-- Allow codigo to be NULL for tipo = 'email' too
ALTER TABLE public.convites DROP CONSTRAINT codigo_required_for_tipo_codigo;
ALTER TABLE public.convites ADD CONSTRAINT codigo_required_for_tipo_codigo CHECK (
  (tipo = 'link' AND codigo IS NULL) OR 
  (tipo = 'codigo' AND codigo IS NOT NULL) OR 
  (tipo = 'email' AND codigo IS NULL)
);