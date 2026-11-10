const fs=require('fs'),path=require('path');
module.exports=function linkPanel(url){
 for(const file of ['base.html','admin.html']){
  const target=path.join(__dirname,file);let html=fs.readFileSync(target,'utf8');
  html=html.replace(/<script id="local-panel-entry">[\s\S]*?<\/script>/g,'');
  html=html.replace(/<script id="auth-ui-entry"[^>]*><\/script>/g,'');
  if(file==='admin.html')html=html.replace('<span class="private">Uso interno · dados de candidatos</span>','<div class="actions" style="align-items:center"><span class="private">Uso interno · <span id="sessionName"></span></span><button type="button" id="logoutButton" class="button" hidden>Sair</button></div>');
  const script='<script id="local-panel-entry">if(location.protocol==="file:"){location.replace('+JSON.stringify(url)+');}</script>';
  html=html.replace('<head>','<head>'+script);
  if(file==='admin.html')html=html.replace('</body>','<script id="auth-ui-entry" src="/auth-ui.js"></script></body>');
  fs.writeFileSync(target,html);
 }
};
if(require.main===module)module.exports(fs.readFileSync(path.join(__dirname,'access.txt'),'utf8').trim());
