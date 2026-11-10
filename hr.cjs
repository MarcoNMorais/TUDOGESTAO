const crypto=require('crypto'),fs=require('fs'),path=require('path');
const schema=require('./evaluation-schema.json');
const key=s=>String(s||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const clean=(s,max=4000)=>String(s||'').trim().slice(0,max);
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!isNaN(new Date(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
function due(date,days){if(!validDate(date))return '';const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function event(type,text){return {id:crypto.randomUUID(),at:new Date().toISOString(),type,text};}
function sync(state,data){
 state.companyProfiles??=[];state.hires??=[];state.evaluations??=[];
 for(const name of [...state.companies,...state.jobs.map(j=>j.company)].filter(Boolean)){
  if(!state.companyProfiles.some(c=>key(c.name)===key(name)))state.companyProfiles.push({id:crypto.randomUUID(),name:clean(name,200),responsible:'',phone:'',email:'',cnpj:'',address:'',notes:'',history:[event('created','Empresa cadastrada')]});
 }
 state.companies=state.companyProfiles.map(c=>c.name);
 for(const j of state.jobs){const co=state.companyProfiles.find(c=>key(c.name)===key(j.company));if(!co)continue;j.companyId=co.id;
  for(const m of j.members.filter(m=>m.stage==='Contratado')){
   let h=state.hires.find(h=>h.jobId===j.id&&h.candidateId===m.id);
   if(!h){const c=data.candidates.find(c=>c.id===m.id);if(!c)continue;h={id:crypto.randomUUID(),companyId:co.id,candidateId:c.id,name:c.name,phone:(c.phones||[])[0]||'',role:j.role,jobId:j.id,admissionDate:m.admissionDate||'',unit:'',sector:'',education:'',course:'',createdAt:new Date().toISOString(),history:[event('hired','Contratado pela seleção: '+j.role)]};state.hires.push(h);co.history.push(event('hired',c.name+' contratado(a) para '+j.role));}
   if(m.admissionDate&&!h.admissionDate)h.admissionDate=m.admissionDate;
  }
 }
 return state;
}
module.exports={sync,due,validDate,schema,async handle({req,url,input,admin,state,data,save,send}){
 const pathname=url.pathname;
 if(req.method==='GET'&&/^\/Avaliacao\/[a-f0-9]{48}$/.test(pathname)){
  const e=state.evaluations.find(e=>e.token===pathname.split('/').at(-1)&&!e.revokedAt);if(!e)send(404,'Link indisponível ou desativado.','text/plain');else send(200,fs.readFileSync(path.join(__dirname,'evaluation.html')),'text/html');return true;
 }
 if(pathname.startsWith('/api/evaluation/')){
  const token=pathname.split('/').at(-1),e=state.evaluations.find(e=>e.token===token&&!e.revokedAt);if(!e){send(404,{error:'Link indisponível ou desativado.'});return true;}
  if(req.method==='GET'){send(200,{period:e.period,dueDate:e.dueDate,snapshot:e.snapshot,schema:e.schema,submittedAt:e.submittedAt||null});return true;}
  if(req.method==='POST'){
   if(e.submittedAt){send(409,{error:'Esta avaliação já foi enviada e está registrada.'});return true;}
   if(!input||!input.ratings||e.schema.questions.some(q=>!Number.isInteger(input.ratings[q.id])||input.ratings[q.id]<1||input.ratings[q.id]>4)){send(400,{error:'Responda todos os 12 critérios com uma nota de 1 a 4.'});return true;}
   if(!clean(input.manager,200)||input.confirmed!==true){send(400,{error:'Informe o nome do avaliador e confirme o envio.'});return true;}
   if(!e.schema.trainingTypes.includes(input.trainingType)||!Array.isArray(input.trainingModes)||input.trainingModes.some(v=>!e.schema.trainingModes.includes(v))||!e.schema.recommendations.includes(input.recommendation)){send(400,{error:'Confira o treinamento e o parecer final.'});return true;}
   const next=structuredClone(state),record=next.evaluations.find(x=>x.id===e.id);record.response={manager:clean(input.manager,200),managerRole:clean(input.managerRole,200),ratings:Object.fromEntries(e.schema.questions.map(q=>[q.id,input.ratings[q.id]])),knowledge:clean(input.knowledge),skills:clean(input.skills),trainingType:input.trainingType,trainingModes:input.trainingModes,trainingDetails:clean(input.trainingDetails),recommendation:input.recommendation,comments:clean(input.comments),confirmed:true};record.submittedAt=new Date().toISOString();
   const h=next.hires.find(h=>h.id===e.hireId),co=next.companyProfiles.find(c=>c.id===h.companyId);h.history.push(event('evaluation','Avaliação de '+e.period+' dias respondida por '+record.response.manager));co.history.push(event('evaluation',h.name+': avaliação de '+e.period+' dias respondida'));save(next);send(200,{ok:true,submittedAt:record.submittedAt});return true;
  }return false;
 }
 if(!['/api/hr','/api/company','/api/hire','/api/evaluation-link'].includes(pathname))return false;
 if(!admin){send(401,{error:'Acesso restrito.'});return true;}
 if(pathname==='/api/hr'&&req.method==='GET'){send(200,{companies:state.companyProfiles,hires:state.hires.map(h=>({...h,due45:due(h.admissionDate,45),due90:due(h.admissionDate,90)})),evaluations:state.evaluations,schema});return true;}
 if(req.method!=='POST')return false;
 const next=structuredClone(state);
 if(pathname==='/api/company'){
  const name=clean(input.name,200);if(!name){send(400,{error:'Informe o nome da empresa.'});return true;}
  let co=next.companyProfiles.find(c=>c.id===input.id);if(input.id&&!co){send(404,{error:'Empresa não encontrada.'});return true;}
  if(next.companyProfiles.some(c=>c.id!==co?.id&&key(c.name)===key(name))){send(409,{error:'Esta empresa já está cadastrada.'});return true;}
  const fields=Object.fromEntries(['responsible','phone','email','cnpj','address','notes'].map(k=>[k,clean(input[k],k==='notes'?4000:300)]));
  if(!co){co={id:crypto.randomUUID(),name,...fields,history:[event('created','Empresa cadastrada')]};next.companyProfiles.push(co);}else{for(const j of next.jobs)if(j.companyId===co.id||key(j.company)===key(co.name))j.company=name;Object.assign(co,{name,...fields});co.history.push(event('updated','Informações da empresa atualizadas'));}
  next.companies=next.companyProfiles.map(c=>c.name);save(next);send(200,{company:co});return true;
 }
 if(pathname==='/api/hire'){
  const co=next.companyProfiles.find(c=>c.id===input.companyId);let h=next.hires.find(h=>h.id===input.id);if(!co||input.id&&!h){send(404,{error:'Empresa ou contratado não encontrado.'});return true;}
  if(!validDate(input.admissionDate)){send(400,{error:'Informe uma data de admissão válida.'});return true;}
  const c=data.candidates.find(c=>c.id===input.candidateId),name=c?.name||clean(input.name,200),role=clean(input.role,200);if(!name||!role){send(400,{error:'Informe o funcionário e a função.'});return true;}
  if(!h&&c&&next.hires.some(h=>h.companyId===co.id&&h.candidateId===c.id&&h.admissionDate===input.admissionDate)){send(409,{error:'Este contratado já está cadastrado nesta empresa e admissão.'});return true;}
  const fields={role,admissionDate:input.admissionDate,phone:clean(input.phone,100),unit:clean(input.unit,200),sector:clean(input.sector,200),education:clean(input.education,200),course:clean(input.course,200)};
  if(h){if(h.companyId!==co.id){send(400,{error:'Edite o contratado na empresa de origem.'});return true;}if(h.admissionDate!==fields.admissionDate){for(const e of next.evaluations.filter(e=>e.hireId===h.id&&!e.submittedAt&&!e.revokedAt))e.revokedAt=new Date().toISOString();}Object.assign(h,fields);const j=next.jobs.find(j=>j.id===h.jobId),m=j?.members.find(m=>m.id===h.candidateId);if(m)m.admissionDate=h.admissionDate;h.history.push(event('updated','Cadastro do contratado atualizado'));co.history.push(event('updated','Dados de '+h.name+' atualizados'));}
  else{h={id:crypto.randomUUID(),candidateId:c?.id||'manual-'+crypto.randomUUID(),companyId:co.id,name,...fields,createdAt:new Date().toISOString(),history:[event('hired','Contratação adicionada manualmente')]};next.hires.push(h);co.history.push(event('hired',name+' adicionado(a) como contratado(a)'));}
  save(next);send(200,{hire:h});return true;
 }
 if(pathname==='/api/evaluation-link'){
  const h=next.hires.find(h=>h.id===input.hireId),period=Number(input.period);if(!h||![45,90].includes(period)){send(400,{error:'Selecione o contratado e o período de 45 ou 90 dias.'});return true;}
  if(!validDate(h.admissionDate)){send(400,{error:'Cadastre a data de admissão antes de gerar o link.'});return true;}
  const co=next.companyProfiles.find(c=>c.id===h.companyId);
  const e={id:crypto.randomUUID(),hireId:h.id,companyId:co.id,candidateId:h.candidateId,token:crypto.randomBytes(24).toString('hex'),period,dueDate:due(h.admissionDate,period),createdAt:new Date().toISOString(),snapshot:{name:h.name,company:co.name,role:h.role,admissionDate:h.admissionDate,unit:h.unit,sector:h.sector,education:h.education,course:h.course},schema:structuredClone(schema)};
  next.evaluations.push(e);h.history.push(event('link','Novo link de avaliação de '+period+' dias gerado'));co.history.push(event('link','Novo link de '+period+' dias gerado para '+h.name));save(next);
  send(200,{evaluation:e,path:'/Avaliacao/'+e.token});return true;
 }
 return false;
}};
