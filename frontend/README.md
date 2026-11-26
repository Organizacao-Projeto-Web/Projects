# REAB — Frontend React/Vite

Este é o frontend atual do REAB. O guia principal de instalação e validação fica em [`../README.md`](../README.md).

## Executar

Com o backend disponível na porta `8000`, crie `frontend/.env.local` contendo:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

No diretório `frontend`:

```powershell
npm ci
npm run dev
```

Abra http://localhost:5173. Para verificar o build: `npm run build`. Os testes existentes do cliente HTTP podem ser executados com `node --test tests/api.test.mjs`.

## Funcionalidades presentes

- Login, cadastro inicial da clínica e recuperação de senha integrada à API (envio condicionado ao SMTP no backend).
- Dashboard, pacientes, perfil, consultas e histórico.
- Profissionais/equipe, agenda com criação e atualização de status, resumo cadastral e configurações.
- Formulários dos quatro módulos clínicos: Fisioterapia Pélvica, Gestação e Pós-parto, Reabilitação e Climatério/Menopausa. Os conteúdos clínicos ainda requerem validação profissional.
- Modo de demonstração com dados fictícios em memória; modo conectado usando `VITE_API_URL`.

A API é responsável por autenticação, permissões e isolamento por clínica. O cliente mostra os erros retornados (inclusive conflitos `409` de agendamento). O token de sessão é guardado apenas em memória; recarregar a página exige novo login.

## Limites conhecidos

- Salvar uma avaliação e marcar o agendamento como realizado são operações separadas.
- O resumo cadastral não substitui relatórios clínicos.
- A pasta `legacy/` contém a interface anterior, apenas como referência.
- Esta documentação descreve código existente, não certifica testes manuais, validação clínica ou prontidão para produção.

> O antigo `ATUALIZACAO.md` documentava uma entrega parcial de 04/11/2026 e não representa mais o estado atual do projeto.
