import { createClient } from '@supabase/supabase-js';

// This is a public client key, not a service-role key. Supabase enforces access rules.
const client = createClient('https://xecdvxknbdwetdlhaazl.supabase.co', 'sb_publishable_9iI-6RC8bYYDD7QRpgiycw_ZMh1HLDs');
window.FMFAuthClient=client;
const $ = id => document.getElementById(id);
const panels = ['signin', 'signup', 'forgot', 'reset', 'signed-in'];
// Each password field has its own accessible visibility control.
document.querySelectorAll('.account-card input[type="password"]').forEach(input => {
  const container=document.createElement('span'); container.className='account-password';
  input.parentNode.insertBefore(container,input); container.appendChild(input);
  const toggle=document.createElement('button'); toggle.type='button'; toggle.className='account-password-toggle';
  const fieldName=input.parentNode.parentNode.firstChild.textContent.trim() || 'Password';
  function update(){const visible=input.type==='text';toggle.innerHTML=visible?'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a14.7 14.7 0 0 1-3.1 3.8M6.2 6.2A15.4 15.4 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4.3-1"/></svg>':'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';toggle.setAttribute('aria-label',(visible?'Hide ':'Show ')+fieldName.toLowerCase());toggle.setAttribute('title',(visible?'Hide ':'Show ')+fieldName.toLowerCase());toggle.setAttribute('aria-pressed',String(visible));}
  toggle.addEventListener('click',()=>{input.type=input.type==='password'?'text':'password';update();});
  container.appendChild(toggle);update();
});
let recovering = false, roleRequest = 0;
function show(name) { panels.forEach(p => { $('account-'+p).hidden = p !== name; }); $('account-message').textContent = ''; }
function status(text) { $('account-message').textContent = text; }
function displayUser(user) {
  const name=user.user_metadata?.username || user.email || 'Your account';
  $('account-user').textContent=name;
  $('account-email').textContent=user.email || 'Not available';
  $('account-avatar').textContent=Array.from(name.trim())[0]?.toUpperCase() || '?';
  const created=new Date(user.created_at);$('account-created').textContent=user.created_at && !isNaN(created) ? created.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}) : 'Not available';
  $('account-last-active').textContent='Loading…';
  show('signed-in');
  const request=++roleRequest, badge=$('account-role');badge.hidden=true;badge.textContent='';
  // Run outside the auth callback to avoid re-entering Supabase auth's lock.
  setTimeout(async () => {
    try {
      const {data,error}=await client.from('comment_roles').select('role').eq('user_id',user.id).maybeSingle();
      if(request!==roleRequest || error || !data || !['owner','co-owner'].includes(data.role))return;
      badge.textContent=data.role==='owner'?'OWNER PROFILE':'CO-OWNER PROFILE';badge.hidden=false;
    } catch (_) { /* A missing badge never grants permissions. */ }
  },0);
  setTimeout(async () => {
    try {
      const {data,error}=await client.from('account_activity').select('last_seen_at').eq('user_id',user.id).maybeSingle();
      if(request!==roleRequest)return;
      const date=new Date(data?.last_seen_at);
      $('account-last-active').textContent=!error && data?.last_seen_at && !isNaN(date) ? date.toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : 'Not recorded yet';
    } catch (_) { if(request===roleRequest)$('account-last-active').textContent='Not available'; }
  },0);
}
document.querySelectorAll('[data-account-view]').forEach(button => button.addEventListener('click', () => show(button.dataset.accountView)));
client.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') { roleRequest++; recovering = true; show('reset'); }
  else if (event === 'SIGNED_OUT') { roleRequest++; recovering = false; show('signin'); }
  else if (session && !recovering) displayUser(session.user);
});
function submit(id, action) {
  $(id).addEventListener('submit', async e => {
    e.preventDefault(); const form=e.currentTarget, button=form.querySelector('button[type=submit]');
    button.disabled=true; status('Please wait…');
    try { await action(form); } catch (error) { status(error.message || 'Something went wrong. Please try again.'); }
    finally { button.disabled=false; }
  });
}
submit('signin-form', async f => {
  const { error }=await client.auth.signInWithPassword({email:f.email.value.trim(),password:f.password.value});
  if(error) throw error; f.reset();
});
submit('signup-form', async f => {
  if(f.password.value!==f.repeat.value) throw new Error('Passwords do not match.');
  const username=f.username.value.trim(); if(!username) throw new Error('Enter a username.');
  const {data,error}=await client.auth.signUp({email:f.email.value.trim(),password:f.password.value,options:{data:{username},emailRedirectTo:location.origin+'/account/'}});
  if(error) throw error; f.reset(); if(!data.session) status('Check your email for a confirmation link before signing in.');
});
submit('forgot-form', async f => {
  const {error}=await client.auth.resetPasswordForEmail(f.email.value.trim(),{redirectTo:location.origin+'/account/'});
  if(error) throw error; f.reset(); status('If this email is registered, check your inbox for a password reset link.');
});
submit('reset-form', async f => {
  if(f.password.value!==f.repeat.value) throw new Error('Passwords do not match.');
  const {error}=await client.auth.updateUser({password:f.password.value});
  if(error) throw error; f.reset(); recovering=false; await client.auth.signOut(); show('signin'); status('Password updated. Sign in with your new password.');
});
$('account-signout').addEventListener('click', async () => { const {error}=await client.auth.signOut(); if(error) status(error.message); });

// Deletion requires an explicit confirmation; the server chooses the authenticated user.
const deleteConfirm=$('account-delete-confirm'), deleteButton=$('account-delete'), deleteYes=$('account-delete-yes');
deleteButton.addEventListener('click',()=>{deleteConfirm.hidden=false;deleteButton.hidden=true;$('account-delete-cancel').focus();});
$('account-delete-cancel').addEventListener('click',()=>{deleteConfirm.hidden=true;deleteButton.hidden=false;deleteButton.focus();});
deleteYes.addEventListener('click',async()=>{
  deleteYes.disabled=true;$('account-delete-cancel').disabled=true;status('Deleting your account…');
  try {
    const {error}=await client.rpc('delete_own_account');if(error)throw error;
    roleRequest++;recovering=false;
    try {await client.auth.signOut({scope:'local'});} catch (_) {}
    deleteConfirm.hidden=true;deleteButton.hidden=false;show('signin');status('Your account and comments have been deleted.');
  } catch (_) {status('Could not delete your account. Please try again.');}
  finally {deleteYes.disabled=false;$('account-delete-cancel').disabled=false;}
});
