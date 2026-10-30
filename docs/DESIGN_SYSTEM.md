# Design System — Hospital Sistema

## Fonte de verdade

O sistema usa uma única identidade clara, com Geist Sans, superfícies neutras e azul institucional para ações e foco. As quatro referências aprovadas orientam responsabilidades diferentes: estrutura e Auditoria (01), registros (02), análises (03) e Financeiro (04). Elas não criam temas separados.

- `src/app/globals.css`: tokens semânticos de base e estilos globais, inclusive páginas públicas.
- `src/components/admin-shell.css`: escala visual da aplicação autenticada, cores, espaçamentos, raios, sombras, sidebar e variações de gráficos por módulo. `.dashboard-shell` e `.module-shell` compartilham essa base.
- `src/components/page-header.css` e componentes em `src/components/ui/`: comportamento e acabamento dos controles reutilizáveis.
- CSS Modules e classes utilitárias de cada módulo: somente composição e necessidades específicas do domínio.

Não declarar valores equivalentes em outra folha quando já houver um token ou componente compartilhado. As cores de gráfico por módulo não mudam a cor da ação principal.

## Cores e tipografia

O shell autenticado usa `--surface-page: #f5f5f7`, `--surface-card: #fff`, `--text-primary: #1d1d1f`, `--text-secondary: #6e6e73` e `--accent-blue: #0071e3`. Usar `--action-primary` para confirmar e aplicar ações; `--destructive` somente para ações destrutivas. Estados de sucesso, aviso e erro têm tokens de texto, fundo e borda no shell.

Geist Sans é carregada no layout global. Títulos usam `--type-page-title` e `--type-section-title`; KPIs usam `--type-metric`; valores comparáveis e colunas numéricas usam algarismos tabulares. Cor reforça informação, sempre acompanhada por texto.

## Escala e estrutura

Os tokens `--space-1/2/3/4/5/6/8` equivalem a 4/8/12/16/20/24/32 px. Usar esses passos para gaps, margens e padding. O cabeçalho compartilhado tem 8 px entre identificação e título e 12 px entre título e descrição. Seções comuns usam 24 px; separações de grandes blocos, 32 px. A largura do conteúdo é fluida dentro do `AdminShell`; tabelas largas recebem região de rolagem própria.

Cards mantêm superfície branca, borda leve e sombra discreta. O raio de 20 px identifica painéis de dashboard; cartões analíticos compactos podem usar 12 px. A largura e o padding dos cards respondem ao conteúdo e ao viewport.

## Ações e campos

Usar `Button` como fonte de hierarquia: `default` para cadastrar, salvar, confirmar e aplicar; `outline` ou `secondary` para editar, voltar, ativar e cancelar; `caution` para inativar; `ghost` para ações auxiliares e sair; `destructive` para remover definitivamente. `summary` que abre edição reutiliza `buttonVariants` e mantém a semântica de expansão. Links que navegam preservam `<a>` com a mesma aparência quando necessário. Alturas: 40 px padrão, 36 px pequeno, 32 px extra pequeno e 48 px grande. Padding padrão: 16 px; gap texto/ícone: 8 px. Raio padrão: 8 px. Botões com apenas ícone exigem nome acessível. Foco visível, hover, disabled e feedback de envio são obrigatórios.

Ícones Lucide seguem a intenção: `Pencil` para editar, `PowerOff` para inativar, `Check` para ativar, `LogOut` para sair, `Trash2` para remoção, `ArrowLeft` para voltar e `Download` para exportar. Setas não representam edição. A cor de cautela usa os tokens `--status-warning-*` existentes e não indica perda definitiva de dados. Ações próximas usam `gap-2` ou `gap-3`; controles mobile mantêm nome e foco acessíveis, sem largura total indiscriminada.

Usar `SelectField`, `MonthYearPicker` e `DatePickerField` para controles equivalentes. Labels permanecem associados aos campos. Campos em filtros mantêm altura de 40 px e largura proporcional ao conteúdo. Inputs internos apenas para envio ou acessibilidade não recebem regras de largura destinadas aos campos visíveis.

## Dados, estados e navegação

`PageHeader`, `SectionHeader`, `KpiCard`, `ChartCard`, `StatusBadge` e `EmptyState` mantêm hierarquia entre módulos. Gráficos mostram unidade, período, legenda e estado vazio; Financeiro nunca exibe receitas, saldos ou variações sem cálculo homologado. Tabelas alinham números à direita, possuem cabeçalho identificável e rolagem própria no mobile. Os textos de erro distinguem indisponibilidade de ausência de registros.

A sidebar e a conta usam o `AdminShell`; links navegam e botões executam ações. Detalhes interativos e popovers devem funcionar por teclado, ter foco visível e permanecer dentro da área visível. Em mobile, controles podem empilhar, mas suas funções e rótulos permanecem acessíveis. Respeitar `prefers-reduced-motion`.

## Revisão

Cada mudança visual precisa de inspeção renderizada em 390, 768, 1024, 1440 e 1920 px, incluindo páginas filhas, detalhes com dados sintéticos, estados vazios e controles abertos. Registrar as capturas e divergências por rota. ESLint, TypeScript, build, testes pertinentes e `git diff --check` completam a validação técnica; nenhum deles substitui a revisão visual.
