const fs=require('fs'),path=require('path');
const dir=process.env.RH_DATA_DIR;
if(!dir||!fs.existsSync(dir)||!fs.statSync(dir).isDirectory())throw Error('O disco persistente RH_DATA_DIR não está disponível.');
const candidateFile=path.join(dir,'candidates.json'),authFile=path.join(dir,'auth.json');
if(!fs.existsSync(candidateFile)){
 if(process.env.RH_BOOTSTRAP_EMPTY!=='yes')throw Error('Banco de candidatos ausente no disco. Importe o arquivo privado antes de iniciar.');
 fs.copyFileSync(path.join(__dirname,'candidates.example.json'),candidateFile,fs.constants.COPYFILE_EXCL);
 console.log('Banco inicial vazio criado. Importe os candidatos privados antes de usar o sistema.');
}
if(!fs.existsSync(authFile))require('./provision-users.cjs');
require('./server.cjs');
