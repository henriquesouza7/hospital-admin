# Hospital Admin

Sistema interno de gestão administrativa hospitalar.

## Objetivo

Centralizar controles atualmente distribuídos em planilhas e transformar os dados em informação gerencial, com histórico, métricas, gráficos e comparativos.

O sistema não é um prontuário eletrônico e não substitui sistemas clínicos ou oficiais do SUS.

## Escopo inicial

- Financeiro
  - Farmácia
  - Laboratório
  - Feira mensal
- Internações hospitalares
- Produção hospitalar
- Pequenas cirurgias
- Dashboard executivo

## Estratégia de desenvolvimento

O projeto será desenvolvido de forma incremental, com documentação, migrations SQL,
testes e revisão por pull request.

Stack: Next.js, TypeScript, Tailwind CSS, Neon Postgres, Neon Auth, Neon Data API,
Vitest e Playwright. O projeto não usa ORM nesta etapa.

## Documentação

Consulte a pasta `docs/` para visão do produto, arquitetura, requisitos, regras de negócio, banco de dados e roadmap.

## Estado do projeto

Fase 2 — Fundação de dados com Neon. Consulte `docs/NEON_SETUP.md` para a
configuração manual do projeto Neon.

## Desenvolvimento local

Requisitos: Node.js 20 ou superior e `pnpm` 11.19.0.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

A aplicação fica disponível em [http://localhost:3000](http://localhost:3000).
Preencha o `.env.local` com os valores server-side do Neon por um canal seguro;
esse arquivo é ignorado pelo Git. Consulte `docs/NEON_SETUP.md` antes do
primeiro login.

Os arquivos de texto versionados usam LF em Windows e macOS, conforme
`.gitattributes` e `.editorconfig`. Arquivos `.bat` e `.cmd` usam CRLF.

Antes do primeiro teste E2E em cada computador, instale o Chromium usado pelo
Playwright:

```bash
pnpm exec playwright install chromium
```

Comandos de validação:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

As migrations SQL versionadas ficam em `db/migrations/` e devem ser aplicadas
na branch Neon escolhida pelo responsável do projeto. Não copie connection
strings, tokens ou dados reais para a documentação ou para o repositório.
