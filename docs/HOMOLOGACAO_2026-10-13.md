# Homologação isolada — 13/10/2026

## Correção do preparador de sessão e separação de ambientes

- A revisão do PR #25 apontou inconsistência entre a porta padrão `3006` do
  preparador de sessão e a porta `3003` do runbook do demo. O preparador agora
  exige `PLAYWRIGHT_BASE_URL` explícita, aceita somente origem HTTP localhost
  com porta explícita e exige `PLAYWRIGHT_AUTH_STORAGE_STATE` dentro do caminho
  ignorado `tests/e2e/.auth/`.
- A reutilização exige metadados correspondentes à origem local e aos endpoints
  configurados de Neon Auth e Data API; estado ausente, inválido, sem metadados
  ou de outro ambiente força login manual e validação do acesso financeiro.
  Tokens, cookies, credenciais e URLs de endpoints não são emitidos nos logs.
- O runbook agora separa `demo-admin.json` em `localhost:3003` de
  `homologacao-admin.json` em `localhost:3006`; a porta configurada deve ser a
  que o processo local realmente está usando.
- Esta correção ainda não comprova uma sessão administrativa válida. A última
  tentativa do operador informou email ou senha inválidos; não houve novo login,
  escrita no banco ou chamada autenticada nesta correção. Smokes autenticados e
  demais evidências dependentes de sessão permanecem pendentes.
- A comparação read-only dos endpoints locais de Auth/Data API com a configuração
  do Neon confirmou correspondência com o projeto `still-bird-03340027`, branch
  `br-long-base-b88yvq9r`, banco `neondb`; a porta 3006 pertence ao Next deste
  worktree. Nenhuma migration foi reaplicada ou dado de negócio escrito.
- A consulta read-only ao catálogo encontrou zero tabelas públicas sem RLS e
  confirmou índices de auditoria por `(created_at DESC, id DESC)`, unicidade de
  lançamentos de internações por médico/data, e unicidade de agendamento ativo
  por cirurgia/paciente. Nenhuma tabela de ledger de migrations foi encontrada;
  a presença de objetos não prova o histórico de aplicação.
- Testes unitários cobrem URL ausente/inválida, HTTP externo, portas locais,
  caminho de estado, vínculo de ambiente, ausência de segredos nas mensagens e
  exemplos do runbook. A matriz RLS/RPC completa, expiração/renovação, tokens de
  recuperação, concorrência com sessões PostgreSQL independentes e a matriz
  integral dos CSVs permanecem pendentes.
- A pontuação estrita permanece em 10/100; a correção de configuração não fecha
  nenhum dos marcos funcionais ainda incompletos.

## Ambiente e limites

- Repositório/PR: `henriquesouza7/hospital-admin`, PR #25, branch
  `feat/consolidacao-final-demo`.
- Ambiente de teste: projeto Neon temporário isolado
  `hospital-homologacao-20261013`, branch `main`, banco `neondb`.
- Todos os dados de negócio usados foram sintéticos; nenhum dado real de
  paciente foi inserido. Nenhum email real de recuperação foi enviado nesta
  rodada.
- Production e o Neon demo compartilhado não foram alterados. Não houve deploy
  ou merge. Uma migration incremental de privilégio foi aplicada somente ao
  branch isolado após confirmar o projeto e o objeto-alvo.
- A preparação do banco com 44 migrations pertence a uma execução anterior. O
  ledger de migrations não foi confirmado; não confundir presença de objetos
  com evidência do histórico de aplicação.
- Uma consulta read-only posterior reconectou o Neon. Ela confirmou o projeto,
  branch, banco, versão PostgreSQL, schema, RLS, funções, grants, contagens e
  plano descritos na seção abaixo. Não foi encontrado ledger de migrations;
  objetos presentes não comprovam por si só quando foram aplicadas.

## Verificação read-only do banco — 13/10/2026 15:39 UTC

- Projeto `still-bird-03340027`, branch `br-long-base-b88yvq9r` (`main`), banco
  `neondb`, PostgreSQL 18; Auth Better Auth ativo e Data API ativa para `public`,
  role anônima `anonymous`, limite de 1.000 linhas e OpenAPI desabilitada.
