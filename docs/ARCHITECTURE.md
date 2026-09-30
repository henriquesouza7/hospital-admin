# Arquitetura Inicial

## Direção
Monólito modular com aplicação web full-stack e PostgreSQL como fonte de verdade.

A prioridade do MVP é simplicidade operacional, organização do domínio, rastreabilidade e capacidade de evolução. Não usar microsserviços nesta fase.

## Stack oficial
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase/PostgreSQL
- Zod
- React Hook Form
- Recharts
- Vitest
- Playwright

## Responsabilidades principais

### Next.js
- Interface web
- Rotas
- Server Components/Actions quando fizer sentido
- Camada de aplicação e integração com serviços

### Supabase/PostgreSQL
- Persistência relacional
- Autenticação
- Storage quando necessário
- Constraints e políticas de acesso
- Migrations versionadas no repositório

### Zod
- Validação de entrada e contratos

### React Hook Form
- Formulários operacionais

### Recharts
- Dashboards e visualizações analíticas

### Vitest
- Testes unitários e de integração leve

### Playwright
- Fluxos críticos end-to-end

## Módulos de domínio
- finance
- admissions
- production
- minor-surgeries
- shared
- audit

## Estrutura alvo inicial
```text
src/
  app/
  components/
  modules/
    finance/
    admissions/
    production/
    minor-surgeries/
  lib/
  hooks/
  types/
  styles/

supabase/
  migrations/

tests/
  e2e/

docs/
```

A estrutura final pode ser ajustada pelo bootstrap, desde que preserve modularidade e separação de responsabilidades.

## Princípios
- Modularidade sem complexidade distribuída.
- Regras críticas no servidor e/ou banco, nunca apenas no frontend.
- Banco relacional como fonte de verdade.
- Indicadores calculados a partir dos dados transacionais.
- Migrations versionadas.
- Importações idempotentes quando possível.
- Histórico e auditoria para alterações relevantes.
- Nenhum segredo versionado.
- Nenhum dado real de paciente em seeds, mocks, testes ou screenshots.
- Preferir tipos explícitos e evitar `any`.
- Componentes visuais não devem concentrar regras de negócio.

## Ambientes
- local/development
- staging, quando necessário
- production

## Estratégia de evolução
1. Bootstrap técnico.
2. Shell administrativo e navegação.
3. Banco e autenticação.
4. Módulos implementados incrementalmente.
5. Dashboard consolidado apenas após dados confiáveis.
6. Auditoria, backup, segurança e homologação.

## Decisões futuras
Registrar decisões arquiteturais relevantes em `docs/adr/`.
