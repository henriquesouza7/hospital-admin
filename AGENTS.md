# AGENTS.md

## Propósito
Este repositório contém um sistema interno de gestão administrativa hospitalar. Agentes devem preservar simplicidade, rastreabilidade, segurança e clareza arquitetural.

## Regras obrigatórias
- Não implementar funcionalidades fora do escopo solicitado.
- Não alterar banco de dados sem migration versionada.
- Não colocar segredos, chaves ou credenciais no código.
- Não confiar no frontend para regras críticas de negócio ou autorização.
- Evitar `any` em TypeScript; justificar quando inevitável.
- Reutilizar componentes e utilitários existentes antes de criar duplicações.
- Manter regras de negócio fora de componentes visuais quando possível.
- Preservar histórico de alterações em dados administrativos relevantes.
- Nunca usar dados reais de pacientes em seeds, mocks, testes ou screenshots.
- Antes de concluir uma tarefa: executar lint, typecheck e testes aplicáveis.
- Commits devem ser pequenos e descrever uma mudança coerente.
- Não fazer refactors amplos durante uma feature sem necessidade explícita.

## Fluxo de trabalho
1. Ler README e documentos em `docs/`.
2. Confirmar o escopo da tarefa.
3. Criar/usar branch de feature.
4. Implementar a menor mudança completa possível.
5. Testar.
6. Resumir arquivos alterados, decisões e riscos.
7. Abrir PR quando solicitado.

## Convenções iniciais
- Linguagem da aplicação: pt-BR.
- Código e nomes técnicos: inglês quando fizer sentido; termos de domínio podem permanecer em português quando reduzirem ambiguidade.
- Banco relacional PostgreSQL.
- Preferir arquitetura modular.
- Evitar microsserviços no MVP.
