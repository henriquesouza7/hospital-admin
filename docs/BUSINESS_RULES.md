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
- O cadastro de médicos nesta etapa contém somente nome, situação ativa/inativa e timestamps; não armazena dados clínicos, de contato, vínculo ou de pacientes.
- O nome é obrigatório, persistido após `trim` e limitado a 160 caracteres. Médicos novos começam ativos; registros são inativados, não apagados fisicamente.
- A lista administrativa inclui ativos e inativos e é ordenada por nome. Inativar um médico não removerá lançamentos históricos associados.
- Criação, alteração de nome e mudanças efetivas de situação geram auditoria com ator da sessão; tentativas sem mudança não geram evento.
- Lançamentos são agregados por data, médico e quantidade inteira não negativa. Há no máximo um lançamento diário por médico; mês e ano são derivados da data.
- Novos lançamentos manuais e importados exigem médico ativo. Médico inativo permanece associado ao histórico e a edição da quantidade desse registro não exige reativação.
- A edição do lançamento altera somente a quantidade; data e médico permanecem fixos. Edições sem mudança não geram evento de auditoria. Lançamentos não são apagados fisicamente.
- Metas configuráveis são hospitalares e independentes da produção: uma por mês ou por ano, com competência no primeiro dia do período. Os requisitos atuais não definem metas individuais por médico.
- A importação histórica aceita CSV UTF-8 com `data,medico,quantidade`, valida cada linha antes da confirmação e resolve médicos por nome normalizado exato e único. Não associa por similaridade; duplicidades no arquivo ou no banco rejeitam a transação inteira.
- A confirmação da importação exige o mesmo arquivo e administrador usados na prévia válida por cinco minutos. A persistência e a auditoria do lote são transacionais; nenhum dado de paciente é importado.

## Produção
- Cada procedimento precisa de unidade de contagem definida.
- Procedimentos diferentes não devem ser somados como se fossem equivalentes.
- Produção apresentada, aprovada e realizada devem permanecer distintas quando a fonte fornecer essas categorias.
- Reimportação da mesma competência deve detectar dados existentes.
- A primeira entrega registra volumes administrativos agregados; não armazena nem solicita identificadores ou dados individualizados de pacientes.
- A competência é mensal e persistida no primeiro dia do mês. A quantidade é inteira e não negativa, inclusive zero quando o fechamento do período exigir registrar ausência de ocorrências.
- Cada lançamento é único por procedimento, competência e fonte normalizada. Uma nova origem pode ser registrada separadamente; a mesma combinação deve ser corrigida pela edição do registro existente.
- Categorias e procedimentos são inativados, nunca excluídos pelo fluxo administrativo. Para inativar uma categoria, seus procedimentos ativos precisam ser inativados antes; procedimentos inativos continuam associados ao histórico.
- Cadastros e correções administrativas registram ator autenticado e valores anteriores/novos em `audit_logs`.
- A importação SUS aceita somente CSV UTF-8 com volumes agregados; não recebe nem persiste identificação individual de pacientes.
- O vínculo com o catálogo é manual e exato para cada código/nome apresentado. Não se cria procedimento e não se usa associação por similaridade.
- Classificações `apresentado`, `aprovado` e `realizado` permanecem em fontes distintas e nunca são somadas entre si.
- O SHA-256 do arquivo confirmado é único. Cada linha administrativa e seu vínculo manual ficam associados ao histórico da importação, sem persistir o CSV bruto nem colunas não selecionadas.
- Linhas do mesmo procedimento, competência e classificação são agregadas apenas dentro do arquivo confirmado. Se já houver lançamento na mesma combinação, o grupo fica pendente de reconciliação; a confirmação não soma nem substitui o valor existente.
- Na reconciliação, o administrador escolhe manter o lançamento atual ou substituí-lo pelo total importado. `keep_existing` preserva o registro bloqueado no estado atual e registra a quantidade capturada e a quantidade mantida; `replace_with_import` é bloqueado se o lançamento ou a unidade tiverem mudado desde a confirmação. Uma substituição com quantidade igual não dispara atualização nem auditoria de alteração do lançamento. Nenhuma importação ou lançamento é excluído.

## Pequenas Cirurgias
- Datas são criadas manualmente.
- Sexta-feira é comum, mas não obrigatória.
- Capacidade inicial sugerida: 10 vagas; pode ser alterada.
- Aguardando confirmação ocupa vaga.
- Fila de espera não ocupa vaga.
- Não reduzir capacidade abaixo dos agendamentos ativos.
- Cancelamento libera vaga, mas preserva histórico.
- Prioridade clínica não será inferida pelo sistema.
- A identificação administrativa coleta somente o nome. CPF, data de nascimento, contato e dados clínicos não são obrigatórios nem armazenados neste módulo.
- A ordem da fila é oldest-first para organização administrativa e não representa prioridade clínica.
- Transferir da fila somente para datas iguais ou posteriores à data operacional atual em `America/Sao_Paulo`; a operação valida a capacidade, cria um agendamento `confirmed` vinculado à entrada original e reutiliza o mesmo `patient_id`, preservando a entrada com status `transferred`.
- Criação de agendamento, mudança de status, ajuste de capacidade e transferência validam a capacidade no banco sob bloqueio transacional da data.
- Uma pessoa pode ter somente um agendamento ativo por data e uma entrada ativa na fila; cancelamentos e transferências permanecem registrados.

## Importação fiscal por XML da NF-e

- A leitura do XML gera somente uma prévia. O pedido e o vínculo fiscal são persistidos apenas após confirmação administrativa.
- A confirmação reinterpreta o XML enviado, compara o SHA-256 da prévia e exige que cada `nItem` da nota seja mapeado exatamente uma vez.
- O fornecedor e os produtos são selecionados manualmente no catálogo existente. A importação não cria cadastros nem decide vínculos por similaridade; `cProd` é um código do emitente e não identifica o `product_id` interno.
- Quantidade e valor unitário podem ser revisados antes da criação do pedido, respeitando até três casas decimais e duas casas decimais, respectivamente. Nenhum valor com precisão excedente é truncado silenciosamente.
- A chave de acesso possui unicidade no banco. O pedido e o registro fiscal são criados na mesma transação; conflito de chave reverte também o pedido.
- Os valores fiscais originais de cada item (`nItem`, `cProd`, `xProd`, `uCom`, `qCom`, `vUnCom` e `vProd`) são preservados separadamente em `fiscal_import_items`, ligados ao registro fiscal e ao item do pedido.
- Quantidade, preço e subtotal administrativos revisados continuam em `purchase_order_items` e não são substituídos pelos valores fiscais originais.
- O XML bruto não é persistido. Importações criadas antes da migration dos itens originais não podem ser preenchidas retroativamente, pois seus XMLs não foram armazenados.
- A confirmação exige evidência HMAC emitida no servidor após a prévia, vinculada ao hash do XML e ao administrador autenticado, com validade de cinco minutos. Um hash enviado pelo cliente não comprova a execução da prévia.
- O total da NF-e (`vNF`) pode divergir da soma dos itens do pedido por descontos, frete, tributos, despesas e arredondamentos; a diferença é informativa e não bloqueia automaticamente.
- Os subtotais administrativos seguem a regra de `purchase_order_items`: `round(quantity * unit_price, 2)`.
- O parser interpreta o conteúdo recebido, mas não consulta a SEFAZ nem valida situação fiscal em tempo real.
- PDF, imagem, OCR, armazenamento do XML e consultas fiscais online permanecem fora do escopo atual.
