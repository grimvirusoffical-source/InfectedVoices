const NATION_ORIGIN='https://nation.infectedvoices.space';
const APP_ID='infected-voices';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const randomSecret=()=>{
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
};
async function nationRequest(path,body){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(NATION_ORIGIN+path,{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(body||{}),
      redirect:'error',
      credentials:'omit',
      signal:controller.signal
    });
    const text=await response.text();
    let data={};
    try{data=text?JSON.parse(text):{};}catch{throw Error('InfectedNation returned an unreadable response.');}
    if(!response.ok){
      const err=Error(String(data.error||'InfectedNation request failed.').slice(0,500));
      err.status=response.status;
      err.data=data;
      throw err;
    }
    return data;
  }finally{clearTimeout(timer);}
}

export function createNationClient({Browser,SecureStorage}){
  const prefix='infectedvoices_nation_';
  const setPrefix=()=>SecureStorage.setKeyPrefix(prefix);
  async function tokenGet(){
    try{await setPrefix();return await SecureStorage.get('session_token')||'';}catch{return '';}
  }
  async function tokenSet(token){
    await setPrefix();
    if(token)await SecureStorage.set('session_token',token);
    else await SecureStorage.remove('session_token');
  }
  async function me(){
    const token=await tokenGet();
    if(!token)return null;
    try{return (await nationRequest('/api/v1/session/me',{token})).account||null;}
    catch(e){if(e.status===401)await tokenSet('');throw e;}
  }
  async function signIn(options={}){
    const flow=options.flow==='signup'?'signup':'login';
    const method=['apple','google','android','email'].includes(options.method)?options.method:'email';
    const secret=randomSecret();
    const request=await nationRequest('/api/v1/connect/start',{appId:APP_ID,secret});
    if(typeof request.id!=='string'||!Number.isFinite(request.expires))throw Error('InfectedNation returned an invalid connection request.');
    const url=NATION_ORIGIN+'/?connect='+encodeURIComponent(request.id)+'&app='+encodeURIComponent(APP_ID)+'&flow='+encodeURIComponent(flow)+'&method='+encodeURIComponent(method);
    await Browser.open({url,presentationStyle:'popover'});
    while(Date.now()<request.expires){
      await pause(1800);
      try{
        const result=await nationRequest('/api/v1/connect/session',{id:request.id,secret});
        if(result.pending)continue;
        if(!result.token||!result.account)throw Error('InfectedNation returned an incomplete session.');
        await tokenSet(result.token);
        try{await Browser.close();}catch{}
        return result.account;
      }catch(e){
        if(e.status===202)continue;
        throw e;
      }
    }
    throw Error('InfectedNation sign-in expired. Start again.');
  }
  async function signOut(){
    const token=await tokenGet();
    await tokenSet('');
    if(!token)return;
    try{await nationRequest('/api/v1/session/logout',{token});}catch{}
  }
  async function securityHistory(){
    const token=await tokenGet();
    if(!token)throw Error('Sign in to InfectedNation first.');
    return nationRequest('/api/v1/security/history',{token});
  }
  async function currentToken(){return tokenGet();}
  async function post(path,payload){return nationRequest(path,payload);}
  return Object.freeze({origin:NATION_ORIGIN,me,signIn,signOut,securityHistory,currentToken,post});
}
