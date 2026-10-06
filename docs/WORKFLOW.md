# Fluxo de Desenvolvimento

## Branches
- `main`: sempre deve representar uma versão íntegra do projeto.
- Features: `feat/<nome-curto>`
- Correções: `fix/<nome-curto>`
- Infraestrutura/documentação: `chore/<nome-curto>` ou `docs/<nome-curto>`

Exemplos:
- `feat/admin-shell`
- `feat/finance-pharmacy`
- `fix/duplicate-import`

## Pull Requests
Toda feature relevante deve chegar à `main` por PR.

Um PR deve:
- ter escopo pequeno e claro;
- explicar o que mudou;
- listar como foi testado;
- evitar alterações não relacionadas;
- passar por lint, typecheck e testes aplicáveis.

## Commits
Preferir commits pequenos e coerentes.

Usar prefixo Conventional Commits em inglês e descrição da mudança em português.
Exemplo: `feat: implementa cadastro de fornecedores`.

Exemplos:
- `chore: bootstrap next app`
- `feat: add admin navigation shell`
- `feat: add pharmacy suppliers schema`
- `fix: prevent duplicate production import`

## Trabalho com Codex
O Codex deve:
1. Ler `AGENTS.md`.
2. Ler a documentação relevante em `docs/`.
3. Trabalhar em branch própria.
4. Não expandir escopo por iniciativa própria.
5. Executar validações antes de concluir.
6. Resumir alterações e riscos.
7. Abrir PR quando solicitado.

## Trabalho em dupla
Evitar duas pessoas alterando o mesmo conjunto de arquivos simultaneamente.

Separar trabalho por issue/branch e revisar via PR.

## Regra de segurança
Enquanto o repositório estiver público:
- não versionar `.env`;
- não versionar secrets;
- não usar dados reais de pacientes;
- não enviar arquivos internos do hospital contendo dados sensíveis.
