import { createClient } from '@supabase/supabase-js';
const base='https://xecdvxknbdwetdlhaazl.supabase.co', key='sb_publishable_9iI-6RC8bYYDD7QRpgiycw_ZMh1HLDs';
const client=window.FMFAuthClient || createClient(base,key);
window.FMFAuthClient=client;
const $=id=>document.getElementById(id), root=$('profiles-page'), status=$('profile-status');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeImage=s=>typeof s==='string' && s.length<=180000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(s);
let viewer=null, profileId=new URL(location.href).searchParams.get('id'), seq=0;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
function link(id,name){const a=el('a',name||'Player');a.href='?id='+encodeURIComponent(id);return a;}
function date(value){const d=new Date(value);return value && !isNaN(d)?d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'Not available';}
async function query(promise){let timer;try{const r=await Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Request timed out')),12000);})]);if(r.error)throw r.error;return r.data;}finally{clearTimeout(timer);}}
// Public directory does not depend on restoring a user's session. A stalled
// auth refresh must not prevent visitors from browsing public profiles.
async function publicDirectory(){
 const controller=typeof AbortController==='function'?new AbortController():null;
 let timer;try{
   const request=fetch(base+'/rest/v1/user_profiles?select=user_id,display_name,created_at&order=created_at.desc&limit=100',{headers:{apikey:key,Authorization:'Bearer '+key},signal:controller?.signal}).then(async response=>{
     if(!response.ok)throw new Error('Directory unavailable');
     const people=await response.json();if(!Array.isArray(people))throw new Error('Invalid directory');return people;
   });
   return await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>{controller?.abort();reject(new Error('Request timed out'));},8000);})]);
 }finally{clearTimeout(timer);}
}
function button(text,action){const b=el('button',text,'btn ghost');b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await action();await load();}catch(_){status.textContent='Could not complete that action. Please try again.';b.disabled=false;}});return b;}
// Compact pixel-inspired person glyphs keep the friend actions legible without external assets.
function friendButton(text,action,kind){
 const b=button(text,action), ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.classList.add('friend-action-icon');
 const person=document.createElementNS(ns,'path');person.setAttribute('d','M6 3h6v6H6zM4 11h10v2H4zM3 13h12v7H3z');person.setAttribute('fill','currentColor');svg.append(person);
 const mark=document.createElementNS(ns,'path');mark.setAttribute('d',kind==='add'?'M18 11v8M14 15h8':kind==='accept'?'M14 15l3 3 5-6':'M15 12l6 6m0-6l-6 6');mark.setAttribute('fill','none');mark.setAttribute('stroke','currentColor');mark.setAttribute('stroke-width','2');mark.setAttribute('stroke-linecap','square');svg.append(mark);
 b.prepend(svg);b.classList.add('friend-action-button');return b;
}
function itemMessage(node,text){node.replaceChildren(el('p',text));}
function filterCreators(){const term=$('profile-search').value.trim().toLocaleLowerCase();const cards=[...$('profile-directory').querySelectorAll('.profile-creator')];let visible=0;cards.forEach(card=>{const match=card.querySelector('strong').textContent.toLocaleLowerCase().includes(term);card.hidden=!match;if(match)visible++;});$('profile-search-empty').hidden=!term || !cards.length || visible>0;}
$('profile-search').addEventListener('input',filterCreators);
let commentNames=new Map(), commentRole=null, commentSignature='', commentRefresh=0, pollBusy=false, editingComment=null, replyTarget=null;
const commentForm=$('profile-comment-form'), commentText=$('profile-comment-text');
const replyBar=el('div',null,'profile-reply-bar');replyBar.hidden=true;commentForm.prepend(replyBar);
function clearReply(){replyTarget=null;replyBar.hidden=true;replyBar.replaceChildren();}
function chooseReply(c,name){replyTarget=c.id;replyBar.replaceChildren(el('span','Replying to '+name));const cancel=el('button','Cancel','btn ghost');cancel.type='button';cancel.addEventListener('click',clearReply);replyBar.append(cancel);replyBar.hidden=false;commentText.focus();}
function commentAction(label,handler){const b=el('button',label);b.type='button';b.addEventListener('click',handler);return b;}
function renderComments(comments,names,role){
 const signature=JSON.stringify([comments,[...names],role,viewer?.id]);
 if(signature===commentSignature || editingComment)return;
 commentSignature=signature;
 const list=$('profile-comments');list.replaceChildren();const byId=new Map(comments.map(c=>[c.id,c]));
 comments.forEach(c=>{
   const author=names.get(c.author_id)||'Player', card=el('article',null,'comment-item profile-comment-card');
   const avatar=el('span',Array.from(author)[0]?.toUpperCase()||'P','profile-comment-avatar');avatar.setAttribute('aria-hidden','true');
   const content=el('div',null,'profile-comment-content'),head=el('div',null,'comment-header');
   head.append(link(c.author_id,author),el('time',date(c.created_at)));if(c.edited_at)head.append(el('span','edited','profile-comment-edited'));
   content.append(head);
   if(c.reply_to){const parent=byId.get(c.reply_to), quote=el('div',parent?'Replying to '+(names.get(parent.author_id)||'Player')+': '+parent.body:'Reply to an earlier comment','profile-comment-quote');content.append(quote);}
   const body=el('p',c.body);content.append(body);
   const menu=el('details',null,'profile-comment-menu'),summary=el('summary','⋯');summary.setAttribute('aria-label','Comment actions');menu.append(summary);const actions=el('div',null,'profile-comment-actions');
   if(viewer)actions.append(commentAction('Reply',()=>{menu.open=false;chooseReply(c,author);}));
   actions.append(commentAction('Copy text',async()=>{try{await navigator.clipboard.writeText(c.body);status.textContent='Comment copied.';}catch(_){status.textContent='Could not copy text. Please select and copy it manually.';}menu.open=false;}));
   if(viewer?.id===c.author_id)actions.append(commentAction('Edit',()=>{
     menu.open=false;editingComment=c.id;const edit=el('form',null,'profile-comment-edit'),field=el('textarea');field.value=c.body;field.maxLength=1000;field.required=true;field.setAttribute('aria-label','Edit comment');
     const save=el('button','Save','btn'),cancel=el('button','Cancel','btn ghost');save.type='submit';cancel.type='button';
     cancel.addEventListener('click',()=>{editingComment=null;commentSignature='';renderComments(comments,names,role);});
     edit.addEventListener('submit',async e=>{e.preventDefault();const value=field.value.trim();if(!value)return;save.disabled=true;try{const result=await query(client.from('profile_comments').update({body:value}).eq('id',c.id).select('id'));if(!result?.length)throw Error('Not permitted');editingComment=null;commentSignature='';await refreshComments();}catch(_){status.textContent='Could not edit this comment. Please try again.';save.disabled=false;}});
     edit.append(field,save,cancel);body.replaceWith(edit);field.focus();
   }));
   if(viewer && (viewer.id===profileId || viewer.id===c.author_id || ['owner','co-owner'].includes(role?.role)))actions.append(commentAction('Delete',async()=>{try{const result=await query(client.from('profile_comments').delete().eq('id',c.id).select('id'));if(!result?.length)throw Error('Not permitted');commentSignature='';await refreshComments();}catch(_){status.textContent='Could not delete this comment. Please try again.';}}));
   menu.append(actions);card.append(avatar,content,menu);list.append(card);
 });if(!comments.length)itemMessage(list,'No messages yet.');
}
async function refreshComments(){
 if(pollBusy || document.hidden || !root.isConnected || !profileId || $('profile-view').hidden)return;
 const version=seq, refresh=++commentRefresh, id=profileId;pollBusy=true;
 try{
   const comments=await query(client.from('profile_comments').select('id,profile_id,author_id,body,created_at,reply_to,edited_at').eq('profile_id',id).order('created_at',{ascending:false}).limit(50));
   if(version===seq && refresh===commentRefresh && root.isConnected && id===profileId && !document.hidden)renderComments(comments,commentNames,commentRole);
 }catch(_){}finally{pollBusy=false;}
}
const commentTimer=setInterval(refreshComments,15000);
function refreshWhenVisible(){if(!document.hidden)refreshComments();}
function cleanupProfiles(){if(root.isConnected)return;clearInterval(commentTimer);document.removeEventListener('visibilitychange',refreshWhenVisible);document.removeEventListener('fmf-nav',cleanupProfiles);authSubscription?.data?.subscription?.unsubscribe();seq++;commentRefresh++;}
document.addEventListener('visibilitychange',refreshWhenVisible);document.addEventListener('fmf-nav',cleanupProfiles);

