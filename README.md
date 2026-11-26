# REAB — Prontuário eletrônico

Projeto em desenvolvimento para gestão de clínicas de fisioterapia, com backend FastAPI/MySQL e frontend React/Vite. Esta documentação descreve o código incluído nesta versão; não é um guia de implantação em produção.

## Funcionalidades implementadas no código

- Cadastro inicial de clínica e responsável, autenticação JWT, recuperação de senha por e-mail (depende de configuração de envio).
- Gestão de usuários e equipe com permissões por perfil (`admin`, `fisioterapeuta`, `recepcao`).
- Cadastro, edição, busca e consulta de pacientes; isolamento de dados por clínica e CPF único por clínica.
- Agenda por profissional: criar/listar agendamentos, cancelar e marcar como realizado; validações de horário e de permissões.
- Registro e histórico de consultas/atendimentos.
- Avaliações clínicas para Fisioterapia Pélvica, Gestação e Pós-parto, Reabilitação e Climatério/Menopausa; formulários clínicos ainda sujeitos à validação profissional.
- Frontend com modo de demonstração (dados fictícios em memória) e modo conectado à API.

## Executar localmente

**Requisitos:** Python compatível com as dependências de `backend/requirements.txt`, MySQL, Node.js compatível com `frontend/package.json` e npm.

1. Crie um banco MySQL para desenvolvimento. Configure `backend/.env` com `DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `SECRET_KEY` e, quando necessário, `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`. **Não versionar o `.env`.**
2. Na raiz do projeto, abra um terminal para o backend:

   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   python -m alembic upgrade head
   python -m uvicorn app.main:app --reload --port 8000
   ```

   Se já usa um ambiente virtual de desenvolvimento, ative-o em vez de criar outro. A migração deve ser executada no banco configurado; faça backup antes de migrar um banco com dados importantes. Documentação interativa: http://127.0.0.1:8000/docs.
3. Em outro terminal, inicie o frontend:

   ```powershell
   cd frontend
   npm ci
   npm run dev
   ```

   Crie `frontend/.env.local` com `VITE_API_URL=http://127.0.0.1:8000/api` para o modo conectado; depois abra http://localhost:5173. Variáveis `VITE_` são públicas no navegador: nunca coloque senhas ali.

## Agenda: prevenção de duplo agendamento

O `POST /api/agendamentos` valida conflitos entre intervalos de horário do mesmo profissional e da mesma clínica (exceto agendamentos cancelados). Havendo sobreposição, responde `409` com a mensagem `Já existe um agendamento para este profissional nesse horário.`.

A criação agora bloqueia transacionalmente a linha do profissional no MySQL/InnoDB com `SELECT ... FOR UPDATE` e executa a leitura de conflitos com bloqueio de leitura atual antes de gravar. Assim, requisições simultâneas para o mesmo profissional são serializadas até o `commit`/`rollback`. Agendamentos de profissionais diferentes não dependem do mesmo bloqueio. **Requer MySQL/InnoDB;** não é garantia de exclusividade para inserções feitas diretamente no banco ou por outros caminhos que ignorem o protocolo de bloqueio.

## Verificação

Backend, usando **exclusivamente banco MySQL de testes separado** configurado pelos fixtures (`projeto_extensionistadb_test`; os testes apagam suas tabelas):

```powershell
cd backend
python -m pytest tests/test_agendamentos.py -q
python -m pytest -q
```

Frontend:

```powershell
cd frontend
npm run build
node --test tests/api.test.mjs
```

Os testes e o build desta versão devem ser executados no ambiente de desenvolvimento antes da entrega; não são declarados como aprovados apenas por estarem documentados.

## Situação e limites

- A avaliação clínica e o encerramento do agendamento são operações separadas, não uma única transação de banco.
- Recuperação de senha depende do serviço SMTP configurado no backend.
- O controle de tentativas de login usa memória local; configuração de Redis, proxy e infraestrutura de produção foi adiada para depois da apresentação.
- Não utilizar dados reais de pacientes na demonstração. Para operação clínica real, são necessárias validações adicionais de privacidade, segurança, backup e implantação.

A documentação de funcionalidades do frontend está em [`frontend/README.md`](frontend/README.md). O antigo [`frontend/ATUALIZACAO.md`](frontend/ATUALIZACAO.md) foi substituído por uma nota para impedir instruções desatualizadas.
