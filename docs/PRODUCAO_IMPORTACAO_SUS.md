# Importação SUS e reconciliação de Produção

## Formato aceito

A primeira versão aceita somente CSV UTF-8 com cabeçalho, delimitado por ponto
e vírgula ou vírgula. O arquivo pode ter até 2 MB, 40 colunas e 500 linhas de
dados. PDF, XLSX, OCR e consultas online ao SUS não fazem parte desta entrega.

O administrador informa a competência mensal e mapeia as colunas de:

- nome do procedimento (obrigatório);
- quantidade inteira não negativa (obrigatória; zero é válido);
- classificação `apresentado`, `aprovado` ou `realizado` (obrigatória);
- código SUS (opcional).

O CSV precisa ter pelo menos duas colunas com nomes únicos. Linhas precisam ter
a mesma quantidade de campos. Aspas, delimitadores e quebras de linha em campos
seguem o formato CSV com aspas duplas. Cabeçalhos que identificam paciente,
CPF, CNS, prontuário, nascimento, telefone ou endereço são recusados. O arquivo
bruto e as colunas não mapeadas não são persistidos. Cabeçalhos compostos e
qualificados, como `cpf_do_paciente` e `telefone do paciente`, também são
recusados.

Exemplo fictício, somente administrativo:

```csv
codigo;procedimento;quantidade;situacao
0101010101;Procedimento de teste;12;realizado
```

## Vínculo e confirmação

Cada combinação exata de código e nome recebe um vínculo manual com um
procedimento ativo do catálogo. A interface mostra unidade e categoria para
conferência. Nenhum vínculo é sugerido por similaridade, e nenhum procedimento
é criado pela importação.

A prévia valida competência, colunas, classificação, quantidade e tamanho. A
evidência HMAC expira em cinco minutos e vincula identidade admin, hash do
arquivo, competência, delimitador e mapeamento das colunas. Na confirmação, o
servidor reabre e reprocessa o arquivo, revalida o token e os vínculos e envia
somente os campos administrativos permitidos para a RPC transacional.

O SHA-256 impede confirmar duas vezes o mesmo conteúdo. As linhas confirmadas
preservam código/nome de origem, classificação, quantidade, número da linha e
procedimento selecionado. O arquivo bruto não é guardado. Linhas do mesmo
procedimento e classificação são agregadas dentro da importação, sem misturar
`apresentado`, `aprovado` e `realizado`.

## Reconciliação

Uma combinação que já tenha lançamento na competência e classificação alvo
fica pendente. O administrador escolhe manter o valor existente ou substituí-lo
pelo total importado. O fluxo nunca soma os dois valores. A substituição corrige
o lançamento existente, preserva a unidade histórica e dispara auditoria. As
decisões e as linhas de origem permanecem no histórico; não há exclusão física.
Cada pendência aponta para o lançamento capturado na confirmação. Se esse
lançamento tiver mudado apenas de quantidade, a opção de substituição é
bloqueada. A opção de manter continua disponível: ela bloqueia o valor atual
sob lock, finaliza a pendência sem sobrescrever esse valor e audita tanto a
quantidade capturada na importação quanto a quantidade mantida. Se o lançamento
capturado não existir mais ou tiver mudado de competência, procedimento ou
classificação, a RPC pede nova conferência; ela não procura nem altera outro
lançamento semelhante.

As tabelas de importação têm leitura administrativa por RLS e sem DML direto
para `authenticated`. As RPCs `SECURITY DEFINER` validam `public.is_admin()`,
usam `auth.user_id()` como ator, restringem `search_path` e gravam auditoria.
