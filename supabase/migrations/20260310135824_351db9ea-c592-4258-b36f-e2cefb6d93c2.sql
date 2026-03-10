INSERT INTO public.funil_tipos (id, nome, descricao, icone, cor, ordem, ativo)
VALUES ('custom', 'Personalizado', 'Funil criado pelo usuário', 'Settings', '#6B7280', 99, true)
ON CONFLICT (id) DO NOTHING;