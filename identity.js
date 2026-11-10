(function(root){
 'use strict';
 function phone(value){let s=String(value||'').replace(/\D/g,'');if(s.startsWith('0055')&&(s.length===14||s.length===15))s=s.slice(4);else if(s.startsWith('55')&&(s.length===12||s.length===13))s=s.slice(2);return s;}
 function validPhone(value){return /^[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(phone(value));}
 function validBirthDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const d=new Date(value+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===value&&value>='1900-01-01'&&value<=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});}
 function inferBirth(c){const text=[...(c.documents||[]).map(d=>d.text||''),...(c.history||[]).map(h=>h.body||'')].join('\n');const values=[...text.matchAll(/(?:data\s+de\s+nascimento|nascimento|nasc\.|nascid[oa](?:\s+em)?)\s*[:\-–]?\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/gi)].map(m=>`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);const dates=[...new Set(values)];return {birthDate:dates.length===1&&validBirthDate(dates[0])?dates[0]:'',birthConflict:dates.length>1,birthInvalid:dates.some(d=>!validBirthDate(d))};}
 function nameKey(value){return String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/’/g,"'");}
 function validFirstName(value){return /^[\p{L}][\p{L}'’-]+$/u.test(String(value||'').trim())&&!['nao','não','sem','desconhecido','desconhecida'].includes(nameKey(value));}
 function profile(c,manual={}){const raw=Object.hasOwn(manual,'phones')?manual.phones:(c.phones||[]);return {phones:[...new Set((Array.isArray(raw)?raw:[]).map(phone).filter(Boolean))],firstName:Object.hasOwn(manual,'firstName')?manual.firstName:String(c.name||'').trim().split(/\s+/)[0]};}
 function matches(candidates,people,input){const p=phone(input.phone),name=input.firstName;if(!validPhone(p)||!validFirstName(name))return [];return candidates.filter(c=>{const v=profile(c,people[c.id]);return validFirstName(v.firstName)&&nameKey(v.firstName)===nameKey(name)&&v.phones.includes(p);});}
 const api={phone,validPhone,validBirthDate,inferBirth,nameKey,validFirstName,profile,matches};if(typeof module==='object'&&module.exports)module.exports=api;else root.RHIdentity=api;
})(globalThis);