async function load(){
 const request=++seq; status.textContent='Getting profiles ready…';
 try{
   const people=await publicDirectory();
   if(request!==seq || !root.isConnected)return;
   const names=new Map(people.map(p=>[p.user_id,p.display_name]));
   const directory=$('profile-directory');directory.replaceChildren();
   if(!people.length)directory.append(el('p','No community profiles yet.'));
   people.forEach(p=>{const a=link(p.user_id,'');a.className='profile-creator';const avatar=el('span',Array.from(p.display_name || 'P')[0].toUpperCase(),'profile-creator-avatar');avatar.setAttribute('aria-hidden','true');const info=el('span',null,'profile-creator-info');info.append(el('strong',p.display_name || 'Player'),el('small','View profile'));const arrow=el('span','→','profile-creator-arrow');arrow.setAttribute('aria-hidden','true');a.replaceChildren(avatar,info,arrow);directory.append(a);});filterCreators();
   if(!profileId && viewer)profileId=viewer.id;
   if(!profileId){$('profile-view').hidden=true;status.textContent=people.length?'Select a creator to get started.':'Be the first to join the community.';return;}
   if(!uuid.test(profileId)){ $('profile-view').hidden=true;status.textContent='Invalid profile link.';return; }
   const person=people.find(p=>p.user_id===profileId) || await query(client.from('user_profiles').select('user_id,display_name,created_at').eq('user_id',profileId).maybeSingle());
   if(request!==seq || !root.isConnected)return;
   if(!person){$('profile-view').hidden=true;status.textContent='Profile not found.';return;}
   names.set(person.user_id,person.display_name);
   const [uploads,comments,friends,activity,role]=await Promise.all([
     query(client.from('profile_uploads').select('id,user_id,title,kind,image_data,created_at').eq('user_id',profileId).order('created_at',{ascending:false}).limit(50)),
     query(client.from('profile_comments').select('id,profile_id,author_id,body,created_at,reply_to,edited_at').eq('profile_id',profileId).order('created_at',{ascending:false}).limit(50)),
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
     if(!relation)action.append(friendButton('Add friend',()=>query(client.from('profile_friendships').insert({recipient:profileId})),'add'));
     else if(relation.accepted)action.append(el('span','Friends'),friendButton('Remove friend',()=>query(client.from('profile_friendships').delete().eq('id',relation.id)),'remove'));
     else if(relation.recipient===viewer.id)action.append(friendButton('Accept request',()=>query(client.rpc('accept_friend_request',{request_id:relation.id})),'accept'),friendButton('Decline',()=>query(client.from('profile_friendships').delete().eq('id',relation.id)),'remove'));
     else action.append(el('span','Friend request sent'),friendButton('Cancel request',()=>query(client.from('profile_friendships').delete().eq('id',relation.id)),'remove'));
   }
   const friendList=$('profile-friends');friendList.replaceChildren();const accepted=friends.filter(f=>f.accepted);$('profile-friend-count').textContent=accepted.length+' '+(accepted.length===1?'friend':'friends');
   accepted.forEach(f=>{const id=f.requester===profileId?f.recipient:f.requester;friendList.append(link(id,names.get(id)||'View friend'));});
   if(own){const pending=friends.filter(f=>!f.accepted && f.recipient===viewer.id);pending.forEach(f=>{const row=el('div',null,'profile-pending');row.append(link(f.requester,names.get(f.requester)||'Friend request'),friendButton('Accept',()=>query(client.rpc('accept_friend_request',{request_id:f.id})),'accept'),friendButton('Decline',()=>query(client.from('profile_friendships').delete().eq('id',f.id)),'remove'));friendList.append(row);});}
   const gallery=$('profile-uploads');gallery.replaceChildren();
   uploads.forEach(u=>{if(!safeImage(u.image_data))return;const card=el('article',null,'profile-upload-card');const img=el('img');img.src=u.image_data;img.alt=u.title;img.loading='lazy';card.append(img,el('strong',u.title),el('small',u.kind==='skin'?'Minecraft skin':'Image'));const a=el('a','Download','btn ghost');a.href=u.image_data;a.download=u.kind==='skin'?'minecraft-skin.png':'image';card.append(a);if(own || (viewer && ['owner','co-owner'].includes(role?.role)))card.append(button('Delete',()=>query(client.from('profile_uploads').delete().eq('id',u.id))));gallery.append(card);});
   if(!gallery.children.length)itemMessage(gallery,'No creations shared yet.');
   commentNames=names;commentRole=role;commentRefresh++;renderComments(comments,names,role);
   status.textContent='';
 }catch(_){if(request===seq && root.isConnected){status.replaceChildren(document.createTextNode('Could not load profiles. Check your connection and '));const retry=el('button','Try again','btn ghost');retry.type='button';retry.addEventListener('click',load);status.append(retry);}}
}
$('profile-comment-form').addEventListener('submit',async e=>{e.preventDefault();const text=$('profile-comment-text'),b=e.currentTarget.querySelector('button');if(!viewer||!text.value.trim())return;b.disabled=true;try{await query(client.from('profile_comments').insert({profile_id:profileId,body:text.value.trim(),reply_to:replyTarget}));text.value='';clearReply();await load();}catch(_){status.textContent='Could not post the comment.';}finally{b.disabled=false;}});
$('profile-upload-form').addEventListener('submit',async e=>{e.preventDefault();const f=$('profile-file').files[0],kind=$('profile-kind').value,title=$('profile-upload-title').value.trim(),b=e.currentTarget.querySelector('button');if(!viewer || viewer.id!==profileId || !f || !title)return;if(f.size>2*1024*1024 || !['image/png','image/jpeg','image/webp'].includes(f.type) || (kind==='skin'&&f.type!=='image/png')){status.textContent='Choose a PNG skin or a PNG, JPEG or WebP image under 2 MB.';return;}b.disabled=true;status.textContent='Preparing upload…';try{
 const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});
 const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});let data=src;
 if(kind==='skin' && (img.width!==64 || ![32,64].includes(img.height)))throw Error('A skin must be 64×64 or 64×32 PNG.');
 if(kind==='image'){const ratio=Math.min(1,960/img.width,960/img.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/webp',.8);if(!safeImage(data))data=canvas.toDataURL('image/jpeg',.65);}
 if(!safeImage(data))throw Error('Image is too large after processing. Try a smaller image.');await query(client.from('profile_uploads').insert({title,kind,image_data:data}));e.target.reset();$('profile-kind').value='skin';await load();
 }catch(err){status.textContent=err.message||'Could not upload the image.';}finally{b.disabled=false;}});
let authReady=false;
load();
const authSubscription=client.auth.onAuthStateChange((_event,session)=>{authReady=true;viewer=session?.user||null;setTimeout(()=>{if(root.isConnected)load();},0);});
// If session initialization stalls, show a recoverable error rather than a permanent loader.
setTimeout(()=>{if(!authReady && root.isConnected){status.replaceChildren(document.createTextNode('Sign-in is taking too long. You can still browse the player list. '));const retry=el('button','Try again','btn ghost');retry.type='button';retry.addEventListener('click',()=>location.reload());status.append(retry);}},12000);
