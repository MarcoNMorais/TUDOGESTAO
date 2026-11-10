const fs=require('fs'),crypto=require('crypto'),path=require('path');
const file=process.env.RH_AUTH_FILE||path.join(__dirname,'auth.json');
if(fs.existsSync(file))throw Error('Usuários já configurados. O arquivo existente foi mantido.');
const password=process.env.RH_BOOTSTRAP_PASSWORD;
if(typeof password!=='string'||password.length<12)throw Error('Defina RH_BOOTSTRAP_PASSWORD com uma senha de pelo menos 12 caracteres.');
const users=['Marco','Marilia','Tahilla','Artur'].map(name=>{const salt=crypto.randomBytes(16),hash=crypto.scryptSync(password,salt,64,{N:32768,r:8,p:1,maxmem:67108864});return {name,key:name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),salt:salt.toString('hex'),hash:hash.toString('hex')};});
fs.writeFileSync(file,JSON.stringify({version:1,users},null,2),{flag:'wx',mode:0o600});console.log('Quatro usuários foram configurados. As senhas foram armazenadas como hashes com salts individuais.');