- Plano observado: `free_v3`; compute mínimo/máximo de 0,25 CU e suspensão
  imediata. Consumo registrado no projeto: 823 s de compute, 3.284 s ativos,
  6.546.212 bytes transferidos, 0 bytes escritos e armazenamento faturável
  reportado como 0. Esses campos não são uma fatura; o custo faturado continua
  sem confirmação independente.
- Catálogo contém 20 tabelas públicas; todas têm RLS habilitada (zero sem RLS).
  As tabelas de `neon_auth` não tiveram políticas RLS próprias nesta inspeção;
  seu acesso é gerido pelo provedor. A role `anonymous` não tem SELECT/INSERT
  direto nas tabelas públicas examinadas. `authenticated` tem SELECT de tabela,
  mas as policies condicionam as linhas a `is_admin()` ou `is_finance_admin()`;
  INSERT/UPDATE diretos só aparecem em `products` e `suppliers`, protegidos por
  policy `ALL` condicionada a `is_finance_admin()`.
- As RPCs verificadas (`is_admin`, `is_finance_admin`, dashboard de Internações,
  totais financeiros exatos, três exports e auditoria específica de Cirurgias)
  são `SECURITY DEFINER`, fixam `search_path=pg_catalog`, permitem EXECUTE a
  `authenticated` e negam execução a `anonymous`.
- A verificação ampliada encontrou 44 funções `SECURITY DEFINER` próprias do
  aplicativo: nenhuma sem `search_path=pg_catalog`, nenhuma executável por
  `anonymous` e duas sem EXECUTE de `authenticated`, ambas funções de trigger
  (`audit_finance_change` e `audit_production_change`). Após a migration do
  helper, nenhuma função pública própria do aplicativo permaneceu executável
  por `anonymous`.
- Foram observadas 5 identidades Auth, 17 sessões e nenhuma verificação pendente;
  nenhum endereço, token, sessão ou conteúdo de paciente foi consultado. As
  contagens exatas de tabelas incluem 3 pacientes sintéticos, 133 auditorias,
  93 pedidos, 2 lançamentos de Internações e 3 agendamentos de Cirurgias,
  conforme os dados fictícios já autorizados para este projeto.
- O índice `purchase_orders_order_date_idx`, os índices de cursor da auditoria e
  97 constraints de integridade estão presentes. `EXPLAIN` da consulta mensal
  de pedidos escolheu sequential scan para apenas 93 pedidos; isso não mede
  comportamento com volume representativo. A migration
  `20261009030000_index_purchase_orders_by_order_date.sql` já tem efeito visível
  pelo índice, mas não existe ledger consultável que comprove o histórico de
  aplicação; não foi reaplicada.
- Uma tentativa HTTP sem token contra o Data API terminou em HTTP 400 sem corpo
  exposto. Isso não foi aceito como prova de negação RLS. O usuário de banco da
  inspeção possui `BYPASSRLS`; seus resultados não são evidência de autorização
  por perfil.
- Foi encontrada a função auxiliar `public.show_db_tree()`, fora das migrations
  do aplicativo e sem uso pela aplicação, com EXECUTE herdado de `PUBLIC`. A
  migration incremental `20261013154000_revoke_public_access_to_database_tree_helper.sql`
  foi aplicada somente ao branch isolado. A verificação posterior confirmou
  EXECUTE negado a `anonymous` e `authenticated`, preservado para o proprietário
  de inspeção. A função expunha nomes de objetos do catálogo, não linhas de
  negócio.
- O `.env.local` ignorado do worktree tinha hosts diferentes dos endpoints
  retornados por `get_auth` e `get_data_api`. Foram alinhadas somente as URLs
  locais de Auth e Data API ao projeto confirmado; o segredo de cookie foi
  preservado. Essa correção local não cria uma sessão autenticada.
- Naquela inspeção não havia estado E2E administrativo válido. A etapa posterior
  abaixo registra a captura de uma sessão real; arquivos locais de estado não
  são evidência por si só e não devem ser expostos.

