
INSERT INTO user_empresa (user_id, empresa_id, role)
VALUES ('89a6ca88-181a-40dd-b4e4-262eff0b7460', 1, 'admin')
ON CONFLICT (user_id, empresa_id) DO UPDATE SET role = 'admin';

INSERT INTO user_empresa_geral (user_id, empresa_id)
VALUES ('89a6ca88-181a-40dd-b4e4-262eff0b7460', 1)
ON CONFLICT (user_id) DO UPDATE SET empresa_id = 1;

INSERT INTO user_permissions (user_id, is_admin)
VALUES ('89a6ca88-181a-40dd-b4e4-262eff0b7460', true)
ON CONFLICT (user_id) DO UPDATE SET is_admin = true;
