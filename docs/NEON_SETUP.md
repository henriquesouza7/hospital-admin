# Configuração manual do Neon

Esta aplicação usa Neon Postgres como fonte de verdade, Neon Auth para identidade
e Neon Data API para acesso HTTP protegido por JWT e RLS. Nenhum segredo, endpoint
real ou connection string deve ser versionado.

## Preparar o projeto

1. Crie ou selecione um projeto Neon e escolha a região adequada ao ambiente.
2. Habilite o Neon Auth no projeto e configure o provedor de email/senha.
3. Desabilite o cadastro público; a criação de usuários deve ser feita pelo
   responsável do projeto ou pelo fluxo administrativo definido posteriormente.
4. Habilite a Neon Data API para a branch usada pela aplicação.
5. Aplique `db/migrations/20261001000000_create_audit_logs.sql` na branch alvo.
6. Crie manualmente o primeiro usuário administrativo no Neon Auth.

## Variáveis locais

Copie `.env.example` para `.env.local` e preencha os valores exibidos no painel do
Neon. As variáveis `NEXT_PUBLIC_*` são expostas ao navegador; `NEON_AUTH_BASE_URL`
e `NEON_AUTH_COOKIE_SECRET` são apenas server-side. O cookie secret deve ser um
valor aleatório com pelo menos 32 caracteres.

```text
NEXT_PUBLIC_NEON_AUTH_URL=
NEXT_PUBLIC_NEON_DATA_API_URL=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
```

Não use uma connection string do banco no cliente. Não compartilhe o cookie secret,
tokens ou valores copiados de produção.

## Desenvolvimento e branches

Execute `pnpm dev` depois de configurar as variáveis. Para testes e desenvolvimento
isolado, prefira branches Neon separadas e, quando dados existirem, branches sem
dados (schema-only) ou dados sintéticos. Nunca replique dados reais de pacientes
em branches locais, CI ou screenshots.

## Escopo atual

A aplicação oferece somente login email/senha, logout, proteção das rotas
administrativas e a base de auditoria. Recuperação de senha, cadastro público,
RBAC e os módulos de negócio serão implementados em etapas posteriores.