## Correções no código

1. O módulo `src/modules/minor-surgeries/actions.ts` exportava um objeto de
   estado inicial apesar do diretivo `"use server"`. O runtime Next.js 16
   recusava carregar `/pequenas-cirurgias` com erro de export incompatível. O
   tipo e o estado inicial agora vivem em `action-state.ts`, fora do módulo de
   Server Actions; teste AST evita regressão.
2. Valores monetários grandes causavam overflow horizontal em cards nos
   viewports estreitos. O card agora pode encolher e quebrar valores longos. O
   E2E verifica `/`, `/financeiro/indicadores` e `/internacoes` em 390 px e
   1440 px.
3. A suíte E2E autenticada reutiliza um storage state rotativo. O grupo foi
   serializado para evitar que testes independentes usem o mesmo estado
   simultaneamente; o teste específico de duas páginas concorrentes permanece.
   Isso melhora o isolamento dos testes, mas não comprova a causa da falha
   `42501` observada numa execução paralela anterior.

## Evidências funcionais disponíveis

| Área | Evidência observada | Limite da evidência |
|---|---|---|
| Autenticação | Login administrativo real, logout, redirecionamento de rota protegida sem sessão e conta básica sem papel admin. | Expiração/renovação de sessão e fluxo completo de token inválido/expirado/reutilizado não foram exercitados. |
| Financeiro | Fornecedores/produtos/pedidos e feira exercitados; valor persistido e exportado com centavos exatos, incluindo `90071992547409.93`; CSV Gastos e Compras inspecionados. | Não é uma matriz completa de papéis, validações e todos os cenários do Laboratório/fornecedores. |
| Internações | Médico criado/editado/inativado/reativado; lançamentos e metas mensais/anuais; importação histórica válida e casos inválidos; exportação; persistência após reload. | Não houve teste de falha/rollback de transação concorrente no PostgreSQL. |
| Produção | Procedimentos/categorias e lançamento; importação SUS, duplicidade de arquivo recusada, reconciliação persistida, exportação e neutralização de fórmula CSV. | Testes completos de unidade/classificação e controle por todos os papéis ainda pendentes. |
| Pequenas Cirurgias | Dias e capacidades; agendamento/status; recusa por excesso; fila e transferência; persistência; duas sessões autenticadas disputando uma vaga resultaram em apenas um agendamento ativo; auditoria com ator. | Falta testar duplicidade explicitamente e completar RLS/matriz de permissões; não declarar integridade total. |
| Auditoria | 133 eventos observados; nenhum `actor_id` nulo. Paginação keyset testada com evento novo inserido entre páginas e sem repetição na sequência observada. | Sem teste com transações PostgreSQL concorrentes ou evento retrodatado; keyset não promete snapshot imutável. |
| CSV | Gastos, Compras, Internações, Metas, Produção e Cirurgias baixados; BOM/CRLF e conteúdo não vazio verificados; exportação financeira preservou precisão; fórmula de Produção escapada; dados pessoais sintéticos ausentes dos relatórios verificados. | Filtros, limites máximos, nulos e paginação sob alteração concorrente não foram todos validados para os seis formatos. |
| Dashboard | Após o diff final: 30/30 sequenciais, 6/6 em pares e 11/11 E2E autenticados; sem erro nos logs finais. | `42501` ocorrido em ciclo anterior permanece sem causa raiz comprovada. |

As contagens da execução anterior no Neon isolado incluíram 133 eventos de
auditoria, 93 itens de pedidos, 2 médicos, 2 lançamentos e 2 metas de
Internações, 1 importação SUS reconciliada e registros sintéticos de Pequenas
Cirurgias. São valores históricos de execução, não uma consulta atual.

## Gates e estabilidade

Após as correções e antes do commit, todos estes gates passaram:

- `pnpm format:check`
- `pnpm lint` (sem warnings)
- `pnpm typecheck`
- `pnpm test`: 344 testes em 48 arquivos
- `pnpm build`
- `pnpm test:e2e`: 11/11, servidor explicitamente configurado em
  `localhost:3006` e ligado ao Neon temporário
