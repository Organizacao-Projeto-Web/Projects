# Reab — frontend

Atualização de 04/11/2026: leia **ATUALIZACAO.md** para instalar sobre a versão anterior, conferir funcionalidades e dependências do backend.

Esta entrega parte do commit 8513275 da dev, na branch feature/frontend-base.
O backend não foi alterado. O frontend HTML/JS anterior foi preservado em legacy/.

## Rodar sem backend (Windows / VS Code)

1. Extraia o ZIP recebido em uma pasta temporária.
2. Na sua pasta Projects, renomeie a pasta frontend atual para frontend_backup (fora desta entrega).
3. Copie a pasta frontend deste ZIP para dentro de Projects.
4. Abra Projects no VS Code e abra Terminal > Novo Terminal.
5. Confira `node -v` e `npm -v`. Este projeto usa Vite 8 e exige Node 20.19+ na linha 20, ou Node 22.12+ (conforme engines do package.json). Node 24 foi usado na validação. Se não houver Node instalado, instale uma versão LTS compatível pelo site oficial https://nodejs.org e reabra o VS Code.
6. Execute, na raiz Projects:

```sh
cd frontend
npm ci
npm run dev
```

7. Abra http://localhost:5173 e clique em **Explorar demonstração**.

Não abra o index.html com duplo clique ou Live Server: os arquivos TSX precisam do Vite.
Se a porta 5173 estiver ocupada, encerre o servidor anterior. A porta é fixa para coincidir com o CORS previsto no backend.

## O que está disponível

- Login visual com exibição/ocultação de senha e tratamento de falhas.
- Entrada explícita em demonstração, sem chamar backend.
- Dashboard com contagem real dos dados disponíveis na sessão; nenhum indicador clínico inventado.
- Lista de pacientes, busca por nome/CPF, cadastro e edição.
- Perfil da paciente e registro/histórico de atendimentos genéricos.
- Menu responsivo e formulários com validação e diálogos acessíveis.
- Os quatro módulos clínicos aparecem como planejamento, dentro do perfil da paciente e como apresentação no dashboard.
- Agenda, profissionais, resumo cadastral e configurações possuem telas implementadas; as dependências e limites de integração estão em ATUALIZACAO.md.
- Cadastro inicial e recuperação de senha integrados aos contratos existentes.

Os dados demonstrativos são fictícios e ficam apenas na memória. Recarregar a página ou sair encerra a sessão e descarta as alterações. Não use dados reais na demonstração.

## Executar com o backend da dev no Windows

1. Inicie o MySQL ou o banco do XAMPP e crie um banco local separado chamado `reab_db` com `CREATE DATABASE IF NOT EXISTS reab_db CHARACTER SET utf8mb4;`.
2. No arquivo local `backend/.env`, configure `DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT`, `DB_NAME=reab_db` e `SECRET_KEY` com uma chave de desenvolvimento. A API cria as tabelas ao iniciar em um banco novo. Use `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173` se precisar sobrescrever o padrão.
3. Em um terminal PowerShell na raiz do projeto, execute:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

4. Confira a API em http://127.0.0.1:8000/docs. Em outro terminal, na raiz do projeto, execute:

```powershell
cd frontend
# Se já existir .env.local, edite-o em vez de sobrescrevê-lo.
Copy-Item .env.example .env.local
npm ci
npm run dev
```

5. Confirme `VITE_API_URL=http://127.0.0.1:8000/api` no `frontend/.env.local` e reinicie o Vite se alterar o arquivo. Abra http://localhost:5173. Use uma conta de teste do banco ou crie uma clínica de teste pelo formulário de cadastro inicial.

Variáveis `VITE_` ficam visíveis no navegador. Mantenha as credenciais e a chave JWT no arquivo local do backend.

Contratos disponíveis na dev usados pelo frontend:

- POST /cadastro, POST /usuarios (administradores) e recuperação de senha por e-mail (requer SMTP).
- POST /auth/login com username/password em application/x-www-form-urlencoded.
- GET /usuarios/me.
- GET/POST /pacientes.
- PATCH /pacientes/{id}.
- GET /consultas/paciente/{id}.
- POST /consultas.

O token fica somente em memória. Recarregar exige login novamente. Um 401 de uma sessão ativa limpa a sessão. A clínica nunca é escolhida no formulário de paciente. O perfil recepcao não recebe a consulta de histórico nem a opção de registrar atendimento. O backend continua responsável por autorizar todas as ações.

O perfil nesta primeira versão é resolvido pela listagem de pacientes já carregada. Busca individual, paginação e otimização podem ser evoluídas depois.

## Organização para dois desenvolvedores

- src/App.tsx: layout, rotas e páginas da primeira entrega.
- src/components/PatientForm.tsx: cadastro e edição de paciente.
- src/components/Modal.tsx: diálogo compartilhado.
- src/lib/api.ts: chamadas HTTP e sessão.
- src/lib/types.ts: contratos TypeScript.
- src/lib/demo.ts: dados fictícios iniciais.
- src/styles.css: estilos e responsividade.
- legacy/: versão HTML/JavaScript anterior, apenas como referência.

Primeiro integrem esta base na dev via PR. Depois criem branches separadas: autenticação/cadastro/recuperação para um desenvolvedor; pacientes/perfil/atendimentos para o outro. Extraiam as páginas de App.tsx para arquivos próprios ao dividir as tarefas. Combinem quem altera navegação, tipos e estilos compartilhados.

## Pendências

Consulte a lista atualizada em ATUALIZACAO.md.

Sem assistente clínico com IA, sem portal de paciente e sem mudança de nome do produto.

## Validação da base anterior

A validação específica desta atualização está em ATUALIZACAO.md. Os testes manuais abaixo foram da primeira base:

- TypeScript + build de produção: `npm run build`.
- Teste manual no navegador: entrar em demonstração, cadastrar paciente, abrir perfil e registrar atendimento no histórico.
- Integração real não executada: depende de uma API em funcionamento e credenciais de desenvolvimento.
- CSS inclui adaptações para telas pequenas; o teste visual desta entrega foi em desktop.
- Fontes são carregadas do Google Fonts; sem rede, há fallback sans-serif.

A aplicação é uma primeira base de desenvolvimento, não uma entrega completa para uso clínico em produção.
