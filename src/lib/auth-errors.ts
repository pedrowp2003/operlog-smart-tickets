const map: { pattern: RegExp; message: string }[] = [
  [/invalid login credentials/i, 'Usuário ou senha inválidos'],
  [/email not confirmed/i, 'E-mail ainda não confirmado. Verifique sua caixa de entrada.'],
  [/user already registered|already registered|already.*exists/i, 'Este usuário já existe'],
  [/duplicate key value.*username/i, 'Este nome de usuário já está em uso'],
  [/duplicate key value.*email/i, 'Este e-mail já está cadastrado'],
  [/duplicate key value/i, 'Registro duplicado'],
  [/password should be at least (\d+)/i, 'A senha deve ter no mínimo $1 caracteres'],
  [/weak password|password.*too short/i, 'A senha é muito fraca'],
  [/invalid email/i, 'E-mail inválido'],
  [/email rate limit exceeded/i, 'Limite de envios de e-mail atingido. Tente novamente em alguns minutos.'],
  [/over email send rate limit|too many requests|rate limit/i, 'Muitas tentativas. Aguarde alguns instantes e tente novamente.'],
  [/network|failed to fetch/i, 'Falha de conexão. Verifique sua internet.'],
  [/user not found/i, 'Usuário não encontrado'],
  [/new password should be different/i, 'A nova senha deve ser diferente da atual'],
  [/signup.*disabled|signups not allowed/i, 'Cadastros estão desabilitados no momento'],
  [/token has expired|jwt expired/i, 'Sessão expirada. Faça login novamente.'],
  [/anonymous sign-?ins are disabled/i, 'Cadastros anônimos estão desabilitados'],
].map(([pattern, message]) => ({ pattern: pattern as RegExp, message: message as string }));

export function translateAuthError(message?: string | null): string {
  if (!message) return 'Ocorreu um erro. Tente novamente.';
  for (const { pattern, message: pt } of map) {
    const m = message.match(pattern);
    if (m) return pt.replace('$1', m[1] ?? '');
  }
  return message;
}