- `git diff --check`

A suíte responsiva verificou três rotas em 390 px e 1440 px. Foi encontrado e
corrigido um segundo overflow no grid de produção do dashboard geral, além do
overflow inicial nos valores dos KPIs. A repetição manual adicional do
dashboard passou 30/30 carregamentos sequenciais e 6/6 requests em pares. A
conferência dos CSVs retornou 200 para os seis tipos, com BOM, CRLF, nome de
arquivo e conteúdo esperados; Gastos preservou o valor exato e o CSV de Produção
escapou a fórmula sintética. Nenhum nome sintético de paciente apareceu nos
arquivos verificados.

A primeira execução E2E apontou para `localhost:3000`, cujo segredo de sessão
não correspondia ao estado autenticado do servidor `localhost:3006`; ela
falhou e foi interrompida. A execução final foi feita contra `localhost:3006`
com o estado renovado, passou integralmente e não gerou logs de erro no servidor.
Uma falha `42501` anterior continua documentada sem causa raiz comprovada;
durante a rodada final, as RPCs `is_admin()` e `is_finance_admin()` retornaram
`true` para o ator sintético e não houve novo `42501`.

O estado acima registra a rodada anterior concluída antes do commit e push.

## Reexecução após inspeção atual — 13/10/2026

- `pnpm install --frozen-lockfile`: passou, dependências já estavam atualizadas.
- `pnpm format:check`, `pnpm lint` (sem warnings), `pnpm typecheck`,
  `pnpm test` (345/345 em 49 arquivos) e `pnpm build`: passaram.
- `pnpm test:e2e`: 5 testes públicos passaram; 6 smokes administrativos foram
  pulados porque não existe storage state autenticado neste worktree.
- `git diff --check`: passou após a atualização documental.
- Não foram executadas novas operações autenticadas. A única escrita no Neon
  foi a migration de privilégio acima, no branch isolado; production e demo
  compartilhado permaneceram intocados.

## Custo e recursos

A consulta atual confirmou plano `free_v3`, autosuspend imediato, 6.546.212
bytes transferidos, 823 segundos de compute, 3.284 segundos ativos, zero bytes
escritos e zero armazenamento faturável reportado. Isso não substitui a fatura;
**o custo efetivamente faturado continua não confirmado**. O projeto temporário
deve ser mantido enquanto as evidências forem necessárias; exclusão depende de
confirmação do usuário.

## Homologação autenticada — 13/10/2026, após reconexão

- O worktree `feat/consolidacao-final-demo` foi executado em
  `http://localhost:3006`. As URLs locais de Auth e Data API coincidiram
  exatamente com `get_auth` e `get_data_api` do projeto `still-bird-03340027`,
  branch `br-long-base-b88yvq9r`, banco `neondb`; `APP_BASE_URL` local também
  aponta para a porta 3006. Production e o Neon demo compartilhado não foram
  contatados para escrita.
- O Auth oficial informou cadastro habilitado, sem exigência de verificação de
  email. Foram criadas identidades de teste com domínio reservado `.invalid`,
  sem disparo de email. O papel `admin` foi atribuído pelo conector Neon; as
  outras identidades de teste ficaram como `user`. A contagem final agregada é
  2 `admin` e 8 `user`, incluindo as cinco identidades já existentes. Nenhuma
  senha ou endereço foi registrado neste documento.
- A sessão administrativa renovada após a promoção produziu `admin` no endpoint
  de sessão; a Data API retornou `true` para `is_admin()` e
  `is_finance_admin()`. A RPC `get_admission_dashboard_totals` respondeu 200
  para o intervalo anual válido `2026-01-01`–`2027-01-01`. O usuário básico
  retornou `false` nas duas verificações, recebeu 403/SQLSTATE `42501` ao
  tentar a mesma RPC e ao tentar criar dia de Cirurgia, e leu zero linhas de
  `audit_logs`; o administrador leu a auditoria. A chamada anônima direta à
  Data API continuou em HTTP 400, portanto a matriz de ator anônimo permanece
  inconclusiva.
