/* Shared deterministic data operations; no credentials or personal data. */
(function(root){
'use strict';
const groups=['tasks','chats','projects','reminders','modules'];
const clone=x=>JSON.parse(JSON.stringify(x));
const empty=()=>Object.fromEntries(groups.map(k=>[k,[]]));
function safeUrl(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function validate(input,partial=false){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('JSON-Objekt erwartet');
 const source=input.data&&typeof input.data==='object'?input.data:input;
 const out=empty();
 for(const k of groups){
  if(source[k]===undefined&&partial)continue;
  if(!Array.isArray(source[k]))throw Error('Kategorie fehlt: '+k);
  if(source[k].length>10000)throw Error('Zu viele Einträge: '+k);
  const seen=new Set();
  out[k]=source[k].map((x,i)=>{
   if(!x||typeof x!=='object'||typeof x.title!=='string')throw Error('Ungültiger Eintrag: '+k);
   const v=clone(x);v.id=String(v.id||k+'-'+i);if(seen.has(v.id))throw Error('Doppelte Kennung in '+k);seen.add(v.id);
   v.title=String(v.title);v.detail=String(v.detail||'');v.status=String(v.status||'');v.url=safeUrl(v.url);
   v.priority=[0,1,2].includes(Number(v.priority))?Number(v.priority):0;
   return v;
  });
 }
 if(source._meta&&typeof source._meta==='object')out._meta=clone(source._meta);
 if(new TextEncoder().encode(JSON.stringify(out)).length>900000)throw Error('Datenbestand zu groß. Bitte Chats ohne Volltext importieren.');
 return out;
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Three-way merge: deletions propagate; concurrent edits retain both versions.
function merge(base,local,remote){
 const out=empty();let conflicts=0;
 for(const k of groups){
  const b=new Map((base[k]||[]).map(x=>[x.id,x])),l=new Map((local[k]||[]).map(x=>[x.id,x])),r=new Map((remote[k]||[]).map(x=>[x.id,x]));
  for(const id of new Set([...l.keys(),...r.keys(),...b.keys()])){
   const bv=b.get(id),lv=l.get(id),rv=r.get(id);
   if(same(lv,rv)){if(lv)out[k].push(clone(lv));continue}
   if(same(lv,bv)){if(rv)out[k].push(clone(rv));continue}
   if(same(rv,bv)){if(lv)out[k].push(clone(lv));continue}
   conflicts++;
   if(lv)out[k].push(clone(lv));
   if(rv){const copy=clone(rv);copy.id=id+'-conflict-'+conflicts;copy.title+=' (andere Fassung)';out[k].push(copy)}
  }
 }
 out._meta={...(remote._meta||{}),...(local._meta||{})};return {data:out,conflicts};
}
function mergeImport(current,incoming){const out=clone(current);for(const k of groups){const m=new Map((out[k]||[]).map(x=>[x.id,x]));for(const x of incoming[k]||[])m.set(x.id,{...m.get(x.id),...x});out[k]=[...m.values()]}return out}
function chatsFromExport(input){
 const arr=Array.isArray(input)?input:input?.conversations;if(!Array.isArray(arr))throw Error('conversations.json erwartet');
 const chats=arr.filter(x=>x&&x.id&&x.title).map(x=>{
  const nodes=Object.values(x.mapping||{}),messages=nodes.map(n=>n?.message).filter(m=>['user','assistant'].includes(m?.author?.role));
  const last=messages.filter(m=>m.author.role==='user').sort((a,b)=>(b.create_time||0)-(a.create_time||0))[0];
  const summary=(last?.content?.parts||[]).filter(p=>typeof p==='string').join(' ').slice(0,900);
  return {id:String(x.id),title:String(x.title),detail:summary||'Aus ChatGPT-Datenexport',url:'https://chatgpt.com/c/'+encodeURIComponent(x.id),status:messages.length+' Nachrichten',messageCount:messages.length,updatedAt:new Date((x.update_time||x.create_time||0)*1000).toISOString(),origin:'chatgpt-export',importedAt:new Date().toISOString(),priority:0};
 }).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 const intense=chats.filter(x=>x.messageCount>=12);return [...intense,...chats.filter(x=>x.messageCount<12)].slice(0,3);
}
function sorted(items){return [...items].sort((a,b)=>(b.priority||0)-(a.priority||0)||(b.updatedAt||'').localeCompare(a.updatedAt||''))}
const api={groups,clone,empty,safeUrl,validate,merge,mergeImport,chatsFromExport,sorted};
if(typeof module==='object'&&typeof module.exports==='object')module.exports=api;else root.CockpitCore=api;
})(typeof window==='object'?window:globalThis);
