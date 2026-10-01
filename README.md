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
