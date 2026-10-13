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
estão no PR #25. As sete migrations-base do ciclo (cinco de 08/10 e duas de
09/10) foram anteriormente reportadas como aplicadas no Neon demo
`floral-breeze-18394345`, branch
`br-misty-recipe-b8muzwtd`; consultas read-only confirmaram objetos e
privilégios descritos em `DEMO_2026-10-09.md`. A consulta atual também encontrou
`list_monthly_expense_totals_exact` com valores textuais e permissões restritas,
compatível com `20261009020000_preserve_exact_financial_export_totals.sql`.
As nove migrations versionadas do ciclo (cinco de 08/10 e quatro de 09/10) estão
documentadas para ambientes novos. Como não há ledger de migrations, a presença
da RPC não informa quando ou como foi instalada; esta rodada não aplicou SQL e
a migration não deve ser reaplicada enquanto a RPC existir. A nova migration
`20261009030000_index_purchase_orders_by_order_date.sql` está versionada no PR,
mas não foi aplicada no Neon demo; a validação com histórico populado também
permanece pendente. A autenticação manual real e a leitura dos indicadores no
dashboard foram verificadas em 12/10/2026; os quatro smokes autenticados passaram
em 13/10/2026. A inspeção manual do CSV e demais verificações ainda pendem. O PR
#25 continua sem merge.

Fase 7 permanece aberta: os quatro smokes automatizados agora passaram com uma
sessão Playwright administrativa real. Ainda faltam testar RLS/RPCs com atores
distintos, validar persistência e auditoria após operações sintéticas,
inspecionar o conteúdo dos CSVs e terminar a homologação visual autenticada em
1440 px e 390 px. Os dados de negócio continuam vazios; nenhum dado sintético
foi inserido.

Em 12/10/2026, após login manual real no Neon demo, o dashboard, a auditoria e a
página de Pequenas Cirurgias renderizaram sem erro e exibiram estados vazios
compatíveis com os dados consultados. A primeira chamada ao resumo de Pequenas
Cirurgias retornou SQLSTATE `42501` (negação de autorização); a RPC e seus
privilégios foram conferidos por consulta read-only, e `is_admin()` retornou
`true` na sessão atual. Após remover o diagnóstico temporário, um reload carregou
financeiro, Internações, Produção e Pequenas Cirurgias sem erro. A causa da
negação transitória inicial não pôde ser reproduzida, portanto não há correção
de autorização presumida. A página de exportações abriu, mas o navegador bloqueou
o download CSV agregado (`ERR_BLOCKED_BY_CLIENT`); nenhum arquivo foi salvo.
Não houve escrita no banco nem alteração em production.

Em 09/10/2026, a correção do token circular `--font-sans` foi verificada no
navegador deste worktree: login, recuperação e redefinição sem token computam
Geist; login e recuperação não têm overflow em 390 px ou 1440 px, e o foco de
teclado no email é visível. A porta 3002 estava em uso por outro worktree; este
worktree foi iniciado em `localhost:3003` com `APP_BASE_URL` configurada apenas
no `.env.local` ignorado pelo Git. Naquele ciclo a rota protegida redirecionou
para `/login`. Em 12/10/2026, o operador confirmou a redefinição da senha e fez
login manual real. Neon Auth demo tem SMTP compartilhado e
`allow_localhost=true`; nenhum novo email de recuperação foi enviado. O login
real foi aceito e a sessão administrativa abriu as rotas protegidas.

Em 13/10/2026, uma captura mostrou erro transitório na leitura dos totais do
Financeiro. A RPC exata e suas permissões continuaram presentes; o SQLSTATE
original não foi recuperado. O dashboard agora preserva os demais indicadores
quando essa consulta falha e informa o código seguro, sem preencher zeros. Após
reiniciar o servidor local, o painel voltou a exibir os totais persistidos. Os
quatro smokes autenticados passaram, incluindo eventos de download dos CSVs de
Gastos e Cirurgias. Os arquivos ainda precisam de inspeção manual. Nenhum dado
foi escrito no Neon demo e production não foi alterada.

### Rodada de homologação read-only — 12/10/2026

- No worktree de Consolidação, o PR #25 estava limpo e sincronizado em
  `ea5fcea2591b180ded7519b98316ab02d9712a0a`, aberto, draft e mergeável. A
  sessão Playwright administrativa real já existia localmente em arquivo
  ignorado pelo Git.
