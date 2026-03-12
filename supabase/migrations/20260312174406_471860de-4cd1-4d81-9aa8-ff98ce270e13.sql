
CREATE OR REPLACE FUNCTION public.update_contato_sdr_field(
  p_whatsapp text,
  p_campo text,
  p_valor text,
  p_interesse text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Campos da tabela contatos_sdr_maquinagelo
  IF p_campo IN ('gasto_mensal', 'consumo_mensal', 'dias_semana') THEN
    EXECUTE format(
      'UPDATE contatos_sdr_maquinagelo SET %I = $1 WHERE whatsapp = $2',
      p_campo
    ) USING p_valor::numeric, p_whatsapp;
  ELSIF p_campo = 'cidade' THEN
    IF p_interesse = 'purificador' THEN
      UPDATE contatos_sdr_purificador SET cidade = p_valor WHERE whatsapp = p_whatsapp;
    ELSE
      UPDATE contatos_sdr_maquinagelo SET cidade = p_valor WHERE whatsapp = p_whatsapp;
    END IF;
  ELSIF p_campo = 'tipo_uso' THEN
    IF p_interesse = 'purificador' THEN
      UPDATE contatos_sdr_purificador SET tipo_uso = p_valor WHERE whatsapp = p_whatsapp;
    ELSE
      UPDATE contatos_sdr_maquinagelo SET tipo_uso = p_valor WHERE whatsapp = p_whatsapp;
    END IF;
  END IF;
END;
$$;
