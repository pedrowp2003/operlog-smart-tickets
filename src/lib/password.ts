/**
 * Password policy: minimum 8 chars, at least one lowercase, one uppercase,
 * one digit and one symbol.
 */
export const PASSWORD_RULES_TEXT =
  'A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, minúscula, número e símbolo.';

export function validatePassword(pwd: string): string | null {
  if (!pwd || pwd.length < 8) return PASSWORD_RULES_TEXT;
  if (!/[a-z]/.test(pwd)) return PASSWORD_RULES_TEXT;
  if (!/[A-Z]/.test(pwd)) return PASSWORD_RULES_TEXT;
  if (!/[0-9]/.test(pwd)) return PASSWORD_RULES_TEXT;
  if (!/[^a-zA-Z0-9]/.test(pwd)) return PASSWORD_RULES_TEXT;
  return null;
}