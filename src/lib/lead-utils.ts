/**
 * Utility functions for lead identity resolution and WhatsApp link building.
 */

/** Strips all non-digit characters from a string */
function digitsOnly(str: string): string {
  return str.replace(/\D/g, '');
}

/** Detects if the lead's `nome` field is actually a phone number (fallback from trigger) */
export function isPhoneAsName(nome: string | null, whatsapp: string | null): boolean {
  if (!nome) return true;
  const nomeDigits = digitsOnly(nome);
  // If nome is mostly digits (8+ digits), treat it as a phone number
  if (nomeDigits.length >= 8 && nomeDigits.length / nome.replace(/\s/g, '').length > 0.7) {
    return true;
  }
  // If nome matches the whatsapp number
  if (whatsapp) {
    const wpDigits = digitsOnly(whatsapp);
    if (nomeDigits === wpDigits) return true;
    // Check with/without country code
    if (nomeDigits.startsWith('55') && nomeDigits.slice(2) === wpDigits) return true;
    if (wpDigits.startsWith('55') && wpDigits.slice(2) === nomeDigits) return true;
  }
  return false;
}

/** Formats a phone number for display: (XX) XXXXX-XXXX */
export function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return '';
  const digits = digitsOnly(phone);
  // Brazilian format with country code: 55 XX XXXXX-XXXX
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9);
    return `(${ddd}) ${part1}-${part2}`;
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 8);
    const part2 = digits.slice(8);
    return `(${ddd}) ${part1}-${part2}`;
  }
  // Without country code: XX XXXXX-XXXX
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone; // Return as-is if format is unknown
}

/** Returns the best display name for a lead */
export function getLeadDisplayName(nome: string | null, whatsapp: string | null): string {
  if (!nome) return formatPhoneDisplay(whatsapp) || 'Sem nome';
  if (isPhoneAsName(nome, whatsapp)) {
    return formatPhoneDisplay(whatsapp || nome) || nome;
  }
  return nome;
}

/** Returns initials for the avatar. Returns null if the name is a phone number. */
export function getLeadInitials(nome: string | null, whatsapp: string | null): string | null {
  if (!nome || isPhoneAsName(nome, whatsapp)) return null;
  return nome
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Builds a WhatsApp link from a phone number */
export function buildWhatsAppLink(phone: string | null): string | null {
  if (!phone) return null;
  let digits = digitsOnly(phone);
  if (!digits) return null;
  // Ensure Brazilian country code
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = '55' + digits;
  }
  return `https://wa.me/${digits}`;
}
