# Roadmap

## Homologação isolada — 13/10/2026 (atualização)

O registro abaixo substitui as afirmações anteriores sobre ausência de dados e
smokes autenticados; as seções de estabilização antigas permanecem como
histórico. A homologação ocorreu no projeto Neon temporário isolado
`hospital-homologacao-20261013` (branch `main`, banco `neondb`), usando somente
dados sintéticos. Production e o Neon demo compartilhado não foram alterados.
Uma consulta read-only ao Neon em 13/10/2026 às 15:39 UTC confirmou projeto,
branch, PostgreSQL 18, RLS, policies, funções, grants, índices e contagens.
Não foi encontrado ledger de migrations; presença de objetos não prova quando
foram aplicadas. O plano era `free_v3`, mas nenhuma fatura foi disponibilizada.

- Corrigido erro real do Next.js 16: estado inicial exportado de um módulo
  `"use server"` foi movido para `action-state.ts`. Regressão AST verifica que o
  módulo de ações não exporta valores de runtime incompatíveis.
- Corrigido overflow horizontal causado por valores monetários grandes nos
  cards de KPI. A regressão E2E cobre dashboard geral, indicadores financeiros e
  Internações em 390 px e 1440 px.
- Após todas as mudanças: `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test` (344 testes/48 arquivos), `pnpm build`,
  `pnpm test:e2e` (11/11) e `git diff --check` passaram. Os E2E foram apontados
  explicitamente ao servidor local `localhost:3006` no Neon temporário.
- A regressão E2E de viewport passou para `/`, `/financeiro/indicadores` e
  `/internacoes` em 390 px e 1440 px. A checagem separada de dashboard passou
  30/30 carregamentos sequenciais e 6/6 requests em pares.
- Evidências reais anteriores: criação e leitura após reload de registros
  sintéticos em Financeiro, Internações, Produção e Pequenas Cirurgias; tentativa
  rejeitada por capacidade excedida; concorrência real de dois agendamentos para
  uma vaga resultou em exatamente um ativo; importação SUS duplicada foi
  recusada; auditoria preservou ator; seis tipos de CSV foram baixados e
  inspecionados, incluindo total monetário exato e neutralização de fórmula.
- Um usuário sem papel administrativo foi bloqueado pelas rotas testadas; uma
  checagem direta anterior confirmou leituras protegidas vazias e RPCs negadas
  (`42501`). Isso não equivale a uma matriz completa de RLS por módulo, por
  mutação e para todos os quatro atores exigidos.
- Auditoria por cursor foi exercitada com inserção entre páginas e sem
  sobreposição na navegação observada. O teste não foi feito em transações
  PostgreSQL concorrentes nem promete snapshot imutável do histórico.
- Dashboard: 30/30 carregamentos sequenciais e 6/6 pares concorrentes passaram
  após novo login. Uma rodada paralela anterior teve `42501`; a causa raiz não
  foi comprovada. E2E autenticado foi serializado por compartilhar um estado de
  sessão rotativo, mas a suíte atual também contém um teste explícito com duas
  páginas concorrentes.
- Na análise final, o token de sessão da conta sintética tinha subject e as RPCs
  `is_admin()` e `is_finance_admin()` retornaram `true`; esses resultados não
  explicam retrospectivamente o `42501` anterior. Nenhum erro apareceu nos logs
  do servidor durante a última suíte E2E e a repetição 30+6.
- Na leitura atual, 20/20 tabelas públicas têm RLS habilitada. As oito RPCs
  inspecionadas são `SECURITY DEFINER`, usam `search_path=pg_catalog`, concedem
  EXECUTE a `authenticated` e negam a role `anonymous`. As policies de auditoria
  limitam a leitura global a `is_finance_admin()`; Financeiro também usa esse
  guard, enquanto os módulos administrativos usam `is_admin()`.
- A auditoria de catálogo das 44 funções `SECURITY DEFINER` do aplicativo não
  encontrou caminhos sem `search_path=pg_catalog` nem EXECUTE anônimo. As duas
  funções sem EXECUTE para `authenticated` são triggers de auditoria; a função
  auxiliar de catálogo teve o EXECUTE público revogado pela migration citada.
- A consulta observou 5 identidades Auth, 17 sessões, zero verificações pendentes,
  133 auditorias, 93 pedidos, 3 pacientes sintéticos, 2 lançamentos de
  Internações e 3 agendamentos de Cirurgias. Foram consultados somente totais,
  sem ler conteúdo pessoal. O usuário da inspeção tem `BYPASSRLS`, então a
  inspeção de catálogo não é prova da matriz funcional de políticas.
- O índice de data de pedidos está presente; `EXPLAIN` escolheu sequential scan
  para a tabela atual, pequena (93 pedidos), sem demonstrar plano em volume
  representativo.
- A função auxiliar `public.show_db_tree()` existia fora das migrations e tinha
  EXECUTE herdado de `PUBLIC`. A migration versionada
  `20261013154000_revoke_public_access_to_database_tree_helper.sql` foi aplicada
  somente no branch isolado; a checagem confirmou execução negada às roles
  `anonymous` e `authenticated`, preservada apenas para a role proprietária.
- O `.env.local` ignorado apontava para hosts antigos; as URLs locais de Auth e
  Data API foram corrigidas para os endpoints desse projeto, preservando o
  segredo de cookie. Não havia storage state Playwright autenticado no worktree.
  A tentativa anônima ao Data API respondeu HTTP 400, resultado inconclusivo para
  RLS; não foram feitas novas chamadas autenticadas.
