import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync, verify, createHash } from 'node:crypto';
import { onRequest } from '../functions/api/feedback.ts';
import { onRequest as templateEndpoint } from '../functions/api/feedback-templates.ts';
import { onRequest as getImage } from '../functions/api/feedback-images/[key].ts';
import { feedbackSchema, formatIssue, targets } from '../shared/feedback.ts';
import { initialAnswers, validateAnswers } from '../shared/feedback-templates.ts';
import { loadFeedbackTemplates, parseTemplate } from '../shared/load-feedback-templates.ts';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const env = { GITHUB_APP_ID: '123', GITHUB_APP_INSTALLATION_ID: '456', GITHUB_APP_PRIVATE_KEY: privateKey.export({ type: 'pkcs1', format: 'pem' }), TURNSTILE_SITE_KEY: 'test-only-sitekey', TURNSTILE_SECRET: 'test-only-secret', FEEDBACK_ORIGIN: 'https://msime.app' };
const sources = Object.fromEntries(['windows','linux','common'].map(name => [name, readFileSync(new URL(`fixtures/feedback/${name}.yml`, import.meta.url),'utf8')]));
const sha = source => createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0${source}`).digest('hex');
// 除 Windows 外的平台共用 msime 仓库，所以模板按仓库而不是按 target 取
const fixtureOf = target => ({ 'MSIME-Windows': 'windows', msime: 'linux' })[targets[target]?.repo];
function templateFor(target = 'windows', source = sources[fixtureOf(target)] ?? sources.common) {
  const repo = fixtureOf(target) ? targets[target].repo : '.github';
  return parseTemplate(source, { id: `${repo}/feature_request.yml`, revision: sha(source), sourceUrl: `https://github.com/metasequoiaime/${repo}/blob/HEAD/.github/ISSUE_TEMPLATE/feature_request.yml` });
}
function validForm(target = 'windows', template = templateFor(target)) {
  const answers = initialAnswers(template);
  for (const field of template.fields) {
    if (field.type === 'input' || field.type === 'textarea') answers[field.id] = '用于验证动态表单的虚构测试内容。';
    if (field.type === 'dropdown') answers[field.id] = [field.options[0].label];
    if (field.type === 'checkboxes') answers[field.id] = field.options.map(option => option.label);
  }
  return { target, title: `${template.title}增加候选窗口字号设置`, templateId: template.id, templateRevision: template.revision, answers, screenshotFields: [], consent: true, token: 'test-token' };
}
const form = validForm();
const request = (data = form, headers = {}) => new Request('https://msime.app/api/feedback', { method: 'POST', headers: { Origin: env.FEEDBACK_ORIGIN, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) });
function mockFetch(t, { verification = { success: true, action: 'feedback', hostname: 'msime.app' }, issue = () => Response.json({ number: 42 }, { status: 201 }), sourceOverride, templateStatus, templateRepos = ['MSIME-Windows','msime','.github'] } = {}) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    if (url.includes('siteverify')) return Response.json(verification);
    if (url.includes('/access_tokens')) return Response.json({ token: 'test-only-token' });
    if (url.includes('/contents/')) {
      if (templateStatus) return new Response(null,{status:templateStatus});
      const repo = url.split('/')[5];
      if (!templateRepos.includes(repo)) return new Response(null,{status:404});
      const source = sourceOverride ?? (repo === 'MSIME-Windows' ? sources.windows : repo === 'msime' ? sources.linux : sources.common);
      return Response.json([{name:'feature_request.yml',path:'.github/ISSUE_TEMPLATE/feature_request.yml',sha:sha(source),type:'file'}]);
    }
    if (url.includes('/git/blobs/')) {
      const source = sourceOverride ?? Object.values(sources).find(source => sha(source) === url.split('/').at(-1));
      return Response.json({encoding:'base64',content:Buffer.from(source).toString('base64'),size:Buffer.byteLength(source)});
    }
    return issue();
  });
  return calls;
}
const writes = calls => calls.filter(call => call.url.endsWith('/issues'));

test('all targets read their templates, validate answers and create issues using restricted App credentials', async t => {
  const calls = mockFetch(t);
  for (const [target,{repo}] of Object.entries(targets)) {
    const data = validForm(target);
    const response = await onRequest({request:request({...data,repo:'attacker/repo',labels:['injected']}),env});
    assert.equal(response.status,201);
    assert.equal((await response.json()).url,`https://github.com/metasequoiaime/${repo}/issues/42`);
    const call = writes(calls).at(-1);
    assert.deepEqual(JSON.parse(call.options.body),formatIssue(feedbackSchema.parse(data),templateFor(target)));
    const auth = calls.findLast(call=>call.url.includes('/access_tokens'));
    assert.deepEqual(JSON.parse(auth.options.body),{repositories:[repo],permissions:{issues:'write'}});
    const [header,claims,signature] = auth.options.headers.Authorization.slice(7).split('.');
    assert.deepEqual(JSON.parse(Buffer.from(header,'base64url')),{alg:'RS256',typ:'JWT'});
    assert.ok(verify('RSA-SHA256',Buffer.from(`${header}.${claims}`),publicKey,Buffer.from(signature,'base64url')));
    assert.equal(JSON.parse(Buffer.from(claims,'base64url')).iss,env.GITHUB_APP_ID);
  }
});

