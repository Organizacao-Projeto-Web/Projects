import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const source = (await readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8')).replace('import.meta.env.VITE_API_URL', '"http://api.test/api"');
const { api, clearSession, ApiError } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
const calls = [];
const replies = [];
const events = [];
globalThis.window = { dispatchEvent: e => events.push(e.type) };
globalThis.fetch = async (url, init) => {
  calls.push({url, ...init});
  const [status, data] = replies.shift() ?? [200, {}];
  return new Response(JSON.stringify(data), {status});
};
function reset() {clearSession(); calls.length=0; replies.length=0; events.length=0;}

test('login envia formulário e carrega usuário com Bearer', async () => {
  reset(); replies.push([200,{access_token:'test-token'}], [200,{id:1,cargo:'admin'}]);
  assert.equal((await api.login('teste@example.com','senha-ficticia')).id,1);
  assert.equal(calls[0].url,'http://api.test/api/auth/login');
  assert.ok(calls[0].body instanceof URLSearchParams);
  assert.equal(calls[0].body.get('username'),'teste@example.com');
  assert.equal(calls[1].headers.get('Authorization'),'Bearer test-token');
});
test('cadastro de usuário envia campos do contrato sem escolher clínica', async () => {
  reset(); const input = {nome:'Teste',email:'teste@example.com',whatsapp:'11999999999',senha:'ficticia123',cargo:'recepcao',crefito:null};
  await api.createUser(input);
  assert.equal(calls[0].url,'http://api.test/api/usuarios');
  assert.equal(calls[0].method,'POST'); assert.deepEqual(JSON.parse(calls[0].body),input);
  assert.equal(calls[0].headers.get('Content-Type'),'application/json');
});
test('rotas de agenda preservam ids, duração e atualização de status', async () => {
  reset(); const input={paciente_id:2,profissional_id:3,data_hora:'2026-11-05T09:00',duracao_minutos:60,observacoes:null};
  await api.appointments(); await api.professionals(); await api.createAppointment(input); await api.appointmentStatus(4,'cancelado');
  assert.deepEqual(calls.map(c => c.url),['http://api.test/api/agendamentos','http://api.test/api/usuarios/profissionais','http://api.test/api/agendamentos','http://api.test/api/agendamentos/4/status']);
  assert.deepEqual(JSON.parse(calls[2].body), input); assert.equal(calls[3].method,'PATCH'); assert.deepEqual(JSON.parse(calls[3].body),{status:'cancelado'});
});
test('404 de recurso opcional é distinguível e não encerra sessão', async () => {
  reset(); replies.push([404,{detail:'Not Found'}]);
  await assert.rejects(api.professionals(), e => e instanceof ApiError && e.status===404);
  assert.equal(events.length,0);
});
test('401 com sessão ativa limpa token e notifica expiração', async () => {
  reset(); replies.push([200,{access_token:'fake'}],[200,{id:1}],[401,{detail:'Expirado'}]);
  await api.login('teste@example.com','ficticia'); await assert.rejects(api.patients(),/Expirado/);
  assert.deepEqual(events,['reab:expired']); await api.patients(); assert.equal(calls.at(-1).headers.get('Authorization'),null);
});
test('falha ao consultar usuário após login não mantém token', async () => {
  reset(); replies.push([200,{access_token:'fake'}],[500,{detail:'Falha'}]);
  await assert.rejects(api.login('teste@example.com','ficticia'),/Falha/);
  await api.patients(); assert.equal(calls.at(-1).headers.get('Authorization'),null);
});
test('recuperação usa email, código e token de redefinição nas etapas corretas', async () => {
  reset(); await api.requestReset('teste@example.com'); await api.verifyReset('teste@example.com','123456'); await api.resetPassword('fake-reset-token','ficticia123');
  assert.deepEqual(calls.map(c => JSON.parse(c.body)),[{email:'teste@example.com'},{email:'teste@example.com',codigo:'123456'},{reset_token:'fake-reset-token',nova_senha:'ficticia123'}]);
  assert.ok(calls.every(c => c.method==='POST'));
});
test('erros de validação e conflito preservam mensagem útil', async () => {
  reset(); replies.push([422,{detail:[{loc:['body','email'],msg:'Inválido'}]}],[409,{detail:'Horário ocupado'}]);
  await assert.rejects(api.professionals(),/email: Inválido/);
  await assert.rejects(api.appointments(),e => e.status===409 && e.message==='Horário ocupado');
});
