const http=require('http'),fs=require('fs'),crypto=require('crypto'),path=require('path'),net=require('net');
const identity=require('./identity.js');
const hr=require('./hr.cjs');
const gmail=require('./gmail-sync.cjs');
const root=__dirname, dataDir=process.env.RH_DATA_DIR||root, candidatesFile=process.env.RH_CANDIDATES_FILE||path.join(dataDir,'candidates.json');
let data=JSON.parse(fs.readFileSync(candidatesFile));
const stateFile=process.env.RH_STATE_FILE||path.join(dataDir,'state.json');
const authFile=process.env.RH_AUTH_FILE||path.join(dataDir,'auth.json');
const production=process.env.NODE_ENV==='production';
const origins=(process.env.RH_PUBLIC_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
if(process.env.RENDER_EXTERNAL_URL)origins.push(process.env.RENDER_EXTERNAL_URL);
if(production&&!origins.length)throw Error('Configure RH_PUBLIC_ORIGINS ou RENDER_EXTERNAL_URL.');
for(const origin of origins){const u=new URL(origin);if(u.origin!==origin||u.protocol!=='https:')throw Error('Origens públicas devem ser endereços HTTPS sem caminho.');}
if(!fs.existsSync(authFile))throw Error('Arquivo de usuários ausente. Execute provision-users.cjs uma vez com RH_BOOTSTRAP_PASSWORD configurada.');
const users=JSON.parse(fs.readFileSync(authFile,'utf8')).users;
let state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)):{people:{},jobs:[],companies:[],roles:data.roleOptions||[]};
const beforeMigration=JSON.stringify(state);hr.sync(state,data);if(JSON.stringify(state)!==beforeMigration){if(fs.existsSync(stateFile))fs.copyFileSync(stateFile,stateFile+'.before-companies.bak');fs.writeFileSync(stateFile,JSON.stringify(state,null,2));}
const attempts=new Map();
const clientIp=req=>production&&net.isIP(req.headers['cf-connecting-ip']||'')?req.headers['cf-connecting-ip']:(req.socket.remoteAddress||'local');
const loginAttempts=new Map(),sessions=new Map(),dummySalt=crypto.randomBytes(16);
const normalizeUser=value=>String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const passwordHash=(password,salt)=>crypto.scryptSync(password,salt,64,{N:32768,r:8,p:1,maxmem:67108864});
const sessionId=req=>(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('rh_session='))?.slice('rh_session='.length);
const getSession=req=>{const sid=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('rh_session='))?.slice('rh_session='.length),s=sid&&sessions.get(sid);if(!s)return null;if(s.expires<=Date.now()){sessions.delete(sid);return null;}return s;};
const stages=['Em seleção','Entrevistado','Aprovado','2ª fase','Última fase','Reprovado','Sem interesse','Contratado'];
let gmailUpdating=false;
function saveState(next){next._revision=(state._revision||0)+1;fs.writeFileSync(stateFile+'.tmp',JSON.stringify(next,null,2));fs.renameSync(stateFile+'.tmp',stateFile);state=next;}
function findShare(key){for(const job of state.jobs){const share=(job.shares||[]).find(s=>s.token===key&&!s.revokedAt);if(share)return {job,share};}return null;}
const server=http.createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');const url=new URL(req.url,'http://localhost');const send=(status,value,type='application/json')=>{res.writeHead(status,{'Content-Type':type+'; charset=utf-8'});res.end(type==='application/json'?JSON.stringify(value):value);};
try{
 const session=getSession(req),admin=!!session;
 if(url.pathname==='/oauth/gmail/callback'&&req.method==='GET'){
  try{await gmail.finish(url,server.address().port,sid=>{const s=sessions.get(sid);return !!s&&s.expires>Date.now();});return send(200,'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Gmail conectado</title><body><h1>Gmail conectado</h1><p>A conta foi conectada para leitura.</p><p><a href="/">Voltar ao painel</a></p></body></html>','text/html');}catch(e){return send(400,e.message,'text/plain');}
 }
 if(url.pathname==='/Login'||url.pathname==='/Login/')return send(200,fs.readFileSync(path.join(root,'login.html')),'text/html');
 if(url.pathname==='/login.js')return send(200,fs.readFileSync(path.join(root,'login.js')),'text/javascript');
 if(url.pathname==='/api/auth'&&req.method==='GET')return send(200,{authenticated:!!session,username:session?.username||''});
 if(req.method==='GET'&&await hr.handle({req,url,admin,state,data,save:saveState,send}))return;
 if(req.method==='GET'&&url.pathname==='/assets/gestao-rh-logo.jpeg'){res.writeHead(200,{'Content-Type':'image/jpeg'});return res.end(fs.readFileSync(path.join(root,'assets/gestao-rh-logo.jpeg')));}
 if(['/Consulta','/Consulta/'].includes(url.pathname)&&req.method==='GET')return send(200,fs.readFileSync(path.join(root,'consulta.html')),'text/html');
 if(req.method==='GET'&&/^\/Compartilhar\/[a-f0-9]{48}$/.test(url.pathname)){
  if(!findShare(url.pathname.split('/').at(-1)))return send(404,'Este link não está disponível ou foi desativado.','text/plain');
  return send(200,fs.readFileSync(path.join(root,'shared.html')),'text/html');
 }
 if(req.method==='GET'&&url.pathname.startsWith('/api/shared/')){
  const found=findShare(url.pathname.split('/').at(-1));if(!found)return send(404,{error:'Este link não está disponível ou foi desativado.'});
  const {job,share}=found;
  const candidates=job.members.filter(m=>share.stages.includes(m.stage)).flatMap(m=>{const c=data.candidates.find(c=>c.id===m.id);if(!c)return [];return [{name:c.name,city:c.city,phones:identity.profile(c,state.people[c.id]).phones,emails:c.emails||[],interview:{date:m.date||'',stage:m.stage,notes:m.notes||'',feedback:m.feedback||'',history:(m.history||[]).map(h=>({stage:h.stage,at:h.at}))}}];});
  return send(200,{role:job.role,company:job.company,closed:job.closed,stages:share.stages,candidates});
 }
 if(req.method==='POST'){
  const requestOrigin=req.headers.origin,allowed=production?origins.includes(requestOrigin)&&new URL(requestOrigin).host===req.headers.host:requestOrigin===`http://${req.headers.host}`;
  if(!allowed)return send(403,{error:'Origem inválida.'});
  let body='';for await(const part of req){body+=part;if(body.length>2000000)return send(413,{error:'Conteúdo muito grande.'});}const input=JSON.parse(body);
  if(url.pathname==='/api/login'){
   const ip=clientIp(req),now=Date.now(),recent=(loginAttempts.get(ip)||[]).filter(t=>now-t<5*60*1000);if(recent.length>=15)return send(429,{error:'Muitas tentativas. Aguarde alguns minutos e tente novamente.'});loginAttempts.set(ip,[...recent,now]);
   const password=typeof input.password==='string'?input.password:'';if(password.length>200)return send(401,{error:'Usuário ou senha incorretos.'});
   const username=normalizeUser(input.username),user=users.find(u=>u.key===username),salt=user?Buffer.from(user.salt,'hex'):dummySalt,expected=user?Buffer.from(user.hash,'hex'):passwordHash(password,salt),actual=passwordHash(password,salt),valid=actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
   if(!user||!valid)return send(401,{error:'Usuário ou senha incorretos.'});
   const sid=crypto.randomBytes(32).toString('hex');sessions.set(sid,{username:user.name,expires:now+8*60*60*1000});res.setHeader('Set-Cookie',`rh_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${production?'; Secure':''}`);return send(200,{ok:true,username:user.name});
  }
  if(url.pathname==='/api/logout'){
   const sid=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('rh_session='))?.slice('rh_session='.length);if(sid)sessions.delete(sid);res.setHeader('Set-Cookie','rh_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{ok:true});
  }
  if(await hr.handle({req,url,input,admin,state,data,save:saveState,send}))return;
  if(url.pathname==='/api/consulta'){
   const ip=clientIp(req),now=Date.now(),recent=(attempts.get(ip)||[]).filter(t=>now-t<60000);if(recent.length>=20)return send(429,{error:'Aguarde um minuto e tente novamente.'});attempts.set(ip,[...recent,now]);
   const matches=identity.matches(data.candidates,state.people,input);
   if(matches.length!==1)return send(400,{error:'Dados incorretos. Confira o telefone e o primeiro nome.'});
   const c=matches[0];
   const jobs=state.jobs.filter(j=>j.members.some(m=>m.id===c.id)).map(j=>{const m=j.members.find(m=>m.id===c.id);return {role:j.role,company:j.company,closed:j.closed,created:j.created,stage:m.stage,date:m.date||'',feedback:m.feedback||'',history:m.history||[]};}).sort((a,b)=>b.created.localeCompare(a.created));
   return send(200,{name:c.name,city:c.city,jobs});
  }
  if(!admin)return send(401,{error:'Acesso restrito.'});
  if(url.pathname==='/api/gmail/connect'){
   if(!production&&!/^localhost(?::\d+)?$/i.test(req.headers.host||''))return send(400,{error:'Abra o painel usando localhost para conectar o Gmail.'});
   try{return send(200,{url:gmail.connect(server.address().port,sessionId(req))});}catch(e){return send(400,{error:e.message});}
  }
  if(url.pathname==='/api/gmail/sync'){
   if(gmailUpdating)return send(409,{error:'Já existe uma atualização em andamento.'});
   gmailUpdating=true;try{const result=await gmail.update(data);const temp=candidatesFile+'.gmail-sync.tmp';fs.copyFileSync(candidatesFile,candidatesFile+'.before-sync.bak');fs.writeFileSync(temp,JSON.stringify(result.data));fs.renameSync(temp,candidatesFile);data=result.data;return send(200,result.summary);}catch(e){return send(400,{error:e.message||'Não foi possível atualizar os candidatos.'});}finally{gmailUpdating=false;}
  }
  if(url.pathname==='/api/jobs/delete'){
   const next=structuredClone(state),job=next.jobs.find(j=>j.id===input.jobId);
   if(!job)return send(404,{error:'Seleção não encontrada.'});
   if(job.closed)return send(409,{error:'Somente seleções em aberto podem ser excluídas.'});
   next.jobs=next.jobs.filter(j=>j.id!==job.id);
   next.deletedJobIds=[...new Set([...(next.deletedJobIds||[]),job.id])];
   for(const h of next.hires||[])if(h.jobId===job.id)h.jobId=null;
   for(const member of job.members||[]){const person=next.people[member.id];if(person&&['Em processo de seleção','Sem interesse nesta vaga'].includes(person.status)&&!next.jobs.some(j=>!j.closed&&j.members.some(m=>m.id===member.id)))delete person.status;}
   saveState(next);return send(200,{ok:true,state:next});
  }
  if(url.pathname==='/api/shares'){
   const next=structuredClone(state),job=next.jobs.find(j=>j.id===input.jobId);if(!job)return send(404,{error:'Vaga não encontrada.'});
   if(input.action==='revoke'){
    const share=(job.shares||[]).find(s=>s.token===input.token);if(!share)return send(404,{error:'Link não encontrado.'});share.revokedAt=new Date().toISOString();saveState(next);return send(200,{ok:true});
   }
   if(!Array.isArray(input.stages)||!input.stages.length||input.stages.some(s=>!stages.includes(s)))return send(400,{error:'Escolha pelo menos uma etapa válida.'});
   const share={token:crypto.randomBytes(24).toString('hex'),stages:[...new Set(input.stages)],createdAt:new Date().toISOString()};job.shares??=[];job.shares.push(share);saveState(next);
   return send(200,{share,path:'/Compartilhar/'+share.token});
  }
  if(url.pathname==='/api/state'){
   if((input._revision||0)!==(state._revision||0))return send(409,{error:'Os dados foram alterados por outra pessoa. Atualize a página e tente novamente.'});
   if(!input.people||!Array.isArray(input.jobs)||!Array.isArray(input.companies)||!Array.isArray(input.roles))return send(400,{error:'Dados inválidos.'});
   input.deletedJobIds=state.deletedJobIds||[];
   input.jobs=input.jobs.filter(j=>!input.deletedJobIds.includes(j.id));
   for(const p of Object.values(input.people)){
    if(!p||typeof p!=='object'||(Object.hasOwn(p,'firstName')&&(typeof p.firstName!=='string'||(p.firstName&&!identity.validFirstName(p.firstName)))))return send(400,{error:'Informe apenas um primeiro nome válido.'});
    if(Object.hasOwn(p,'firstName'))p.firstName=p.firstName.trim();
    if(Object.hasOwn(p,'phones')){if(!Array.isArray(p.phones)||p.phones.some(v=>typeof v!=='string'||!identity.validPhone(v)))return send(400,{error:'Informe telefones válidos com DDD.'});p.phones=[...new Set(p.phones.map(identity.phone))];}
   }
   for(const job of input.jobs)job.shares=state.jobs.find(j=>j.id===job.id)?.shares||[];
   for(const job of input.jobs)for(const m of job.members){if(m.admissionDate&&!hr.validDate(m.admissionDate))return send(400,{error:'Data de admissão inválida.'});}
   input.companyProfiles=structuredClone(state.companyProfiles);input.hires=structuredClone(state.hires);input.evaluations=structuredClone(state.evaluations);hr.sync(input,data);
   saveState(input);return send(200,{ok:true});
  }
 }
 if(!admin){res.writeHead(302,{Location:'/Login?next='+encodeURIComponent(url.pathname)});return res.end();}
 if(url.pathname==='/api/gmail/status')return send(200,{connected:gmail.connected(),lastUpdated:data.lastGmailSync||null,updating:gmailUpdating});
 if(url.pathname==='/Modelo-Avaliacao.pdf'){res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':'inline; filename="Avaliacao_Experiencia_Gestao_RH.pdf"'});return res.end(fs.readFileSync(path.join(root,'output/pdf/Avaliacao_Experiencia_Gestao_RH.pdf')));}
 if(url.pathname==='/api/state')return send(200,state);
 const files={'/':'admin.html','/Empresas':'admin.html','/Empresas/':'admin.html','/companies.js':'companies.js','/admin.js':'admin.js','/identity.js':'identity.js','/auth-ui.js':'auth-ui.js','/gmail-ui.js':'gmail-ui.js'};if(files[url.pathname]){let contents=fs.readFileSync(path.join(root,files[url.pathname]));if(files[url.pathname]==='admin.html'){const encoded=JSON.stringify(data).replace(/</g,'\\u003c');contents=contents.toString('utf8').replace(/(<script[^>]*id="embedded-data"[^>]*>)[\s\S]*?(<\/script>)/,(_,open,close)=>open+encoded+close).replace('</body>','<script src="/gmail-ui.js"></script></body>');}return send(200,contents,url.pathname.endsWith('.js')?'text/javascript':'text/html');}
 send(404,{error:'Página não encontrada.'});
}catch(e){console.error(e.message);send(500,{error:'Não foi possível concluir. Tente novamente.'});}});
server.listen(Number(process.env.PORT)||3210,production?'0.0.0.0':'127.0.0.1',()=>{if(production){console.log('Sistema iniciado na porta '+server.address().port);return;}const link=`http://localhost:${server.address().port}/Login`;fs.writeFileSync(process.env.RH_ACCESS_FILE||path.join(root,'access.txt'),link);if(!process.env.RH_ACCESS_FILE)require('./link-panel.cjs')(link);console.log('Login: '+link);console.log('Consulta pública: http://localhost:'+server.address().port+'/Consulta');});
