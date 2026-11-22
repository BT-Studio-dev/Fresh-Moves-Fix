import { createClient } from '@supabase/supabase-js';
const client=createClient('https://xecdvxknbdwetdlhaazl.supabase.co','sb_publishable_9iI-6RC8bYYDD7QRpgiycw_ZMh1HLDs');
window.FMFAuthClient=client;
const section=document.getElementById('tool-comments'), page=section.dataset.page;
const list=section.querySelector('[data-comments-list]'), form=section.querySelector('form'), input=section.querySelector('textarea'), status=section.querySelector('[data-comments-status]'), login=section.querySelector('[data-comments-login]');
let user=null, comments=[], rolesByUser=new Map(), sequence=0;
function render(){
  list.replaceChildren();
  if(!comments.length){const empty=document.createElement('p');empty.className='comments-empty';empty.textContent='No comments yet. Be the first to share your thoughts.';list.appendChild(empty);return;}
  comments.forEach(row=>{
    const card=document.createElement('article');card.className='comment-item';
    const header=document.createElement('div');header.className='comment-header';
    const name=document.createElement('strong');name.textContent=row.author_name || 'Player';header.appendChild(name);
    if(rolesByUser.has(row.author_id)){const badge=document.createElement('span');badge.className='comment-badge';badge.textContent=rolesByUser.get(row.author_id)==='owner'?'Owner':'Co-Owner';header.appendChild(badge);}
    if(row.pinned){const pinned=document.createElement('span');pinned.className='comment-pinned';pinned.textContent='Pinned';header.appendChild(pinned);}
    const time=document.createElement('time'), date=new Date(row.created_at);if(!isNaN(date)){time.dateTime=date.toISOString();time.textContent=date.toLocaleDateString();}header.appendChild(time);
    const text=document.createElement('p');text.textContent=row.body;card.append(header,text);
    const role=user && rolesByUser.get(user.id), isOwner=role==='owner', canModerate=isOwner || role==='co-owner';
    if(user && (row.author_id===user.id || canModerate)){
      const remove=document.createElement('button');remove.type='button';remove.className='comment-delete';remove.textContent='Delete';remove.setAttribute('aria-label',row.author_id===user.id?'Delete your comment':'Delete comment');remove.addEventListener('click',async()=>{
        remove.disabled=true;
        try{const {data,error}=await client.from('tool_comments').delete().eq('id',row.id).select('id');if(error || !data?.length)throw error || new Error('Not permitted');await load();}
        catch(error){status.textContent='Could not delete this comment. Please try again.';remove.disabled=false;}
      });card.appendChild(remove);
    }
    if(isOwner){const pin=document.createElement('button');pin.type='button';pin.className='comment-delete comment-pin';pin.textContent=row.pinned?'Unpin':'Pin';pin.setAttribute('aria-label',row.pinned?'Unpin comment':'Pin comment');pin.addEventListener('click',async()=>{
      pin.disabled=true;
      try{const {data,error}=await client.from('tool_comments').update({pinned:!row.pinned}).eq('id',row.id).select('id');if(error || !data?.length)throw error || new Error('Not permitted');await load();}
      catch(error){status.textContent='Could not update this comment. Please try again.';pin.disabled=false;}
    });card.appendChild(pin);}
    list.appendChild(card);
  });
}
async function load(){
  const request=++sequence;status.textContent='Loading comments…';
  try {const [result,roles]=await Promise.all([
      client.from('tool_comments').select('id,author_id,author_name,body,created_at,pinned').eq('page',page).order('pinned',{ascending:false}).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(50),
      client.from('comment_roles').select('user_id,role')
    ]);
    if(request!==sequence)return;if(result.error || roles.error)throw result.error || roles.error;comments=result.data || [];rolesByUser=new Map((roles.data || []).filter(role=>role.role==='owner' || role.role==='co-owner').map(role=>[role.user_id,role.role]));render();status.textContent=comments.length===50?'Showing up to 50 comments, pinned first.':'';
  }catch(error){if(request===sequence)status.textContent='Could not load comments. Please try again later.';}
}
function setUser(session){user=session?.user || null;form.hidden=!user;login.hidden=!!user;render();}
client.auth.onAuthStateChange((_event,session)=>setUser(session));
form.addEventListener('submit',async event=>{
  event.preventDefault();if(!user)return;const body=input.value.trim();if(!body){status.textContent='Write a comment first.';return;}
  const button=form.querySelector('button');button.disabled=true;status.textContent='Posting…';
  try{const {error}=await client.from('tool_comments').insert({page,body});if(error)throw error;input.value='';await load();}catch(error){status.textContent='Could not post your comment. Please try again.';}finally{button.disabled=false;}
});
load();
