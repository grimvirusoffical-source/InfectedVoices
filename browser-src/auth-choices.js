function button(label,flow,method,target){
  const b=document.createElement('button');
  b.type='button';b.textContent=label;
  if(method==='apple')b.className='apple-auth';
  b.onclick=()=>{
    sessionStorage.setItem('iv-auth-request',JSON.stringify({flow,method}));
    target.click();
  };
  return b;
}
function mount(target,host){
  if(!target||!host||host.querySelector('.infected-auth-choices'))return;
  target.hidden=true;
  const wrap=document.createElement('section');wrap.className='infected-auth-choices';
  const createTitle=document.createElement('h3');createTitle.textContent='Create an InfectedNation account';
  const create=document.createElement('div');create.className='infected-auth-grid';
  for(const [method,label] of [['apple','Apple signup'],['google','Google signup'],['android','Android / passkey signup'],['email','Email signup']])create.append(button(label,'signup',method,target));
  const loginTitle=document.createElement('h3');loginTitle.textContent='Already have an account?';
  const login=document.createElement('div');login.className='infected-auth-grid';
  for(const [method,label] of [['apple','Apple login'],['google','Google login'],['android','Android / passkey login'],['email','Email login']])login.append(button(label,'login',method,target));
  wrap.append(createTitle,create,loginTitle,login);
  host.insertBefore(wrap,target);
}
function run(){
  const signIn=document.getElementById('signIn');
  if(signIn)mount(signIn,signIn.parentElement);
  const hero=document.getElementById('labSignInHero');
  if(hero)mount(hero,hero.parentElement);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
