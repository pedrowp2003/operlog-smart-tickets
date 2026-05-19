# Plano de implementação

Esse pedido tem muitas mudanças independentes. Proponho dividir assim e confirmar antes de codar, porque algumas decisões impactam segurança e UX.

## 1. Autenticação e cadastro
- Remover botão "Cadastrar-se" da tela inicial. No lugar: **"Área do Analista"** → tela com duas opções: *Entrar* e *Cadastrar-se (analista)*.
- Cadastro de analista exige senha de administrador `admin123@` (validada no cliente por enquanto; ideal seria via edge function — confirmar).
- Demais usuários (gerente, coordenador, supervisor, técnico) só podem ser criados pelo analista, dentro do app (aba Usuários/Técnicos já existe — adicionar botão "Criar usuário" lá).
- **Primeiro acesso**: analista cria usuário com senha temporária aleatória; ao logar pela 1ª vez, usuário é forçado a definir nova senha.
- Política de senha: mín. 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 símbolo. Aplicar em registro, troca de senha e primeira definição.
- Remover opção "Excluir conta" do menu de perfil. Manter edição das próprias informações.

## 2. Reset em massa de senhas
- Resetar **todas** as senhas existentes para `Pipoca123#` via edge function com `SUPABASE_SERVICE_ROLE_KEY` (admin API). Executo uma vez.
- ⚠️ Confirmação: isso afeta todos os usuários atuais. Ok?

## 3. Chamados — visual e prioridade
- Contagem de chamados atribuídos ao lado do nome do técnico no seletor de atribuição (em **azul**).
- Borda colorida no card do chamado quando `status = 'Aberto'`:
  - >1h: verde; >2h: amarelo; >3h: vermelho. Calculado a partir de `created_at`. Atualiza a cada 60s.
- Ícone de prioridade (ex.: `AlertTriangle` âmbar) no chamado cuja máquina seja de um **tipo prioritário**.

## 4. Categorias de máquinas (novo)
- Nova tabela `maquina_categorias` com colunas: `tipo` (enum: tipo/modelo/marca/frota), `valor`, `prioritario` (bool, só p/ tipo).
- Migrar listas estáticas atuais para a tabela (seed inicial com Meclift/Stacker marcados como prioritários).
- Modal "Alterar categorias" na aba Máquinas (somente analista): adicionar/editar/excluir cada categoria; checkbox "prioritário" para tipos.
- Formulário de cadastro de máquina passa a usar essas categorias dinamicamente.

## 5. Notificações
Duas camadas:
- **In-app**: nova tabela `notificacoes` (user_id, titulo, mensagem, lida, link, created_at) + sino no header com badge + lista. Realtime via Supabase.
- **Push (navegador + celular)**: Web Push API com Service Worker e VAPID. Usuário precisa permitir. No celular funciona como PWA instalada (Android). iOS exige PWA instalada também.

Gatilhos (edge functions + triggers no banco):
1. Progresso de chamado muda ou é concluído → notifica criador.
2. Chamado aberto → notifica analistas e técnicos da área.
3. Chamado aberto há 1h/2h/3h → notifica analistas (job pg_cron rodando a cada 5 min).
4. Técnico atrelado → notifica esse técnico.
5. Usuário altera suas informações → notifica analistas.
6. Técnico aceita chamado → notifica analistas.
7. Técnico adiciona ação → notifica analistas.
8. Analista exclui chamado ou ação → notifica técnicos atrelados.

## Ordem de entrega sugerida
Por tamanho, sugiro entregar em 3 PRs:
- **PR1**: Auth (remover signup público, área do analista, política de senha, reset em massa, primeira senha, remover exclusão de conta).
- **PR2**: Chamados (contagem por técnico, bordas por tempo, ícone de prioridade) + categorias de máquinas dinâmicas.
- **PR3**: Sistema de notificações in-app + push + todos os gatilhos.

## Perguntas antes de começar
1. Confirma reset de **todas** as senhas atuais para `Pipoca123#`?
2. A senha `admin123@` de cadastro de analista pode ficar como secret (`ANALISTA_SIGNUP_PASSWORD`) validada via edge function, ou prefere hard-coded no cliente (menos seguro)?
3. Push notifications no iPhone exigem que o usuário **instale o app como PWA** (limitação do iOS, não temos como contornar). Confirma que serve?
4. Posso começar pelo PR1 e seguir em sequência, ou prefere outra ordem?