test('schema, origin, content type and body limits reject invalid requests before external calls', async t => {
  const calls = mockFetch(t);
  for (const change of [{target:'__proto__'},{consent:false},{title:'     '},{title:'hello\nworld'},{templateRevision:'bad'},{answers:{problem:'x'.repeat(6001)}},{token:''},{email:'bad'},{github:'@user'},{email:'a@b.co\nx'}]) assert.equal((await onRequest({request:request({...form,...change}),env})).status,400);
  assert.equal((await onRequest({request:request(form,{'Content-Type':'text/plain'}),env})).status,415);
  assert.equal((await onRequest({request:request(form,{Origin:'https://evil.example'}),env})).status,403);
  assert.equal((await onRequest({request:request({...form,oversized:'字'.repeat(64_000)}),env})).status,400);
  assert.equal(calls.length,0);
});

test('template-required fields, options and checkboxes are authoritative on the server', async t => {
  const calls = mockFetch(t);
  for (const answers of [{...form.answers,problem:'  '},{...form.answers,component:['injected']},{...form.answers,checklist:[]},{...form.answers,unknown:'injected'},{...form.answers,component:'wrong shape'}]) assert.equal((await onRequest({request:request({...form,answers}),env})).status,400);
  assert.equal(writes(calls).length,0);
});

test('template changes return 409 and the new definition before any upload or Issue write', async t => {
  const updated = sources.windows.replace('问题与动机 / Problem & Motivation','新的问题描述');
  const calls = mockFetch(t,{sourceOverride:updated});
  const response = await onRequest({request:request(),env});
  assert.equal(response.status,409);
  const data = await response.json();
  assert.equal(data.templateChanged,true);
  assert.equal(data.templates[0].revision,sha(updated));
  assert.ok(data.templates[0].fields.some(field=>field.label==='新的问题描述'));
  assert.equal(writes(calls).length,0);
});

test('config only exposes public settings and disables preview deployments', async () => {
  const get = new Request('https://msime.app/api/feedback');
  assert.deepEqual(await (await onRequest({request:get,env})).json(),{siteKey:env.TURNSTILE_SITE_KEY,screenshotsEnabled:false});
  assert.equal((await onRequest({request:get,env:{}})).status,503);
  assert.equal((await onRequest({request:new Request('https://preview.pages.dev/api/feedback'),env})).status,403);
  assert.equal((await onRequest({request:new Request(get,{method:'DELETE'}),env})).status,405);
});

test('failed or mismatched Turnstile challenges stop before template fetch, storage and Issue writes', async t => {
  for (const verification of [{success:false},{success:true,action:'login',hostname:'msime.app'},{success:true,action:'feedback',hostname:'localhost'}]) await t.test(JSON.stringify(verification),async t=>{
    const calls=mockFetch(t,{verification});
    assert.equal((await onRequest({request:request(),env})).status,403);
    assert.equal(calls.length,1);
  });
});

test('template service failures and App auth failures do not create issues or leak credentials', async t => {
  const calls=mockFetch(t,{templateStatus:503});
  assert.equal((await onRequest({request:request(),env})).status,503);
  assert.equal(writes(calls).length,0);
  t.mock.restoreAll();
  mockFetch(t);
  const result=await onRequest({request:request(),env:{...env,GITHUB_APP_PRIVATE_KEY:'invalid'}});
  assert.equal(result.status,503);
  assert.ok(!(await result.text()).includes('PRIVATE KEY'));
});

test('Markdown, contacts and labels follow the template without active user mentions', () => {
  const data=feedbackSchema.parse({...form,answers:{...form.answers,proposal:'**说明**\n\n- @team'},github:'octo-cat',email:'example@example.com'});
  const issue=formatIssue(data,templateFor());
  assert.ok(issue.body.includes('**说明**\n\n- @\u200bteam'));
  assert.ok(issue.body.includes('| GitHub 用户名 | ` octo-cat ` |'));
  assert.ok(issue.body.includes('` example@example.com `'));
  assert.deepEqual(issue.labels,['enhancement']);
  assert.equal(issue.type,'Feature');
  assert.ok(!issue.body.includes('感谢建议！'));
});

