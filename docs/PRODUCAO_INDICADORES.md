# Indicadores de Produção

## Escopo

O dashboard em `/producao/indicadores` apresenta indicadores administrativos derivados das tabelas `production_entries`, `procedures` e `procedure_categories`. Não cria tabelas ou totais persistidos paralelos e não contém dados de demonstração.

O acesso é restrito ao administrador pelo mesmo caminho server-side do módulo de Produção. A página valida filtros com Zod, carrega os dados pela Neon Data API e calcula os indicadores em funções puras antes de renderizar componentes de servidor e gráficos Recharts.

## Filtros

- Competência mensal: consulta uma competência e compara com o mês anterior e com o mesmo mês do ano anterior.
- Intervalo mensal: filtra entre as competências inicial e final, inclusive.
- Ano: filtra janeiro a dezembro e compara com o ano anterior.
- Categoria, procedimento e origem: aplicados em conjunto ao período.

Filtros ausentes usam a competência atual. Valores malformados ou combinações incompatíveis mostram mensagem e retornam a filtros padrão seguros. O filtro de procedimento pode apontar para cadastro inativo para permitir consulta histórica.

## Regras de agregação

- A quantidade só é somada para o mesmo `procedure_id`, `counting_unit` histórico e `source`.
- Procedimentos, unidades e origens diferentes aparecem em séries, linhas ou grupos separados. `apresentado`, `aprovado`, `realizado` e outras origens nunca são tratados como eventos adicionais de uma única soma.
- A comparação mensal e anual só pareia valores com o mesmo procedimento, unidade histórica e origem. Sem registro é mostrado como ausência; um lançamento persistido de quantidade zero permanece como zero.
- O gráfico de evolução mensal exibe até 12 competências terminando na competência selecionada, ou o intervalo anual/mensal escolhido. Lacunas ficam sem ponto e não são preenchidas com zero.
- O ranking lista até dez combinações de procedimento/unidade/origem por gráfico. Agrupamento por categoria é apenas organizacional e não publica total da categoria.
- O histórico de variação compara com a competência registrada imediatamente anterior para a mesma origem e unidade. Ele não infere causa e volume não mede qualidade clínica.

## Consultas e paginação

A fonte é carregada em três conjuntos: categorias, procedimentos e lançamentos. Cada conjunto usa a paginação determinística já existente no repositório de Produção, em páginas de 1000 linhas; categorias e procedimentos são carregados uma vez e ligados em memória por ID. Não há consulta por linha nem agregação na UI que faça N+1.

A unidade de cada lançamento vem de `production_entries.counting_unit`, preservando a unidade histórica mesmo após alterações no cadastro atual do procedimento.

## Estados e apresentação

A rota tem fallback de carregamento, Error Boundary com tentativa de recuperação, validação de filtros, mensagens vazias para ausência de dados e estados que distinguem zero persistido de ausência de registro. As tabelas agrupadas têm rolagem horizontal e os gráficos dividem séries por unidade de contagem.

Os dados apresentados são volumes administrativos persistidos. Não representam qualidade clínica, resultados individuais ou informação de pacientes.
