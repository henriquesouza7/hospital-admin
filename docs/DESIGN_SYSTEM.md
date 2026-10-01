# Design System — Fundação Visual

## Direção visual

A aplicação deve ter aparência de dashboard administrativo hospitalar moderno, limpo e profissional.

Referência conceitual fornecida pelo projeto:
- sidebar fixa à esquerda;
- conteúdo principal amplo;
- cards de indicadores grandes;
- forte hierarquia tipográfica;
- filtros compactos;
- gráficos em cartões;
- bastante espaço em branco;
- bordas suaves;
- sem aparência de landing page.

A referência serve como linguagem visual, não como layout para copiar literalmente.

## Tema

Nesta fase, o sistema terá somente tema claro.

Modo escuro fica fora do escopo até decisão futura.

## Paleta base

### Institucional
- Brand / Baby Blue: `#90D5FF`
- Background principal: `#FFFFFF`
- Background secundário: azul muito claro derivado da cor institucional
- Superfícies/cards: `#FFFFFF`
- Texto principal: quase preto / azul-preto
- Texto secundário: cinza frio
- Bordas: cinza-azulado muito claro

### Uso da cor institucional

`#90D5FF` é a cor de identidade e deve aparecer em:
- item ativo da navegação;
- badges;
- ícones;
- destaques;
- superfícies suaves;
- gráficos;
- botões quando houver contraste suficiente.

Não usar texto branco sobre `#90D5FF` por padrão. Para botões com essa cor, preferir texto escuro.

Quando estados hover/focus exigirem mais contraste, utilizar tons derivados mais escuros da mesma família, documentados como tokens, sem introduzir outra cor principal concorrente.

## Tipografia

Objetivo:
- títulos fortes e claros;
- números/KPIs com alta legibilidade;
- textos auxiliares discretos;
- boa leitura em operação diária.

Manter fonte sans-serif moderna da aplicação, salvo futura decisão de branding.

## Layout

### Desktop
Prioridade principal do MVP.

- sidebar fixa ou sticky;
- conteúdo com largura fluida;
- grid responsivo de cards;
- espaçamento consistente;
- evitar páginas excessivamente largas sem agrupamento visual.

### Mobile/tablet
- navegação adaptativa;
- cards empilhados;
- tabelas com estratégia responsiva apropriada;
- preservar funções críticas.

## Sidebar

Estrutura prevista:
- área superior reservada para logo futura;
- identificação temporária do sistema enquanto a logo não for adicionada;
- grupos de navegação;
- item ativo destacado com fundo azul institucional suave;
- ícones Lucide;
- Financeiro com subitens Farmácia, Laboratório e Feira;
- Internações;
- Produção;
- Pequenas Cirurgias;
- Configurações.

A logo oficial será adicionada posteriormente.

## Cabeçalho de página

Cada módulo deve poder usar:
- eyebrow/identificador opcional;
- título principal;
- descrição curta quando necessária;
- ações principais à direita ou abaixo no mobile;
- filtros de período próximos ao contexto que controlam.

## Cards de KPI

Padrão visual:
- superfície branca;
- borda sutil;
- radius médio/grande;
- sombra muito discreta ou nenhuma;
- rótulo pequeno;
- valor com alta ênfase;
- comparação/legenda secundária;
- ícone ou badge opcional.

Cards de destaque podem usar fundo azul institucional ou azul derivado, desde que o contraste do conteúdo seja validado.

## Gráficos

- Recharts.
- Paleta consistente e documentada.
- Eixos e grades discretos.
- Legendas simples.
- Tooltips claros.
- Evitar efeitos 3D, gradientes excessivos e decoração sem função.
- Sempre mostrar unidade e período.

## Tabelas

Priorizar leitura operacional:
- cabeçalho claro;
- linhas com bom espaçamento;
- busca e filtros quando necessários;
- ações por linha sem poluição visual;
- ordenação apenas quando útil;
- estados vazios bem definidos;
- paginação quando volume exigir.

## Formulários

- labels explícitos;
- mensagens de erro próximas ao campo;
- indicar obrigatoriedade de forma consistente;
- formulários longos divididos em seções;
- confirmação para ações destrutivas;
- feedback de sucesso/erro.

## Status

Não comunicar estado apenas por cor.

Status devem combinar:
- texto;
- badge;
- ícone quando útil;
- cor como reforço visual.

## Componentes-base previstos

- AppShell
- Sidebar
- SidebarItem / SidebarGroup
- PageHeader
- SectionHeader
- KpiCard
- DataTable
- SearchInput
- PeriodFilter
- DatePicker
- FormField
- StatusBadge
- Dialog
- ConfirmDialog
- Alert
- EmptyState
- Skeleton
- ChartCard
- Button
- Input
- Select
- Textarea

## Acessibilidade

- contraste suficiente;
- foco de teclado visível;
- navegação por teclado;
- labels corretos;
- sem depender exclusivamente de cor;
- elementos interativos com estados hover/focus/disabled;
- sem reduzir legibilidade para imitar a referência visual.

## Restrições

- Não criar dark mode nesta fase.
- Não usar gradientes decorativos como linguagem principal.
- Não adicionar múltiplas cores fortes sem função semântica.
- Não exagerar em sombras.
- Não transformar dashboard em landing page.
- Não inventar logo ou identidade visual do hospital.
- Não usar dados reais em mockups.
- A logo será fornecida futuramente.

## Evolução

Este documento define a fundação visual. Tokens e componentes podem ser refinados conforme os módulos reais forem implementados, evitando redesigns arbitrários entre páginas.
