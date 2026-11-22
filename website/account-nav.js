import { createClient } from '@supabase/supabase-js';
const nav=document.getElementById('account-nav-label');
if(nav){
  const client=window.FMFAuthClient || createClient('https://xecdvxknbdwetdlhaazl.supabase.co','sb_publishable_9iI-6RC8bYYDD7QRpgiycw_ZMh1HLDs',{auth:{detectSessionInUrl:false}});
  let signedIn=false, lastTouch=0, disposed=false;
  function touch(){
    if(disposed || !nav.isConnected || !signedIn || document.hidden || Date.now()-lastTouch<300000)return;
    lastTouch=Date.now();
    Promise.resolve(client.rpc('touch_account_activity')).catch(()=>{});
  }
  const subscription=client.auth.onAuthStateChange((_event,session)=>{
    signedIn=!!session;nav.textContent=signedIn?'Account':'Login';
    if(signedIn)setTimeout(touch,0); else lastTouch=0;
  });
  function onVisibility(){if(!document.hidden)touch();}
  function cleanup(){if(nav.isConnected)return;disposed=true;document.removeEventListener('pointerdown',touch);document.removeEventListener('keydown',touch);document.removeEventListener('visibilitychange',onVisibility);document.removeEventListener('fmf-nav',cleanup);subscription?.data?.subscription?.unsubscribe();}
  document.addEventListener('pointerdown',touch,{passive:true});document.addEventListener('keydown',touch);document.addEventListener('visibilitychange',onVisibility);document.addEventListener('fmf-nav',cleanup);
}
