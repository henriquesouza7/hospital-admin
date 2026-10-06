# Regras de Negócio

## Financeiro
- Preço histórico pertence ao item do pedido, não ao cadastro do produto.
- Comparações devem respeitar apresentação e unidade equivalentes.
- Sistema pode identificar aumento; não deve inventar a causa do aumento.
- Reimportações não podem somar valores duplicados.

### Indicadores e comparativos
- Indicadores financeiros são derivados de pedidos e despesas mensais existentes; não criam uma fonte paralela de totais ou preços.
- Comparações de preço exigem o mesmo `product_id` e apresentações históricas equivalentes. A equivalência normaliza somente espaços externos e diferenças de maiúsculas/minúsculas; não há associação semântica ou fuzzy matching.
- Histórico de itens usa `product_name_snapshot`, `product_category_snapshot` e `product_presentation_snapshot`, mesmo quando o cadastro atual mudou ou está inativo.
- Aumento de preço é uma diferença observada entre compras consecutivas equivalentes e não implica causa.
- O menor preço é o melhor preço observado no período e não representa oferta atual ou futura. Empates permanecem associados a todos os fornecedores observados no valor mínimo.
- Grupos com apenas um fornecedor observado não são uma comparação entre fornecedores e ficam fora da economia potencial.
- Economia potencial é retrospectiva: compara cada subtotal persistido com a simulação baseada no menor preço observado no período, somente quando há pelo menos dois fornecedores distintos. Não garante que o benchmark estivesse disponível na data da compra ou que estará disponível futuramente.
- O subtotal simulado respeita o arredondamento persistido: `round(quantity * unit_price, 2)`, com quantidade de três casas e preço unitário de duas casas. A economia por item nunca é negativa.
- A Feira participa dos totais consolidados e da evolução mensal como total por competência; não é tratada como pedido nem entra em comparações de produto.

### Feira
- A comparação anual usa somente os mesmos meses registrados nos dois anos.
- Se faltar qualquer mês equivalente no ano anterior, a comparação não é calculada.
- Alterações de observação preservam na auditoria os valores anterior e normalizado novo.

## Internações
- Cada internação deve ser atribuída por uma regra administrativa única ao médico responsável.
- Meses em andamento devem ser visualmente diferenciados de meses encerrados.
- Quantidade de internações mede volume, não qualidade clínica.

## Produção
- Cada procedimento precisa de unidade de contagem definida.
- Procedimentos diferentes não devem ser somados como se fossem equivalentes.
- Produção apresentada, aprovada e realizada devem permanecer distintas quando a fonte fornecer essas categorias.
- Reimportação da mesma competência deve detectar dados existentes.

## Pequenas Cirurgias
- Datas são criadas manualmente.
- Sexta-feira é comum, mas não obrigatória.
- Capacidade inicial sugerida: 10 vagas; pode ser alterada.
- Aguardando confirmação ocupa vaga.
- Fila de espera não ocupa vaga.
- Não reduzir capacidade abaixo dos agendamentos ativos.
- Cancelamento libera vaga, mas preserva histórico.
- Prioridade clínica não será inferida pelo sistema.