- A sessão administrativa persistiu ao recarregar o dashboard. Logout real
  redirecionou para `/login` e o acesso protegido posterior também redirecionou.
  O storage state usado pelos testes foi revogado por esse logout; para uma
  nova rodada autenticada será necessário capturar outra sessão com
  `tests/e2e/prepare-auth-state.mjs`. O login manual da conta administrativa
  preexistente retornou “Email ou senha inválidos”; não houve tentativa de
  recuperação de senha.
- Concorrência de Cirurgias: duas sessões administrativas enviaram agendamentos
  simultâneos para um dia sintético com capacidade 1. A leitura posterior da
  tabela no PostgreSQL confirmou exatamente um agendamento ativo persistido.
  Isso valida a trava da RPC em concorrência real via aplicação; não substitui
  uma bateria com sessões PostgreSQL independentes criadas diretamente.
- Auditoria: após carregar a primeira página de 50 eventos, foi inserido um
  evento administrativo sintético antes de abrir a página seguinte. Ambas as
  páginas retornaram 50 eventos, o link preservou os dois campos do cursor e
  não houve evento duplicado entre páginas.
- CSVs: sete respostas autenticadas (Gastos, Compras, Internações, Metas,
  Produção em outubro e novembro e Cirurgias em novembro) retornaram 200, MIME e
  nome corretos, BOM UTF-8 e CRLF. O CSV de Gastos preservou os valores
  sintéticos `90071992547409,93` e `90071992547860,60`; Produção escapou a
  fórmula sintética; nenhum nome de paciente sintético testado apareceu. Sem
  sessão, a rota de exportação redirecionou para `/login`.
- E2E: os seis smokes administrativos passaram isoladamente. A suíte completa
  executada com um worker passou 11/11. Uma execução inicial com seis workers
  falhou no primeiro teste do dashboard e interrompeu os cinco testes
  administrativos seguintes; a repetição serial aprovou tudo, então a
  estabilidade sob paralelismo permanece como risco a acompanhar.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (345 em 49
  arquivos), `pnpm build` e `git diff --check` passaram nesta rodada. Nenhuma
  migration foi aplicada ou reaplicada.
- Permanecem sem comprovação: RLS com ator anônimo por JWT, expiração/renovação
  de sessão, todas as RPCs e mutações por papel, todas as combinações de filtros
  e limites de exportação, e concorrência PostgreSQL independente direta. A
  rodada autenticada não altera essas pendências por inferência.

## Pendências bloqueadoras

1. Confirmar o custo faturado pelo painel; a consulta confirmou plano gratuito e
   métricas de consumo, mas não apresentou fatura.
2. Completar RLS/RPC por módulo para papéis básicos e anônimo. Nesta rodada,
   Internações, Financeiro e auditoria tiveram verificações diretas; a Data API
   anônima permaneceu inconclusiva.
3. Testar expiração/renovação de sessão e estados de token de recuperação sem
   enviar email real. Persistência após reload e logout foram validados.
4. Manter registrada a falha `42501` histórica, ainda sem causa raiz comprovada;
   ela não se repetiu nos testes atuais.
5. Ampliar concorrência PostgreSQL real além da disputa por uma vaga em
   Cirurgias. A corrida atual foi feita por duas sessões da aplicação e a
   persistência foi conferida no banco.
6. Completar CSVs com filtros, limites, ordenação, nulos, caracteres, aspas,
   delimitadores e consistência sob alterações concorrentes. Os sete arquivos
   verificados nesta rodada cobrem formato e conteúdo sintético básico.
7. Conferir o ledger de migrations por mecanismo oficial, caso disponível; não
   reaplicar migration com base apenas em presença de objetos.
8. Revisar o novo HEAD e resolver threads aplicáveis. O PR #25 deve permanecer
   em draft e sem merge, conforme autorização vigente.

**Última pontuação estrita registrada antes da rodada autenticada: 10/100.** Ela
não foi recalculada porque o documento não contém pesos verificáveis por critério.
A meta de 90/100 não está comprovada. Não declarar o sistema homologado para
liberação enquanto os bloqueadores acima permanecerem.
