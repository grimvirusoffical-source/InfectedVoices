import { Database } from "bun:sqlite";
import { applyStripeSubscription, emptyBilling } from "./stripe-subscription.mjs";
import { entitlementsFromBilling, startTrialOnBilling } from "./entitlements.mjs";
import { DOWNLOAD_ROUTES, renderDownload } from "./download-pages.mjs";
import { mkdirSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PORT=Number(process.env.PORT||8790);
const HOST=process.env.HOST||"0.0.0.0";
const NATION=(process.env.NATION_ORIGIN||"https://nation.infectedvoices.space").replace(/\/+$/,"");
const APP_ID="infected-voices";
const ROOT=resolve(fileURLToPath(new URL("../browser-dist/",import.meta.url)));
const DATA=resolve(process.env.REDX_PERSIST_ROOT||"./data/infectedvoices");
mkdirSync(DATA,{recursive:true});
const db=new Database(resolve(DATA,"studio.sqlite"),{create:true,strict:true});
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS activity(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 account_id TEXT NOT NULL,
 action TEXT NOT NULL,
 at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS activity_account_at_idx ON activity(account_id,at);
CREATE TABLE IF NOT EXISTS studio_billing(
 account_id TEXT PRIMARY KEY,
 record TEXT NOT NULL
);
`);

function readBilling(accountId){
  const row=db.prepare("SELECT record FROM studio_billing WHERE account_id=?").get(accountId);
  if(!row?.record)return emptyBilling();
  try{return {...emptyBilling(),...JSON.parse(row.record)};}catch{return emptyBilling();}
}
function writeBilling(accountId,record){
  db.prepare("INSERT INTO studio_billing(account_id,record) VALUES(?,?) ON CONFLICT(account_id) DO UPDATE SET record=excluded.record")
    .run(accountId,JSON.stringify(record));
}
const TYPES={
  ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",
  ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".ico":"image/x-icon",
  ".woff":"font/woff",".woff2":"font/woff2",".wasm":"application/wasm",".mp3":"audio/mpeg",".wav":"audio/wav"
};
function cors(req){
  const origin=req.headers.get("origin")||"";
  if(["capacitor://localhost","http://localhost","https://localhost","https://infectedvoices.space"].includes(origin)){
    return {"access-control-allow-origin":origin,"vary":"origin"};
  }
  return {};
}
const json=(req,data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...cors(req)}
});
async function parseBody(req){
  try{return await req.json();}catch{return {};}
}
function bearer(req){
  const value=req.headers.get("authorization")||"";
  const match=value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]||"";
}
async function nation(path,payload){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(NATION+path,{
      method:"POST",headers:{"content-type":"application/json","accept":"application/json"},
      body:JSON.stringify(payload||{}),signal:controller.signal,redirect:"error"
    });
    const text=await response.text();
    let data={};
    try{data=text?JSON.parse(text):{};}catch{throw new Error("InfectedNation returned unreadable JSON.");}
    return {ok:response.ok,status:response.status,data};
  }finally{clearTimeout(timer);}
}
async function accountFor(req){
  const token=bearer(req);
  if(!token)return {token:"",account:null};
  const result=await nation("/api/v1/session/me",{token});
  return {token,account:result.ok?result.data.account:null};
}
async function requireAccount(req){
  const found=await accountFor(req);
  if(!found.account)return {error:json(req,{error:"Sign in with InfectedNation first."},401)};
  return found;
}
async function requireAccess(req){
  const found=await requireAccount(req);
  if("error" in found)return found;
  const result=await nation("/api/v1/access",{token:found.token,appId:APP_ID});
  if(!result.ok)return {error:json(req,result.data,result.status)};
  if(!result.data.allowed)return {error:json(req,{error:"Studio Plus access is not active.",...result.data},403)};
  return {...found,access:result.data};
}
function user(account){
  return {
    id:account.accountId,userId:account.accountId,email:account.email,username:account.username,
    name:[account.firstName,account.middleInitial,account.lastName].filter(Boolean).join(" "),
    firstName:account.firstName,lastName:account.lastName,useType:account.useType,companyName:account.companyName
  };
}
function cleanAction(value){
  const action=String(value||"").slice(0,80);
  return /^[A-Za-z0-9_.:-]+$/.test(action)?action:"";
}
async function api(req,url){
  const path=url.pathname;
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
    ...cors(req),"access-control-allow-methods":"GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers":"content-type, authorization, x-audio-consent","access-control-max-age":"600"
  }});
  if(path==="/api/health")return json(req,{ok:true,service:"InfectedVoices",host:"RedXAIHost",nation:NATION});

  if(path==="/api/auth/connect/start"&&req.method==="POST"){
    const body=await parseBody(req);
    const result=await nation("/api/v1/connect/start",{appId:APP_ID,secret:body.secret});
    return json(req,result.data,result.status);
  }
  if(path==="/api/auth/connect/session"&&req.method==="POST"){
    const body=await parseBody(req);
    const result=await nation("/api/v1/connect/session",{id:body.id,secret:body.secret});
    return json(req,result.data,result.status);
  }
  if(path==="/api/me"&&req.method==="GET"){
    const found=await accountFor(req);
    const entitlements=found.account?entitlementsFromBilling(readBilling(found.account.accountId),Date.now()):null;
    return json(req,{user:found.account?user(found.account):null,entitlements,csrf:""});
  }

  if(path==="/api/me/entitlements"&&req.method==="GET"){
    const found=await requireAccount(req);if("error" in found)return found.error;
    const billing=readBilling(found.account.accountId);
    return json(req,entitlementsFromBilling(billing,Date.now()));
  }
  if(path==="/api/billing/trial"&&req.method==="POST"){
    const found=await requireAccount(req);if("error" in found)return found.error;
    const body=await parseBody(req);
    const tier=body.tier==="pro"?"pro":"basic";
    const stored=readBilling(found.account.accountId);
    const result=startTrialOnBilling(stored,tier,{
      cardAuthorized:body.cardAuthorized!==false,
      trialDays:Number(process.env.IV_STRIPE_TRIAL_DAYS||7)
    },Date.now());
    writeBilling(found.account.accountId,result.record);
    if(!result.ok)return json(req,{error:result.reason,entitlements:entitlementsFromBilling(result.record)},result.status);
    return json(req,{ok:true,entitlements:entitlementsFromBilling(result.record)});
  }
  if(path==="/api/logout"&&req.method==="POST"){
    const token=bearer(req);
    if(token)await nation("/api/v1/session/logout",{token}).catch(()=>{});
    return json(req,{loggedOut:true});
  }
  if(path==="/api/access"&&req.method==="GET"){
    const found=await requireAccount(req);if("error" in found)return found.error;
    const result=await nation("/api/v1/access",{token:found.token,appId:APP_ID});
    return json(req,result.data,result.status);
  }
  if(path==="/api/onboarding"&&req.method==="GET"){
    const found=await requireAccount(req);if("error" in found)return found.error;
    const result=await nation("/api/v1/onboarding/get",{token:found.token,appId:APP_ID});
    return json(req,result.data,result.status);
  }
  if(path==="/api/onboarding"&&req.method==="POST"){
    const found=await requireAccount(req);if("error" in found)return found.error;
    const body=await parseBody(req),step=Math.max(0,Math.min(19,Number(body.step||0)));
    const result=await nation("/api/v1/onboarding/set",{
      token:found.token,appId:APP_ID,version:String(body.version||"").slice(0,80),
      step,lastStep:19,complete:step>=19
    });
    return json(req,result.data,result.status);
  }
  if(path==="/api/billing/checkout"&&req.method==="POST"){
    const found=await requireAccount(req);if("error" in found)return found.error;
    const body=await parseBody(req);
    const plan=body.plan==="pro"?"pro":"basic";
    const stored=readBilling(found.account.accountId);
    const usedAt=plan==="pro"?stored.proTrialUsedAt:stored.basicTrialUsedAt;
    const requested=plan==="pro"?body.proTrialUsedAt:body.basicTrialUsedAt;
    const trialDays=usedAt||requested?0:Math.max(0,Number(process.env.IV_STRIPE_TRIAL_DAYS||7));
    const priceId=plan==="pro"?process.env.IV_STRIPE_PRICE_PRO:process.env.IV_STRIPE_PRICE_BASIC;
    const result=await nation("/api/v1/billing/stripe/checkout",{
      token:found.token,appId:APP_ID,plan,priceId,
      trialPeriodDays:trialDays,trial_period_days:trialDays,
      subscription_data:{trial_period_days:trialDays}
    });
    return json(req,result.data,result.status);
  }
  if(path==="/api/billing/stripe/webhook"&&req.method==="POST"){
    const event=await parseBody(req);
    const object=event?.data?.object||{};
    const accountId=String(object.metadata?.accountId||object.client_reference_id||event.accountId||"");
    if(!accountId)return json(req,{error:"Subscription event is missing an account id."},400);
    const next=applyStripeSubscription(readBilling(accountId),event,Date.now());
    writeBilling(accountId,next);
    return json(req,{ok:true,plan:next.plan,trialEnd:next.trialEnd,basicTrialUsedAt:next.basicTrialUsedAt,proTrialUsedAt:next.proTrialUsedAt});
  }
  if(path==="/api/activity"&&req.method==="POST"){
    const found=await requireAccess(req);if("error" in found)return found.error;
    const body=await parseBody(req),action=cleanAction(body.action);
    if(!action)return json(req,{error:"Invalid activity label."},400);
    db.prepare("INSERT INTO activity(account_id,action,at) VALUES(?,?,?)").run(found.account.accountId,action,Date.now());
    db.prepare("DELETE FROM activity WHERE id IN (SELECT id FROM activity WHERE account_id=? ORDER BY at DESC LIMIT -1 OFFSET 100)")
      .run(found.account.accountId);
    return json(req,{ok:true});
  }
  if(path==="/api/workstation/capabilities"&&req.method==="GET"){
    const found=await requireAccess(req);if("error" in found)return found.error;
    return json(req,{aiAssist:false,stemSeparation:false,cloudMix:false,provider:"redxaihost"});
  }
  if(path==="/api/presence"&&req.method==="POST"){
    const found=await requireAccess(req);if("error" in found)return found.error;
    return json(req,{ok:true,serverTime:Date.now()});
  }
  if(path==="/api/rooms"&&req.method==="GET"){
    const found=await requireAccess(req);if("error" in found)return found.error;
    return json(req,{items:[]});
  }
  if(path==="/api/collab/relay"&&req.method==="GET"){
    const found=await requireAccess(req);if("error" in found)return found.error;
    return json(req,{configured:false,iceServers:[],message:"RedX collaboration relay is not configured yet."});
  }
  if(path==="/api/stream"&&req.method==="GET"){
    const found=await requireAccess(req);if("error" in found)return found.error;
    return new Response(": redxaihost\n\n",{headers:{
      "content-type":"text/event-stream","cache-control":"no-cache","connection":"keep-alive",...cors(req)
    }});
  }

  const unavailable=[
    "/api/ai/coach","/api/ai/audio","/api/workstation/assist","/api/workstation/separation",
    "/api/invitation","/api/auth/universe"
  ];
  if(unavailable.includes(path)){
    const found=await requireAccess(req);if("error" in found)return found.error;
    return json(req,{error:"This cloud/provider feature is not configured on RedXAIHost yet.",code:"provider_not_configured"},503);
  }
  if(path==="/api/redeem"){
    const found=await requireAccount(req);if("error" in found)return found.error;
    return json(req,{error:"Lifetime-code migration to InfectedNation is not enabled yet.",code:"codes_not_migrated"},503);
  }
  if(path==="/api/owner/codes"&&req.method==="GET"){
    const found=await requireAccount(req);if("error" in found)return found.error;
    return json(req,{items:[],nextToken:""});
  }
  if(path.startsWith("/api/owner/")){
    const found=await requireAccount(req);if("error" in found)return found.error;
    return json(req,{error:"Owner moderation for this route is not enabled on the RedX browser service yet."},503);
  }
  if(path.startsWith("/api/rooms/")||path.startsWith("/api/collab/")||path.startsWith("/api/media/")){
    const found=await requireAccess(req);if("error" in found)return found.error;
    return json(req,{error:"Realtime collaboration storage is not enabled on this RedX browser service yet.",code:"collab_not_configured"},503);
  }
  return json(req,{error:"Not found."},404);
}

function staticPath(pathname){
  let decoded;
  try{decoded=decodeURIComponent(pathname);}catch{return null;}
  if(decoded.includes("\0"))return null;
  const rel=decoded.replace(/^\/+/, "")||"index.html";
  const target=resolve(ROOT,rel);
  if(target!==ROOT&&!target.startsWith(ROOT+(/[\\]$/.test(ROOT)?"":"\\"))&&!target.startsWith(ROOT+"/"))return null;
  return target;
}
const server=Bun.serve({
  hostname:HOST,port:PORT,
  async fetch(req){
    const url=new URL(req.url);
    const downloadName=DOWNLOAD_ROUTES[url.pathname];
    if(downloadName||url.pathname==="/get"||url.pathname==="/download"){
      const name=downloadName||"index.html";
      const page=Bun.file(resolve(fileURLToPath(new URL("../download/"+name,import.meta.url))));
      if(!(await page.exists()))return new Response("Not found.",{status:404});
      const raw=await page.text();
      const body=name.endsWith(".html")?renderDownload(raw):raw;
      const type=name.endsWith(".css")?"text/css; charset=utf-8":name.endsWith(".js")?"text/javascript; charset=utf-8":"text/html; charset=utf-8";
      return new Response(body,{headers:{"content-type":type,"x-content-type-options":"nosniff","cache-control":"no-store"}});
    }
    if(url.pathname.startsWith("/api/"))return api(req,url);
    let target=staticPath(url.pathname);
    if(!target)return new Response("Not found.",{status:404});
    let file=Bun.file(target);
    if(!(await file.exists())&&!extname(target)){
      target=resolve(target+".html");file=Bun.file(target);
    }
    if(!(await file.exists()))return new Response("Not found.",{status:404});
    const headers={"x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin"};
    const type=TYPES[extname(target).toLowerCase()];if(type)headers["content-type"]=type;
    return new Response(file,{headers});
  }
});
console.log(`Infected Voices RedX browser listening on http://${HOST}:${server.port}`);