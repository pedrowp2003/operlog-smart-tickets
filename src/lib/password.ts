export const PASSWORD_RULE_MSG =
  'A senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo.';

export function validatePassword(pw: string): string | null {
  if (!pw || pw.length < 8) return PASSWORD_RULE_MSG;
  if (!/[a-z]/.test(pw)) return PASSWORD_RULE_MSG;
  if (!/[A-Z]/.test(pw)) return PASSWORD_RULE_MSG;
  if (!/\d/.test(pw)) return PASSWORD_RULE_MSG;
  if (!/[^A-Za-z0-9]/.test(pw)) return PASSWORD_RULE_MSG;
  return null;
}