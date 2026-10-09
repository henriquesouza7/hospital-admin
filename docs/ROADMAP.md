# Roadmap

## Fase 0 — Fundação
- [x] Criar repositório
- [x] Criar documentação-base
- [x] Definir stack final
- [x] Definir estratégia inicial de branches e PRs
- [x] Preparar ambiente do Codex

## Fase 1 — Bootstrap
- [x] Criar aplicação Next.js
- [x] Configurar TypeScript
- [x] Configurar ESLint e formatter
- [x] Configurar Tailwind CSS
- [x] Configurar shadcn/ui
- [x] Criar estrutura modular inicial
- [x] Criar shell administrativo
- [x] Criar navegação base
- [x] Configurar testes Vitest
- [x] Configurar Playwright
- [x] Validar lint, typecheck e testes

## Fase 2 — Infraestrutura de dados
- [x] Definir Neon Postgres como fonte de verdade
- [x] Integrar Neon Auth e Neon Data API
- [x] Configurar variáveis de ambiente local
- [x] Criar estrutura de migrations
- [x] Criar autenticação inicial com email/senha
- [x] Definir RLS inicial
- [x] Preparar base de auditoria
- [x] Configurar projeto Neon e primeiro usuário manualmente

## Fase 3 — Financeiro (concluída no escopo atual)
- [x] Farmácia — fornecedores, produtos e pedidos de compra
- [x] Laboratório
- [x] Feira — total mensal consolidado, histórico e comparativo anual
- [x] Indicadores e comparativos
- [x] Importação fiscal

## Fase 4 — Internações
- [x] Médicos
- [x] Lançamentos
- [x] Metas
- [x] Dashboards

## Fase 5 — Produção
- [x] Procedimentos e categorias
- [x] Lançamentos
- [x] Dashboards
- [x] Importador SUS
- [x] Reconciliação de importações

## Fase 6 — Pequenas Cirurgias
- [ ] Dias de cirurgia
- [ ] Capacidade
- [ ] Pacientes/agendamentos
- [ ] Fila de espera
- [ ] Histórico

O núcleo de Pequenas Cirurgias foi integrado. Os itens desta fase permanecem abertos até que dias, capacidade, pacientes/agendamentos, fila e histórico sejam concluídos e homologados por interface autenticada. Nenhum dado sintético de negócio foi criado.

Em 08/10/2026, os fluxos da Fase 6 continuam sem homologação autenticada no banco de demonstração; os itens permanecem abertos.

## Fase 7 — Consolidação
- [ ] Dashboard geral
- [ ] Auditoria
- [x] Backup/restauração — snapshot manual e restauração validados em branch isolada em 08/10/2026; procedimento registrado em `DEMO_2026-10-08.md`.
- [ ] Exportações
- [ ] Testes de segurança
- [ ] Homologação

Dashboard geral, consulta de auditoria, exportações e smokes E2E autenticados
estão no PR #25. Sete migrations do ciclo de consolidação (cinco de 08/10 e
duas de 09/10) foram confirmadas no Neon demo `floral-breeze-18394345`, branch
`br-misty-recipe-b8muzwtd`; consultas read-only confirmaram objetos e
privilégios descritos em `DEMO_2026-10-09.md`. A consulta atual também encontrou
`list_monthly_expense_totals_exact` com valores textuais e permissões restritas,
compatível com `20261009020000_preserve_exact_financial_export_totals.sql`.
Como não há ledger de migrations, a presença do objeto não informa quando ou
como foi instalado; esta rodada não aplicou SQL e a migration não deve ser
reaplicada enquanto a RPC existir. A chamada financeira autenticada continua
sem homologação. O PR #25 continua sem merge.

Fase 7 permanece aberta até executar os quatro smokes autenticados com uma
sessão real, testar RLS/RPCs usando atores autenticados, validar persistência e
auditoria ponta a ponta, inspecionar downloads e terminar homologação visual em
1440 px e 390 px. A preparação atual não cria uma sessão: sem um estado
administrativo existente, os smokes autenticados são ignorados. Os dados de
negócio continuam vazios e nenhum dado sintético foi inserido.

Em 09/10/2026, a correção do token circular `--font-sans` foi verificada no
navegador deste worktree: login, recuperação e redefinição sem token computam
Geist; login e recuperação não têm overflow em 390 px ou 1440 px, e o foco de
teclado no email é visível. O `.env.local` deste worktree não define
`APP_BASE_URL`; o fallback gera callback para `:3000` mesmo em outra porta, então
o link pode voltar ao endereço errado. Neon Auth tem SMTP compartilhado e
`allow_localhost=true`; como essa opção permite localhost sem whitelist, não foi
confirmado que a diferença de origem cause o erro capturado. O envio e a
redefinição reais, assim como as páginas administrativas, continuam sem
homologação autenticada.
