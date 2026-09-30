# Arquitetura Inicial

## Direção
Monólito modular com frontend web, backend da própria aplicação e PostgreSQL.

## Stack proposta
A validar antes do bootstrap:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL/Supabase
- Zod
- React Hook Form
- biblioteca de gráficos a definir

## Módulos de domínio
- finance
- admissions
- production
- minor-surgeries
- shared
- audit

## Princípios
- Modularidade sem complexidade distribuída.
- Regras críticas no servidor/banco.
- Banco relacional como fonte de verdade.
- Indicadores calculados a partir dos dados transacionais.
- Migrations versionadas.
- Importações idempotentes quando possível.
- Histórico e auditoria para alterações relevantes.

## Ambientes
- local/development
- staging (quando necessário)
- production

## Decisões futuras
Registrar mudanças arquiteturais relevantes em `docs/adr/`.