test('issues state the platform first and label targets that share the multi-platform repo', () => {
  for (const [target, { label, issueLabel }] of Object.entries(targets)) {
    const template = templateFor(target);
    const issue = formatIssue(feedbackSchema.parse(validForm(target)), template);
    assert.ok(issue.body.startsWith(`### 平台\n\n${label}\n\n### `));
    assert.deepEqual(issue.labels, issueLabel ? [...template.labels, issueLabel] : template.labels);
  }
  const android = templateFor('android');
  assert.deepEqual(formatIssue(feedbackSchema.parse(validForm('android', android)), { ...android, labels: ['enhancement', 'platform/android'] }).labels, ['enhancement', 'platform/android']);
});

test('the form title is entered without the template prefix and the issue title gets it back once', () => {
  const template=templateFor();
  assert.equal(formatIssue(feedbackSchema.parse({...form,title:'增加候选窗口字号设置'}),template).title,'[Feat] 增加候选窗口字号设置');
  assert.equal(formatIssue(feedbackSchema.parse({...form,title:'[Feat] 增加候选窗口字号设置'}),template).title,'[Feat] 增加候选窗口字号设置');
  assert.equal(formatIssue({...form,title:''},template).title,'');
});

const png = new Uint8Array([137,80,78,71,13,10,26,10]);
const multipart = (files=[new File([png],'private.png',{type:'image/png'})],data=form) => {
  const body=new FormData();
  body.set('payload',JSON.stringify({...data,screenshotFields:data.screenshotFields.length ? data.screenshotFields : files.map(()=>'')}));
  for (const file of files) body.append('screenshots',file);
  return new Request('https://msime.app/api/feedback',{method:'POST',headers:{Origin:env.FEEDBACK_ORIGIN},body});
};
function bucketMock() {
  const objects=new Map();
  return {objects,async put(key,bytes,options){objects.set(key,{bytes,...options});},async get(key){const object=objects.get(key);return object?{body:new Blob([object.bytes]).stream()}:null;},async delete(keys){for(const key of keys) objects.delete(key);}};
}
test('screenshots attach to the selected template field and are served as images', async t => {
  const calls=mockFetch(t),bucket=bucketMock(),imageEnv={...env,FEEDBACK_SCREENSHOTS:bucket};
  assert.equal((await onRequest({request:multipart(undefined,{...form,screenshotFields:['additional']}),env:imageEnv})).status,201);
  const key=[...bucket.objects.keys()][0];
  const issue=JSON.parse(writes(calls)[0].options.body);
  assert.match(issue.body,/### 其他信息 \/ Additional Context\n\n[\s\S]*!\[截图 1\]/);
  assert.ok(issue.body.includes(`https://msime.app/api/feedback-images/${key.slice(9)}`));
  assert.ok(!issue.body.includes('private.png'));
  const response=await getImage({request:new Request(`https://msime.app/api/feedback-images/${key.slice(9)}`),env:imageEnv,params:{key:key.slice(9)}});
  assert.equal(response.headers.get('Content-Type'),'image/png');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),png);
  assert.equal((await getImage({request:new Request('https://msime.app/api/feedback-images/x'),env:imageEnv,params:{key:'../secret'}})).status,404);
});

test('invalid file type, signature, size and count are rejected before verification', async t => {
  const calls=mockFetch(t),bucket=bucketMock();
  for(const files of [Array.from({length:4},()=>new File([png],'a.png',{type:'image/png'})),[new File(['<svg/>'],'a.svg',{type:'image/svg+xml'})],[new File(['html'],'a.png',{type:'image/png'})],[new File([], 'a.png',{type:'image/png'})],[new File([new Uint8Array(5*1024*1024+1)],'a.png',{type:'image/png'})]]) assert.equal((await onRequest({request:multipart(files),env:{...env,FEEDBACK_SCREENSHOTS:bucket}})).status,400);
  assert.equal(calls.length,0);
  assert.equal((await onRequest({request:multipart(),env})).status,503);
});

test('failed storage or explicit rejection cleans up; ambiguous Issue writes retain images and are not retried', async t => {
  for(const status of [422,500]) await t.test(String(status),async t=>{
    const calls=mockFetch(t,{issue:()=>new Response(null,{status})}),bucket=bucketMock();
    const response=await onRequest({request:multipart(),env:{...env,FEEDBACK_SCREENSHOTS:bucket}});
    assert.equal(response.status,502);
    assert.equal(bucket.objects.size,status===500?1:0);
    assert.equal(writes(calls).length,1);
    assert.equal((await response.json()).uncertain,status===500?true:undefined);
  });
  await t.test('storage failure',async t=>{
    const calls=mockFetch(t),bucket=bucketMock();
    bucket.put=async key=>{bucket.objects.set(key,{});throw new Error('failed');};
    assert.equal((await onRequest({request:multipart(),env:{...env,FEEDBACK_SCREENSHOTS:bucket}})).status,503);
    assert.equal(bucket.objects.size,0);
    assert.equal(writes(calls).length,0);
  });
});

