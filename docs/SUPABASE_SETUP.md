# Configuração manual do Supabase

O repositório contém apenas a integração e as migrations. O projeto remoto do
Supabase deve ser criado e configurado manualmente pelo responsável do projeto.

## 1. Criar o projeto

Crie um projeto Supabase separado para cada ambiente necessário. Não registre no
Git a URL, as chaves ou qualquer outro valor específico do projeto.

## 2. Configurar autenticação

No painel do Supabase:

1. Ative o provedor **Email**.
2. Desative o cadastro público (`Allow new users to sign up`), pois o MVP usa
   usuários administrativos criados pelo responsável.
3. Crie manualmente o primeiro usuário administrativo.
4. Não é necessário configurar recuperação de senha nesta etapa.

## 3. Configurar variáveis locais

Copie `.env.example` para `.env.local` e preencha:

```text
NEXT_PUBLIC_SUPABASE_URL=<Project URL do Supabase>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key pública>
```

Projetos que ainda usam a chave pública legada podem preencher
`NEXT_PUBLIC_SUPABASE_ANON_KEY` no lugar da publishable key. Use somente uma das
duas. Nunca coloque `service_role`, senha ou token em variáveis `NEXT_PUBLIC_*`.

## 4. Aplicar migrations

Com o Supabase CLI autenticado localmente, a partir da raiz do repositório:

```bash
supabase link --project-ref <project-ref-configurado-manualmente>
supabase db push
```

O `project-ref` é fornecido pelo painel do projeto e não deve ser inventado ou
versionado. Como alternativa, o responsável pode revisar e executar o SQL da
pasta `supabase/migrations/` no SQL Editor do painel.

## 5. Executar a aplicação

Depois de configurar o `.env.local` e aplicar as migrations:

```bash
pnpm dev
```

Acesse `/login`. O fluxo disponível é somente email e senha; não há cadastro
público. As rotas administrativas exigem sessão válida e o banco continua sendo
a fonte de verdade.
