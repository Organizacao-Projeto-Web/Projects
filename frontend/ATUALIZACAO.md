# Atualização do frontend — 04/11/2026

## Instalar no projeto que já está rodando

1. Pare somente o terminal do frontend com Ctrl+C. Deixe o backend aberto.
2. Extraia este ZIP em uma pasta temporária.
3. Faça uma cópia da sua pasta frontend antes de atualizar.
4. Copie o conteúdo da pasta frontend deste ZIP para Projects/frontend e aceite substituir os arquivos correspondentes. Não coloque uma pasta frontend dentro da outra.
5. Preserve seu arquivo frontend/.env.local. O ZIP não contém credenciais nem arquivos .env de execução.
6. No terminal do frontend, execute `npm run dev` e abra o endereço exibido.

As dependências não mudaram. Se estiver instalando em outra máquina ou sem node_modules, rode `npm ci` primeiro. Não substitua o backend, não importe novamente o SQL e não rode migrações para instalar esta atualização.

## Entregue

- Profissionais: busca, filtros por cargo, cadastro real de fisioterapeuta/recepção para administradores, validação e mensagens de falha/sucesso.
- Agenda: filtro por data/status, agendamento, cancelamento, marcação de realizado e início de atendimento no perfil correto. Usa os contratos verificados na branch origin/feature/agendamentos do arquivo enviado.
- Relatórios: resumo cadastral calculado com pacientes da API, filtro por período de cadastro e exportação CSV somente dos totais.
- Configurações: consulta dos dados da conta, permissões e orientação de alteração de senha.
- Login: cadastro de nova clínica/responsável e recuperação por e-mail em três etapas.
- Demonstração: conta fictícia de administrador para testar cadastro de equipe e agenda. Tudo permanece temporário, sem acesso ao banco.

## O que depende do backend

A branch origin/dev conferida na revisão do PR #31 está em 8513275. Nessa versão, GET /api/usuarios/profissionais e as rotas de agendamento ainda não estão disponíveis.

Na dev, administradores podem cadastrar usuários via POST /api/usuarios. A tela informa que a listagem aguarda integração. Quando a rota estiver disponível, a lista do modo conectado virá da API, inclusive após cadastrar um usuário. A agenda fica indisponível no modo conectado até as rotas serem integradas.

A branch de agenda inspecionada fornece:
- GET /api/usuarios/profissionais (ativos, admin/fisioterapeuta; fisioterapeuta vê somente a si mesmo).
- GET/POST /api/agendamentos.
- PATCH /api/agendamentos/{id}/status.

A listagem de profissionais dessa branch NÃO é uma listagem completa de usuários: exclui recepção e inativos. Para gestão completa de equipe, o responsável pelo backend precisa definir uma rota autorizada de usuários. Edição, inativação e exclusão não foram inventadas no frontend.

A integração da branch de agenda e a compatibilidade das migrações/banco devem ser revisadas pelo responsável pelo backend. O PR #31 mantém a integração da agenda dependente dessa branch.

Na agenda, “Iniciar atendimento” abre o formulário genérico da paciente correta. Salvar atendimento e marcar agendamento como realizado são operações separadas: não existe vínculo transacional consulta/agendamento no contrato inspecionado. Horários seguem a data/hora local enviada à API.

Recuperação depende de SMTP configurado no backend. Cadastro inicial exige CNPJ, conforme schema recebido. Profissional autônomo sem CNPJ ainda requer decisão e adaptação do backend.

## Ainda pendente para concluir o produto

- Integrar e testar agenda com backend atualizado; testar conflitos, perfis e isolamento entre clínicas.
- Disponibilizar listagem completa de equipe e definir operações de edição/inativação.
- Definir endpoints para edição do perfil e da clínica.
- Definir indicadores clínicos e relatórios completos com a equipe (o resumo entregue é apenas cadastral).
- Validar formulários dos quatro módulos clínicos, resumo do diário miccional e sua persistência antes da implementação.
- Validar envio real de recuperação e todos os fluxos com usuários de teste.
- Testar a interface em desktop e celular.

## Validação realizada

- `npm run build`: TypeScript e build de produção aprovados.
- `node --test tests/api.test.mjs`: 8 testes aprovados com respostas HTTP simuladas, cobrindo os contratos do cliente, formulário de login, Bearer, erros, recuperação e expiração. O comando de testes requer Node 22.13+ ou Node 24; não adiciona dependências.
- Não houve integração com MySQL/API reais nem validação visual desta atualização; a prévia de navegador não pôde ser inspecionada neste ambiente.

## Arquivos centrais

- src/pages/Management.tsx: profissionais, agenda, resumo e configurações.
- src/components/AccountForms.tsx: cadastro inicial e recuperação.
- src/App.tsx: navegação e estado de sessão/demonstração.
- src/lib/api.ts e types.ts: contratos HTTP e tipos.
- src/styles.css: estilos das novas telas.
- tests/api.test.mjs: testes do cliente HTTP sem backend real.