- A reexecução após a migration passou instalação congelada, formatação, lint,
  typecheck, 345/345 testes unitários em 49 arquivos, build e `git diff --check`.
  O E2E rodou 11 cenários:
  5 públicos passaram e os 6 smokes autenticados foram pulados por falta de
  sessão; não contar esses seis como aprovados.

O plano Neon continua observado como `free_v3`, com autosuspend imediato e
consumo registrado de 6.546.212 bytes de transferência, 823 segundos de compute,
3.284 segundos ativos e zero bytes escritos. A API não expôs fatura; cobrança
faturada permanece **não confirmada**. Foi aplicada somente a migration
incremental de privilégio citada acima. A alegação anterior de 44 migrations
não foi confirmada por ledger. O
índice da migration `20261009030000_index_purchase_orders_by_order_date.sql`
está presente, mas isso não identifica quando foi instalado. Não excluir o
projeto temporário sem confirmação do usuário, pois ele preserva evidências.

### Matriz estrita de prontidão

Pontuação conforme os dez marcos de aceite: 10 pontos somente para marco
integralmente homologado; 0 para qualquer marco incompleto.

| Marco | Pontos | Situação e lacuna determinante |
|---|---:|---|
| Login, logout e sessões | 0 | Login/logout e proteção testados; expiração e renovação ainda não. |
| Recuperação e redefinição de senha | 0 | Houve redefinição real solicitada pelo usuário; token inválido, expirado e reutilizado não foram testados. |
| Autorização, RLS e proteção de dados | 0 | Testes negativos parciais; falta matriz de papéis e operações em todos os módulos. |
| Financeiro e precisão monetária | 0 | Total exato `90071992547409.93` conferido no CSV; demais fluxos/atores e cenários completos pendentes. |
| Internações | 10 | CRUD, histórico de médico inativo, metas, importação CSV válida/inválida, persistência, auditoria e exportação exercitados com dados sintéticos. |
| Produção | 0 | CRUD, importação/reconciliação e CSV exercitados; matriz completa de unidades, classificações, permissões e concorrência pendente. |
| Pequenas Cirurgias | 0 | Fluxo e concorrência/capacidade exercitados; duplicidade e matriz completa de autorização ainda sem prova. |
| Dashboard geral e auditoria | 0 | Continuidade por cursor e carga observadas; causa do `42501` intermitente e snapshot PostgreSQL não validados. |
| Exportações e integridade CSV | 0 | Seis tipos verificados; todos os filtros, limites, paginação, nulos e mutações concorrentes ainda não cobertos ao vivo. |
| Responsividade, qualidade visual e gates | 0 | Overflow corrigido; gates completos após a mudança e inspeção visual/acessibilidade de todas as telas pendentes. |

**Pontuação estrita atual: 10/100. Meta de 90%: não atingida.** Não existem
evidências suficientes para declarar homologação completa ou remover o draft.
Consulte `docs/HOMOLOGACAO_2026-10-13.md` para o inventário de evidências e
pendências detalhadas.

## Estado de estabilização — 13/10/2026

O PR #25 segue aberto em draft, sem merge, no branch `feat/consolidacao-final-demo`.
O HEAD-base verificado nesta rodada é `2026f2c8abe910a3e0e591b67608153accb4fd4d`.
Foi adicionada instrumentação server-only para falhas do dashboard, limitada a
operação/etapa fixas, código e status validados, duração e UUID aleatório; erros,
tokens e dados pessoais não são registrados. A obtenção do token Data API agora
usa `React.cache` para compartilhar a leitura durante um render do servidor.

Com a sessão administrativa Playwright já existente, a suíte E2E passou 11/11
(6 autenticados e 5 públicos), o teste de duas requisições simultâneas passou 6/6 e o dashboard passou
30/30 em série no servidor de produção local (`next build` + `next start`, porta
3004). As séries anteriores reproduziram `42501` em consultas do dashboard;
após a mudança, estas novas séries passaram, mas não demonstram a causa-raiz nem
provam ausência futura de falhas. Não houve testes de sessão expirada/recém-criada
nem verificação negativa de RLS com atores distintos.

A leitura do Neon demo nesta rodada permaneceu read-only; as tabelas de negócio
continuam vazias. Não foram inseridos dados sintéticos, aplicadas migrations ou
alteradas contas. RLS, grants e definições das RPCs foram inspecionados, mas
nenhuma política foi exercitada com identidades não administrativas. A migration
`20261009030000_index_purchase_orders_by_order_date.sql` continua sem aplicação
e sem medição de desempenho com volume representativo. Persistência após
mutação, auditoria resultante, CSV não vazio, concorrência PostgreSQL e smoke
visual autenticado abrangente permanecem pendentes.

Fases 6 e 7 permanecem abertas. Pela regra de pontuação estrita, nenhum dos dez
marcos está integralmente homologado nesta rodada: **0/100; meta de 90% não
atingida**. Manter o PR em draft até concluir a homologação isolada autorizada e
a revisão final.

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

Em 13/10/2026, o preparador de storage state passou a exigir origem local
explícita e arquivo por ambiente, validando metadados de origem e dos endpoints
Neon antes de reutilizar uma sessão. Isso corrige o P2 da porta/runbook; a captura
de uma sessão administrativa válida e a homologação autenticada continuam pendentes.

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
- Na rodada anterior documentada nesta seção, nenhum SQL, migration ou dado foi
  escrito no Neon. A migration de índice
  `20261009030000_index_purchase_orders_by_order_date.sql` ainda não tinha sido
  verificada naquele ponto; a seção mais recente acima registra o estado atual.
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
