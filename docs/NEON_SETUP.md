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
6. Crie o primeiro usuário administrativo usando uma operação oficial do Neon
   Auth. A senha deve ser digitada em um prompt local seguro e nunca deve ser
   colocada em `.env.local`, código, logs ou Git.
7. Se o usuário já existir sem credencial de senha, não edite `neon_auth` por
   SQL. Remova e recrie somente um usuário de teste sem sessões ou dados
   associados, usando a CLI/API oficial do Neon Auth.

O fluxo de recuperação da aplicação exige um provedor de email transacional
configurado no Neon Auth. Sem SMTP/provider, não considere que um email de
reset foi enviado; o login normal por email e senha não depende desse fluxo.

## Variáveis locais

Copie `.env.example` para `.env.local` e preencha os valores exibidos no painel do
Neon. Todas as variáveis desta etapa são server-side; `NEON_AUTH_COOKIE_SECRET`
deve ser um valor aleatório com pelo menos 32 caracteres.

```text
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
NEON_DATA_API_URL=
```

Não use uma connection string do banco no cliente. O Data API é acessado pelo
helper server-only, que obtém o JWT atual via `auth.token()` e o envia apenas nas
requisições de servidor. Não compartilhe o cookie secret, tokens ou valores
copiados de produção.

## Desenvolvimento e branches

Execute `pnpm dev` depois de configurar as variáveis. O padrão local é
`http://localhost:3000`; não use outra porta sem atualizar também o callback e o
ambiente de teste. Para testes e desenvolvimento isolado, prefira branches Neon
separadas e, quando dados existirem, branches sem dados (schema-only) ou dados
sintéticos. Nunca replique dados reais de pacientes em branches locais, CI ou
screenshots.

## Escopo atual

A aplicação oferece login email/senha, recuperação de senha, logout, proteção das
rotas administrativas com exigência da role `admin` e a base de auditoria. O
cadastro público permanece desabilitado; permissões mais específicas e os módulos
de negócio serão implementados em etapas posteriores.
