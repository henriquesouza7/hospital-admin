# Requisitos Iniciais

## Gerais
- Aplicação web interna.
- Interface em pt-BR.
- Filtros por período.
- Exportação de dados onde fizer sentido.
- Histórico confiável.
- Dashboards e gráficos derivados dos registros.

## Financeiro
Subáreas: Farmácia, Laboratório e Feira.

### Farmácia e Laboratório
- Registrar pedidos por data e fornecedor.
- Registrar itens, quantidade, unidade, valor unitário e subtotal.
- Manter histórico de preços.
- Comparar fornecedores por produto.
- Identificar variações de preço.
- Importar nota fiscal futuramente, com prévia para conferência.
- Detectar duplicidade de notas/importações.

### Feira
- Registrar valor total mensal.
- Comparar mês a mês e ano a ano.

## Internações
- Acompanhar total mensal e anual do hospital.
- Acompanhar total por médico.
- Metas mensais e anuais configuráveis.
- Página individual por médico.
- Lançamentos manuais e importação histórica.
- Não armazenar paciente individual no MVP.

## Produção
- Registrar quantidade por procedimento específico e competência.
- Agrupar procedimentos por categoria.
- Ex.: hemograma, glicemia, raio-X de tórax, raio-X de pé, ECG, atendimentos.
- Importar relatórios do sistema SUS.
- Reconhecer procedimentos por código/nome.
- Evitar dupla importação.
- Comparar mês/mês e ano/ano.

## Pequenas Cirurgias
- Criar manualmente dias de procedimento.
- Capacidade padrão de 10, mas ajustável por data.
- Lista de pacientes por data.
- Status: aguardando confirmação, confirmado e demais estados futuros.
- Fila de espera independente das datas.
- Transferir pessoa da fila para data confirmada.
- Cancelamentos devem preservar histórico.
