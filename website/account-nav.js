import { createClient } from '@supabase/supabase-js';
const nav=document.getElementById('account-nav-label');
if(nav){
  const client=window.FMFAuthClient || createClient('https://xecdvxknbdwetdlhaazl.supabase.co','sb_publishable_9iI-6RC8bYYDD7QRpgiycw_ZMh1HLDs',{auth:{detectSessionInUrl:false}});
  client.auth.onAuthStateChange((_event,session)=>{nav.textContent=session?'Account':'Login';});
}
