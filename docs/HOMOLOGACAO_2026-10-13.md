# Homologação isolada — 13/10/2026

## Ambiente e limites

- Repositório/PR: `henriquesouza7/hospital-admin`, PR #25, branch
  `feat/consolidacao-final-demo`.
- Ambiente de teste: projeto Neon temporário e vazio
  `hospital-homologacao-20261013`, branch `main`, banco `neondb`.
- Todos os dados de negócio usados foram sintéticos; nenhum dado real de
  paciente foi inserido. Nenhum email real de recuperação foi enviado nesta
  rodada.
- Production e o Neon demo compartilhado não foram alterados. Não houve deploy,
  merge ou aplicação de migration nesta rodada.
- A preparação do banco com 44 migrations pertence a uma execução anterior. O
  ledger de migrations não foi confirmado; não confundir presença de objetos
  com evidência do histórico de aplicação.
- O Neon MCP está desconectado durante a escrita deste relatório, impedindo
  nova consulta de contagens, roles, migrations, plano ou faturamento.

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

O estado acima é anterior ao commit e push da branch. Reexecutar os gates se
qualquer outro arquivo for alterado.

## Custo e recursos

A última consulta anterior do projeto registrou plano `free_v3`, autosuspend
imediato, 6.546.212 bytes transferidos, 823 segundos de compute, 3.284 segundos
ativos, sem storage faturável reportado naquele snapshot. O conector desconectado
impede confirmar valores atuais ou consultar fatura. **Nenhuma cobrança extra
foi indicada na telemetria disponível, mas o total faturado não foi verificado.**
O projeto temporário deve ser mantido enquanto as evidências forem necessárias;
exclusão depende de confirmação do usuário.

## Pendências bloqueadoras

1. Reconectar o conector Neon e conferir novamente projeto/branch, migrations,
   contagens, policies, grants e billing sem acessar produção ou demo
   compartilhado.
2. Completar os testes de RLS/RPC com administrador, administrador financeiro,
   usuário autenticado básico e anônimo em leitura e mutação, para todos os
   módulos.
3. Testar expiração/renovação de sessão e os estados de token de recuperação sem
   enviar email real.
4. Reproduzir/investigar o `42501` intermitente com telemetria redigida; manter
   registrada a falha inicial mesmo se uma repetição passar.
5. Validar auditoria e invariantes de concorrência por transações PostgreSQL
   reais nos fluxos ainda não cobertos.
6. Completar CSVs por parser: filtros, limite, ordenação, nulos, caracteres,
   aspas, delimitadores, autorização e consistência sob alterações concorrentes.
7. Reexecutar todos os gates sobre o conjunto final de mudanças e preservar os
   logs sem cookies, tokens, credenciais ou dados pessoais.
8. Revisão Codex do novo HEAD e resolução dos threads aplicáveis. O PR #25 deve
   permanecer em draft e sem merge, conforme autorização vigente.

**Pontuação estrita atual: 10/100. Meta 90/100: não atingida.** Somente o marco
de Internações foi considerado integralmente comprovado com a evidência
disponível; os demais contêm ao menos uma lacuna de aceite. Não declarar o
sistema homologado para liberação enquanto os bloqueadores acima permanecerem.
