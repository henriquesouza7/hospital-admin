# Arquitetura Inicial

## Direção
Monólito modular com aplicação web full-stack e PostgreSQL como fonte de verdade.

A prioridade do MVP é simplicidade operacional, organização do domínio, rastreabilidade e capacidade de evolução. Não usar microsserviços nesta fase.

## Stack oficial
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Neon Postgres
- Neon Auth
- Neon Data API
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

### Neon Postgres, Neon Auth e Data API
- Persistência relacional no PostgreSQL gerenciado pela Neon
- Identidade e sessão com Neon Auth
- Acesso de dados via Neon Data API e RLS no PostgreSQL
- Constraints e políticas de acesso no banco
- Migrations SQL versionadas no repositório
- Nenhum ORM nesta etapa

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

db/
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

## Integração Neon

A integração fica concentrada em `src/lib/neon/`, com `@neondatabase/neon-js`
como cliente oficial para Neon Auth e Data API. O proxy, as rotas de autenticação
e o helper `data-api.ts` são server-only; o helper obtém o JWT de RLS com
`auth.token()` e o injeta sob demanda no Data API. Componentes visuais não fazem
chamadas de infraestrutura diretamente. A identidade é a fornecida pelo Neon Auth
(`neon_auth`), sem tabela paralela de usuários nesta fase.

O Financeiro segue server-first. Páginas e Server Actions verificam a sessão e
a role `admin`, validam entradas com Zod e usam o cliente Data API server-only.
RLS repete a autorização no banco. Pedidos são gravados por RPC transacional;
subtotais são colunas geradas em `numeric` e auditoria é produzida no PostgreSQL.
