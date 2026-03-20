export const SUPER_ADMIN_EMAILS = [
  'guidugli.gustavo@gmail.com',
  'matheussenacarneiro2322@gmail.com',
];

export const isSuperAdmin = (email?: string | null): boolean =>
  SUPER_ADMIN_EMAILS.includes(email ?? '');
