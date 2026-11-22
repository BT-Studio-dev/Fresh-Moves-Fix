import { createClient } from '@supabase/supabase-js';
const client=createClient('https://xecdvxknbdwetdlhaazl.supabase.co','sb_publishable_9iI-6RC8bYYDD7QRpgiycw_ZMh1HLDs');
window.FMFAuthClient=client;
const $=id=>document.getElementById(id), root=$('profiles-page'), status=$('profile-status');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeImage=s=>typeof s==='string' && s.length<=180000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(s);
let viewer=null, profileId=new URL(location.href).searchParams.get('id'), seq=0;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
function link(id,name){const a=el('a',name||'Player');a.href='?id='+encodeURIComponent(id);return a;}
function date(value){const d=new Date(value);return value && !isNaN(d)?d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'Not available';}
async function query(promise){let timer;try{const r=await Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Request timed out')),12000);})]);if(r.error)throw r.error;return r.data;}finally{clearTimeout(timer);}}
function button(text,action){const b=el('button',text,'btn ghost');b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await action();await load();}catch(_){status.textContent='Could not complete that action. Please try again.';b.disabled=false;}});return b;}
function itemMessage(node,text){node.replaceChildren(el('p',text));}
async function load(){
 const request=++seq; status.textContent='Loading…';
 try{
   const people=await query(client.from('user_profiles').select('user_id,display_name,created_at').order('created_at',{ascending:false}).limit(100));
   if(request!==seq || !root.isConnected)return;
   const names=new Map(people.map(p=>[p.user_id,p.display_name]));
   const directory=$('profile-directory');directory.replaceChildren();
   if(!people.length)directory.append(el('p','No community profiles yet.'));
   people.forEach(p=>directory.append(link(p.user_id,p.display_name)));
   if(!profileId && viewer)profileId=viewer.id;
   if(!profileId){$('profile-view').hidden=true;status.textContent='Choose a profile to view.';return;}
   if(!uuid.test(profileId)){ $('profile-view').hidden=true;status.textContent='Invalid profile link.';return; }
   const person=people.find(p=>p.user_id===profileId) || await query(client.from('user_profiles').select('user_id,display_name,created_at').eq('user_id',profileId).maybeSingle());
   if(request!==seq || !root.isConnected)return;
   if(!person){$('profile-view').hidden=true;status.textContent='Profile not found.';return;}
   names.set(person.user_id,person.display_name);
   const [uploads,comments,friends,activity,role]=await Promise.all([
     query(client.from('profile_uploads').select('id,user_id,title,kind,image_data,created_at').eq('user_id',profileId).order('created_at',{ascending:false}).limit(50)),
     query(client.from('profile_comments').select('id,profile_id,author_id,body,created_at').eq('profile_id',profileId).order('created_at',{ascending:false}).limit(50)),
     query(client.from('profile_friendships').select('id,requester,recipient,accepted').or('requester.eq.'+profileId+',recipient.eq.'+profileId).limit(100)),
     query(client.from('account_activity').select('last_seen_at').eq('user_id',profileId).maybeSingle()),
     viewer ? query(client.from('comment_roles').select('role').eq('user_id',viewer.id).maybeSingle()) : Promise.resolve(null)
   ]);
   if(request!==seq || !root.isConnected)return;
   $('profile-view').hidden=false;$('profile-name').textContent=person.display_name;$('profile-avatar').textContent=Array.from(person.display_name)[0]?.toUpperCase() || '?';
   $('profile-created').textContent='Joined '+date(person.created_at);$('profile-active').textContent=activity?.last_seen_at?'Last active '+new Date(activity.last_seen_at).toLocaleString():'Last active not recorded';
   const own=viewer?.id===profileId; $('profile-upload-form').hidden=!own;$('profile-comment-form').hidden=!viewer;$('profile-login').hidden=!!viewer;
   const action=$('profile-friend-action');action.replaceChildren();
   const relation=viewer && friends.find(f=>(f.requester===viewer.id || f.recipient===viewer.id));
   if(viewer && !own){
     if(!relation)action.append(button('Add friend',()=>query(client.from('profile_friendships').insert({recipient:profileId}))));
     else if(relation.accepted)action.append(el('span','Friends'),button('Remove friend',()=>query(client.from('profile_friendships').delete().eq('id',relation.id))));
     else if(relation.recipient===viewer.id)action.append(button('Accept request',()=>query(client.rpc('accept_friend_request',{request_id:relation.id}))),button('Decline',()=>query(client.from('profile_friendships').delete().eq('id',relation.id))));
     else action.append(el('span','Friend request sent'),button('Cancel request',()=>query(client.from('profile_friendships').delete().eq('id',relation.id))));
   }
   const friendList=$('profile-friends');friendList.replaceChildren();const accepted=friends.filter(f=>f.accepted);$('profile-friend-count').textContent=accepted.length+' '+(accepted.length===1?'friend':'friends');
   accepted.forEach(f=>{const id=f.requester===profileId?f.recipient:f.requester;friendList.append(link(id,names.get(id)||'View friend'));});
   if(own){const pending=friends.filter(f=>!f.accepted && f.recipient===viewer.id);pending.forEach(f=>{const row=el('div',null,'profile-pending');row.append(link(f.requester,names.get(f.requester)||'Friend request'),button('Accept',()=>query(client.rpc('accept_friend_request',{request_id:f.id}))),button('Decline',()=>query(client.from('profile_friendships').delete().eq('id',f.id))));friendList.append(row);});}
   const gallery=$('profile-uploads');gallery.replaceChildren();
   uploads.forEach(u=>{if(!safeImage(u.image_data))return;const card=el('article',null,'profile-upload-card');const img=el('img');img.src=u.image_data;img.alt=u.title;img.loading='lazy';card.append(img,el('strong',u.title),el('small',u.kind==='skin'?'Minecraft skin':'Image'));const a=el('a','Download','btn ghost');a.href=u.image_data;a.download=u.kind==='skin'?'minecraft-skin.png':'image';card.append(a);if(own || (viewer && ['owner','co-owner'].includes(role?.role)))card.append(button('Delete',()=>query(client.from('profile_uploads').delete().eq('id',u.id))));gallery.append(card);});
   if(!gallery.children.length)itemMessage(gallery,'No uploads yet.');
   const list=$('profile-comments');list.replaceChildren();comments.forEach(c=>{const card=el('article',null,'comment-item');const head=el('div',null,'comment-header');head.append(link(c.author_id,names.get(c.author_id)||'Player'),el('time',date(c.created_at)));card.append(head,el('p',c.body));if(viewer && (own || viewer.id===c.author_id || ['owner','co-owner'].includes(role?.role)))card.append(button('Delete',()=>query(client.from('profile_comments').delete().eq('id',c.id))));list.append(card);});if(!comments.length)itemMessage(list,'No comments yet.');
   status.textContent='';
 }catch(_){if(request===seq && root.isConnected){status.replaceChildren(document.createTextNode('Could not load profiles. Check your connection and '));const retry=el('button','Try again','btn ghost');retry.type='button';retry.addEventListener('click',load);status.append(retry);}}
}
$('profile-comment-form').addEventListener('submit',async e=>{e.preventDefault();const text=$('profile-comment-text'),b=e.currentTarget.querySelector('button');if(!viewer||!text.value.trim())return;b.disabled=true;try{await query(client.from('profile_comments').insert({profile_id:profileId,body:text.value.trim()}));text.value='';await load();}catch(_){status.textContent='Could not post the comment.';}finally{b.disabled=false;}});
$('profile-upload-form').addEventListener('submit',async e=>{e.preventDefault();const f=$('profile-file').files[0],kind=$('profile-kind').value,title=$('profile-upload-title').value.trim(),b=e.currentTarget.querySelector('button');if(!viewer || viewer.id!==profileId || !f || !title)return;if(f.size>2*1024*1024 || !['image/png','image/jpeg','image/webp'].includes(f.type) || (kind==='skin'&&f.type!=='image/png')){status.textContent='Choose a PNG skin or a PNG, JPEG or WebP image under 2 MB.';return;}b.disabled=true;status.textContent='Preparing upload…';try{
 const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});
 const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});let data=src;
 if(kind==='skin' && (img.width!==64 || ![32,64].includes(img.height)))throw Error('A skin must be 64×64 or 64×32 PNG.');
 if(kind==='image'){const ratio=Math.min(1,960/img.width,960/img.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/webp',.8);if(!safeImage(data))data=canvas.toDataURL('image/jpeg',.65);}
 if(!safeImage(data))throw Error('Image is too large after processing. Try a smaller image.');await query(client.from('profile_uploads').insert({title,kind,image_data:data}));e.target.reset();$('profile-kind').value='skin';await load();
 }catch(err){status.textContent=err.message||'Could not upload the image.';}finally{b.disabled=false;}});
let authReady=false;
client.auth.onAuthStateChange((_event,session)=>{authReady=true;viewer=session?.user||null;setTimeout(()=>{if(root.isConnected)load();},0);});
// If session initialization stalls, show a recoverable error rather than a permanent loader.
setTimeout(()=>{if(!authReady && root.isConnected){status.replaceChildren(document.createTextNode('Sign-in is taking too long. '));const retry=el('button','Try again','btn ghost');retry.type='button';retry.addEventListener('click',()=>location.reload());status.append(retry);}},12000);
