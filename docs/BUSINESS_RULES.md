# Regras de Negócio

## Financeiro
- Preço histórico pertence ao item do pedido, não ao cadastro do produto.
- Comparações devem respeitar apresentação e unidade equivalentes.
- Sistema pode identificar aumento; não deve inventar a causa do aumento.
- Reimportações não podem somar valores duplicados.

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