test('template endpoint inherits only on directory 404, rejects arbitrary targets and returns no credentials', async t => {
  const calls=mockFetch(t,{templateRepos:['.github']});
  const response=await templateEndpoint({request:new Request('https://msime.app/api/feedback-templates?target=linux')});
  assert.equal(response.status,200);
  assert.equal((await response.json()).templates[0].id,'.github/feature_request.yml');
  assert.ok(calls.some(call=>call.url.includes('/msime/contents/')));
  assert.ok(calls.some(call=>call.url.includes('/.github/contents/')));
  assert.equal((await templateEndpoint({request:new Request('https://msime.app/api/feedback-templates?target=evil')})).status,400);
  t.mock.restoreAll();
  const failed=mockFetch(t,{templateStatus:403});
  await assert.rejects(loadFeedbackTemplates('linux'));
  assert.equal(failed.length,1);
});

test('generic templates support defaults, optional fields, code fences and required screenshot uploads', () => {
  const source=`name: Custom\ntitle: '[Custom] '\nlabels: custom, enhancement\nbody:\n  - type: dropdown\n    id: platform\n    attributes:\n      label: Platform\n      options: [one, two]\n      default: 1\n  - type: textarea\n    id: logs\n    attributes:\n      label: Logs\n      render: shell\n  - type: upload\n    id: image\n    attributes:\n      label: Screenshot\n    validations:\n      required: true\n      accept: .png\n`;
  const template=templateFor('windows',source),answers=initialAnswers(template);
  assert.deepEqual(answers.platform,['two']);
  assert.match(validateAnswers(template,answers),/Screenshot/);
  assert.equal(validateAnswers(template,answers,['image']),undefined);
  answers.logs='```\n@team';
  const issue=formatIssue({...form,answers},template,[{field:'image',url:'https://msime.app/image.png'}]);
  assert.ok(issue.body.includes('````shell\n```\n@\u200bteam\n````'));
  assert.ok(issue.body.includes('### Screenshot\n\n![截图 1](https://msime.app/image.png)'));
  assert.deepEqual(issue.labels,['custom','enhancement']);
  assert.throws(()=>templateFor('windows','name: bad\nbody: []'));
  assert.throws(()=>templateFor('windows',sources.windows.replace('type: textarea','type: unknown')));
});


test('feedback responses reject HTML and malformed JSON without exposing parser errors', async () => {
  const { readFeedbackResponse, FeedbackResponseError } = await import('../src/feedback-response.ts');
  const message = '模板服务暂不可用，请重新加载。';
  for (const [body, type, status] of [
    ['<!DOCTYPE html><html>Preview</html>', 'text/html', 200],
    ['<html>Unavailable</html>', 'text/html', 503],
    ['{', 'application/json', 200],
    ['null', 'application/json', 200],
    ['[]', 'application/json', 200],
  ]) {
    await assert.rejects(readFeedbackResponse(new Response(body, { status, headers: { 'content-type': type } }), message), error => error instanceof FeedbackResponseError && error.message === message);
  }
  const response = new Response(JSON.stringify({ error: '稍后重试' }), { status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } });
  assert.deepEqual(await readFeedbackResponse(response, message), { error: '稍后重试' });
});


test('Traditional form keeps raw options and user input while localizing issue headings', async () => {
  const { loadTraditional } = await import('../shared/translate.ts');
  await loadTraditional();
  const template = templateFor();
  const data = feedbackSchema.parse({ ...validForm(), locale: 'zh-TW' });
  const field = template.fields.find(field => field.type === 'textarea');
  data.answers[field.id] = '用户原文：简体不应被改写，https://example.com/简体';
  assert.equal(validateAnswers(template, data.answers), undefined);
  const issue = formatIssue(data, template);
  assert.ok(issue.body.includes(data.answers[field.id]));
  assert.ok(issue.body.includes('https://msime.app/zh-TW/feedback/'));
  assert.equal(issue.title, data.title);
  assert.deepEqual(issue.labels, template.labels);
  assert.match(issue.body, /維護者評估/);
  assert.equal(feedbackSchema.safeParse({ ...data, locale: 'xx' }).success, false);
});


test('Traditional POST produces the same localized body as the preview', async t => {
  const calls = mockFetch(t);
  const data = { ...validForm(), locale: 'zh-TW' };
  const response = await onRequest({ request: request(data), env });
  assert.equal(response.status, 201);
  assert.deepEqual(JSON.parse(writes(calls)[0].options.body), formatIssue(feedbackSchema.parse(data), templateFor()));
  assert.match(JSON.parse(writes(calls)[0].options.body).body, /維護者評估/);
});
