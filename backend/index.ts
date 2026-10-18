import {createClient} from 'npm:@supabase/supabase-js@2.99.1';
import webpush from 'npm:web-push@3.6.7';
const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const origin='https://michaelmassih2-beep.github.io';
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
function checked<T>(r:{data:T,error:unknown}):T{if(r.error)throw Error('database_error');return r.data}
async function settings(){return checked(await admin.rpc('cockpit_worker_settings'))||{}}
function validEndpoint(endpoint:string){try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','notify.windows.com'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h))}catch{return false}}
async function dispatch(){
 const cfg=await settings();
 const jobs=checked(await admin.rpc('cockpit_claim_jobs'))||[];let sent=0,failed=0;
 for(const j of jobs){try{
  // Re-check after claiming: edits/cancellation can race the worker.
  const current=checked(await admin.from('cockpit_jobs').select('state,next_run').eq('id',j.id).single());
  if(current.state!=='active'||current.next_run!==j.next_run)continue;
  let targets:any[]=[];
  if(j.channel==='push')targets=checked(await admin.from('cockpit_subscriptions').select('*').eq('user_id',j.user_id))||[];
  else {const r=await admin.auth.admin.getUserById(j.user_id);if(r.error)throw Error('email_user_missing');if(!r.data.user.email_confirmed_at)throw Error('email_not_verified');targets=[{id:'email',email:r.data.user.email}]}
  if(!targets.length)throw Error('no_active_device');
  let errors=0,accepted=0;
  for(const t of targets){
   const old=checked(await admin.from('cockpit_deliveries').select('state').eq('job_id',j.id).eq('scheduled_for',j.next_run).eq('target',t.id).maybeSingle());if(old?.state==='accepted'){accepted++;continue}
   try{
    if(j.channel==='push'){
     if(!cfg.vapid)throw Error('push_not_initialized');
     if(!validEndpoint(t.endpoint))throw Error('invalid_push_endpoint');
     await webpush.sendNotification(t.subscription,JSON.stringify({title:j.title,body:j.body,tag:j.id+'-'+j.next_run}),{TTL:86400,timeout:10000,vapidDetails:{subject:origin,publicKey:cfg.vapid.publicKey,privateKey:cfg.vapid.privateKey}});
    }else{
     const key=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('EMAIL_FROM');if(!key||!from)throw Error('email_not_configured');
     const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':j.id+'-'+j.next_run},body:JSON.stringify({from,to:[t.email],subject:j.title,text:j.body||j.title}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('email_provider_'+r.status);
    }
    checked(await admin.from('cockpit_deliveries').upsert({job_id:j.id,user_id:j.user_id,scheduled_for:j.next_run,target:t.id,channel:j.channel,state:'accepted',detail:'Vom Versanddienst angenommen'},{onConflict:'job_id,scheduled_for,target'}));accepted++;
   }catch(e:any){errors++;const status=e?.statusCode;if(status===404||status===410)checked(await admin.from('cockpit_subscriptions').delete().eq('id',t.id));checked(await admin.from('cockpit_deliveries').upsert({job_id:j.id,user_id:j.user_id,scheduled_for:j.next_run,target:t.id,channel:j.channel,state:'failed',detail:status?'push_provider_'+status:(e.message||'delivery_failed').slice(0,100)},{onConflict:'job_id,scheduled_for,target'}))}
  }
  checked(await admin.rpc('cockpit_finish_job',{job_uuid:j.id,scheduled_at:j.next_run,error_message:errors?'delivery_failed_'+errors:null}));if(errors)failed++;else if(accepted)sent++;
 }catch(e:any){failed++;checked(await admin.rpc('cockpit_finish_job',{job_uuid:j.id,scheduled_at:j.next_run,error_message:e.message||'dispatch_failed'}))}}
 checked(await admin.rpc('cockpit_worker_setting',{setting_key:'heartbeat',setting_value:{at:new Date().toISOString(),sent,failed}}));return {sent,failed};
}
Deno.serve(async req=>{
 try{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  const path=new URL(req.url).pathname.split('/').pop();
  const cfg=await settings();
  if(path==='dispatch'){
   const token=req.headers.get('x-cockpit-scheduler');if(!token||token!==cfg.scheduler?.token)return response({error:'unauthorized'},401);
   return response(await dispatch());
  }
  if(req.headers.get('Origin')&&req.headers.get('Origin')!==origin)return response({error:'origin_denied'},403);
  if(path==='config'&&req.method==='GET')return response({url,key:anon,emailAvailable:!!Deno.env.get('RESEND_API_KEY')&&!!Deno.env.get('EMAIL_FROM'),heartbeat:cfg.heartbeat?.at||null});
  const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'');if(!token)return response({error:'authentication_required'},401);
  const userResponse=await admin.auth.getUser(token);const user=userResponse.data?.user;
  if(userResponse.error||!user||!user.email_confirmed_at)return response({error:'authentication_required'},401);
  if(!cfg.vapid){const vapid=webpush.generateVAPIDKeys();cfg.vapid=checked(await admin.rpc('cockpit_worker_init',{setting_key:'vapid',setting_value:vapid}))}
  if(req.method==='GET'&&path==='status'){
   const jobs=checked(await admin.from('cockpit_jobs').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(200));
   const deliveries=checked(await admin.from('cockpit_deliveries').select('id,job_id,channel,state,detail,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20));
   const subs=checked(await admin.from('cockpit_subscriptions').select('id').eq('user_id',user.id));
   return response({jobs,deliveries,deviceCount:subs.length,vapidPublicKey:cfg.vapid.publicKey,emailAvailable:!!Deno.env.get('RESEND_API_KEY')&&!!Deno.env.get('EMAIL_FROM'),heartbeat:cfg.heartbeat?.at||null});
  }
  if(req.method!=='POST')return response({error:'method_not_allowed'},405);
  const raw=await req.text();if(raw.length>20000)return response({error:'payload_too_large'},413);const body=JSON.parse(raw||'{}');
  if(path==='subscribe'){
   const sub=body.subscription;if(!sub||!validEndpoint(sub.endpoint)||typeof sub.keys?.p256dh!=='string'||typeof sub.keys?.auth!=='string'||JSON.stringify(sub).length>8000)return response({error:'invalid_subscription'},400);
   const count=checked(await admin.from('cockpit_subscriptions').select('id').eq('user_id',user.id));if(count.length>=10)return response({error:'device_limit'},400);
   // Never reassign another user's endpoint.
   const existing=checked(await admin.from('cockpit_subscriptions').select('user_id').eq('endpoint',sub.endpoint).maybeSingle());if(existing&&existing.user_id!==user.id)return response({error:'device_belongs_to_other_user'},409);
   checked(await admin.from('cockpit_subscriptions').upsert({user_id:user.id,endpoint:sub.endpoint,subscription:sub},{onConflict:'endpoint'}));return response({ok:true});
  }
  if(path==='unsubscribe'){if(typeof body.endpoint!=='string')return response({error:'invalid_endpoint'},400);checked(await admin.from('cockpit_subscriptions').delete().eq('user_id',user.id).eq('endpoint',body.endpoint));return response({ok:true})}
  if(path==='pause'){checked(await admin.from('cockpit_jobs').update({state:'paused'}).eq('id',body.id).eq('user_id',user.id));return response({ok:true})}
  if(path==='schedule'||path==='test'){
   const test=path==='test';let next=new Date(body.nextRun);const repeat=Number(body.repeatDays||0),channel=body.channel||'push';
   if(test)next=new Date();
   if(!test&&(!Number.isFinite(next.getTime())||next.getTime()<Date.now()+10000||next.getTime()>Date.now()+5*366*86400000))return response({error:'invalid_time'},400);
   if(![0,1,7].includes(repeat)||!['push','email'].includes(channel)||typeof body.entryId!=='string'||body.entryId.length>200||typeof body.title!=='string'||!body.title.trim()||body.title.length>180||String(body.body||'').length>900)return response({error:'invalid_schedule'},400);
   const timezone=body.timezone||'Europe/Berlin';try{new Intl.DateTimeFormat('en',{timeZone:timezone}).format()}catch{return response({error:'invalid_timezone'},400)}
   if(channel==='email'&&(!Deno.env.get('RESEND_API_KEY')||!Deno.env.get('EMAIL_FROM')))return response({error:'email_not_configured'},409);
   const subs=checked(await admin.from('cockpit_subscriptions').select('id').eq('user_id',user.id));if(channel==='push'&&!subs.length)return response({error:'no_active_device'},409);
   const jobs=checked(await admin.from('cockpit_jobs').select('id,created_at').eq('user_id',user.id));if(jobs.length>=100)return response({error:'job_limit'},429);
   if(test){const old=jobs.filter((j:any)=>Date.now()-Date.parse(j.created_at)<60000);if(old.length>=3)return response({error:'test_rate_limit'},429)}
   const job=checked(await admin.from('cockpit_jobs').upsert({user_id:user.id,entry_id:test?'test-'+crypto.randomUUID():body.entryId,title:body.title,body:body.body||'',next_run:next.toISOString(),repeat_days:repeat,timezone,channel,state:'active',last_error:null,lease_until:null,attempts:0},{onConflict:'user_id,entry_id'}).select('id,state,next_run').single());
   // Test also exercises the same queue worker, not a client-side Notification.
   if(test)await dispatch();return response({job});
  }
  return response({error:'not_found'},404);
 }catch(e){console.error('Cockpit request failed',e instanceof Error?e.message:'unknown');return response({error:'server_error'},500)}
});