- Antes da reconstrução, uma requisição autenticada ao CSV de Gastos retornou
  HTTP 500 e o cartão do dashboard informou indisponibilidade. O mesmo endpoint
  retornou HTTP 200 após reconstruir e reiniciar a aplicação; a falha original
  não foi reproduzida e sua causa não foi determinada. A rota agora preserva
  redirects do Next e classifica somente erros tipados de totais: `42501` como
  403, RPC ausente como 503 e demais falhas como 503, expondo somente códigos
  allowlisted. Testes de regressão cobrem a classificação e o redirect.
- Com a sessão real, Dashboard e Auditoria carregaram; os seis relatórios
  (`gastos`, `compras`, `internacoes`, `metas`, `producao` e `cirurgias`)
  retornaram HTTP 200. A inspeção em memória confirmou nome de arquivo,
  `text/csv; charset=utf-8`, BOM UTF-8, CRLF, cabeçalhos sem campos pessoais e
  ausência de células iniciadas por prefixos de fórmula. O intervalo consultado
  continha de zero a uma linha administrativa por relatório; não foi inserido
  dado sintético. Isso não homologa centavos não nulos nem conteúdo com volume
  representativo. A mesma API sem sessão redirecionou a `/login`.
- O conector Neon MCP estava desconectado (`USER_NOT_LOGGED_IN`); não foi
  possível consultar novamente catálogos, policies ou privilégios do PostgreSQL
  nesta rodada. A leitura estática das migrations confirma guards por
  `is_admin()`/`is_finance_admin()`, funções `SECURITY DEFINER` com
  `search_path=pg_catalog`, EXECUTE concedido a `authenticated` e revogado de
  `PUBLIC`; o runtime validou apenas caminhos positivos da sessão admin atual,
  não atores sem permissão nem políticas RLS negativas.
- Nenhum SQL, migration ou dado foi escrito no Neon. A migration de índice
  `20261009030000_index_purchase_orders_by_order_date.sql` segue não verificada
  nesta rodada; a última evidência registrada dizia que não estava aplicada.
  `production` não foi alterada.
- Após as alterações, passaram `pnpm install --frozen-lockfile`,
  `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (341 testes em
  46 arquivos), `pnpm build`, `pnpm test:e2e` (9 testes, incluindo 4
  autenticados) e `git diff --check`.
- Fase 7 permanece aberta. Faltam acesso read-only ao Neon para catálogo atual,
  atores legítimos distintos para testar negações, autorização específica antes
  de qualquer escrita sintética, persistência e auditoria após mutações, CSVs
  com dados de teste não nulos e inspeção visual autenticada em 390 px e 1440 px.

### Rechecagem responsiva e E2E autenticado — 12/10/2026

- A inspeção em 390 px reproduziu overflow horizontal de 598 px em `/internacoes`.
  A causa foi a grade implícita `auto` nos wrappers do dashboard. Os wrappers
  agora usam uma coluna expansível (`grid-cols-1`) e o cabeçalho compartilhado
  permite encolhimento mínimo. O novo E2E autenticado verifica overflow e
  posição do título em 390 px e 1440 px; passou.
- As sete rotas autenticadas `/`, `/auditoria`, `/exportacoes`,
  `/pequenas-cirurgias`, `/financeiro/indicadores`, `/internacoes` e
  `/producao/indicadores` renderizaram com título, fonte Geist, sem overflow e
  sem erros de página nos dois tamanhos. As capturas visuais do Dashboard em
  1440 px e Internações em 390 px mostram estados vazios e nenhum dado pessoal.
- O Dashboard apresentou uma falha intermitente separada: uma rodada paralela
  do E2E marcou 9/10, sem renderizar o título; em três repetições isoladas, uma
  passou e duas falharam. A causa/SQLSTATE não foi determinada. As duas suítes
  completas seguintes passaram: execução serial e `pnpm test:e2e` padrão,
  ambas com 10/10 (5 E2E públicos e 5 autenticados). Não houve alteração para
  mascarar a falha nem para gerar valores substitutos.
- Com a correção visual, os gates rápidos (formatação, lint, typecheck e 341
  testes unitários em 46 arquivos) passaram; `pnpm build` passou e a última
  execução de `pnpm test:e2e` passou 10/10. O PR #25 continua draft, sem merge;
  a Fase 7 continua aberta devido às validações de banco, persistência e
  auditoria ainda pendentes.
