const fs=require('fs');
const image='data:image/jpeg;base64,'+fs.readFileSync('assets/gestao-rh-logo.jpeg').toString('base64');
const logo=`<img class="brand-logo" src="${image}" alt="Gestão RH Consultoria" width="632" height="485">`;
const css=fs.readFileSync('branding.css','utf8');
const palette={'#172e35':'#182b4b','#65767a':'#65758d','#126c62':'#204b8f','#dcf0e9':'#e4f2fa','#f5f6f3':'#f4f7fc','#dfe5e1':'#dce4ef','#153b3b':'#102957','#a9c5bf':'#abc5eb','#91b5ac':'#abc5eb','#ccdfd9':'#dae7fb','#e3f1eb':'#e4f2fa','#133e37':'#173f80','#aac5bd':'#abc5eb','#eef4ef':'#f0f6ff','#c9d6d0':'#cbd8eb','#c9e2dc':'#dceafe','#edf3ef':'#eaf2fc','#406252':'#294d7c','#eef4f4':'#edf2fb','#3c5d5e':'#294d7c','#edf1ed':'#e8eef8','#4a9583':'#008fc4','#edf4ef':'#edf6fc','#dce8de':'#d4e6f6','#406453':'#294d7c','#d5e9df':'#c8e7f6','#cbd8d1':'#cbd8eb','#d4ded8':'#d4deee','#f6f8f5':'#f5f8fd','#778780':'#72829a','#edf0eb':'#e8eef8','#fbfcfa':'#f8faff','#e7efea':'#e4f2fa','#326757':'#204b8f','#52665d':'#526581','#102c36a6':'#102957a6','#f6f7f4':'#f4f7fc','#f1f4ef':'#e8eff9','#557164':'#204b8f','#7c8b85':'#75839b','#dce3dd':'#dce4ef','#627369':'#62718b','#88968d':'#8290a7','#80918a':'#7c8ca5','#e2eee5':'#e3edfb','#b7cbc1':'#b9cbea','#b4bfb7':'#b4bfd3'};
const recolor=s=>s.replace(/#[a-f0-9]{6,8}\b/gi,c=>palette[c.toLowerCase()]||c);
for(const file of ['base.html','admin.html','consulta.html','shared.html']){
 let html=fs.readFileSync(file,'utf8');
 html=html.replace(/<style id="brand-theme">[\s\S]*?<\/style>/g,'');
 if(file==='admin.html'||file==='base.html')html=html.replace(/<div class="brand">[\s\S]*?<\/div><div class="nav-label">/,`<div class="brand">${logo}</div><div class="nav-label">`);
 else html=html.replace(/<span class="brand">GESTÃO RH CONSULTORIA<\/span>|<div class="public-brand">[\s\S]*?<\/div>/,`<div class="public-brand">${logo}</div>`);
 html=html.replace(/<style[^>]*>[\s\S]*?<\/style>/g,recolor).replace(/style="[^"]*"/g,recolor);
 const theme=`<style id="brand-theme">${css}</style>`;
 // The original consultation document omits an explicit head closing tag.
 html=html.includes('</head>')?html.replace('</head>',theme+'</head>'):html.replace('<main>',theme+'<main>');
 fs.writeFileSync(file,html);
}
fs.writeFileSync('admin.js',recolor(fs.readFileSync('admin.js','utf8')));
