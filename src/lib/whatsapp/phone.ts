/**
 * Normaliza um telefone para o formato que o WhatsApp Cloud API usa no campo
 * `wa_id` (apenas dígitos, com DDI, sem "+"). Se vier só com DDD (10/11 dígitos,
 * como o usuário digitaria no cadastro), assume Brasil (55).
 */
export function normalizeWhatsAppPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}
