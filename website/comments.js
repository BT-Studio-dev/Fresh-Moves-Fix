import { createClient } from '@supabase/supabase-js';
const client=createClient('https://xecdvxknbdwetdlhaazl.supabase.co','sb_publishable_9iI-6RC8bYYDD7QRpgiycw_ZMh1HLDs');
window.FMFAuthClient=client;
const section=document.getElementById('tool-comments'), page=section.dataset.page;
const list=section.querySelector('[data-comments-list]'), form=section.querySelector('form'), input=section.querySelector('textarea'), status=section.querySelector('[data-comments-status]'), login=section.querySelector('[data-comments-login]');
let user=null, comments=[], rolesByUser=new Map(), sequence=0;
const imageInput=section.querySelector('#comment-image'), preview=section.querySelector('[data-comment-preview]');
let imageData=null, imageSequence=0;
const validImage=value=>typeof value==='string' && value.length<=180000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
imageInput.addEventListener('change',()=>{
  const request=++imageSequence, file=imageInput.files[0]; imageData=null; preview.hidden=true; preview.removeAttribute('src');
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>2*1024*1024){status.textContent='Choose a PNG, JPEG or WebP image under 2 MB.';imageInput.value='';return;}
  const reader=new FileReader();reader.onerror=()=>{if(request===imageSequence)status.textContent='Could not read the image.';};
  reader.onload=()=>{const img=new Image();img.onerror=()=>{if(request===imageSequence)status.textContent='Could not read the image.';};img.onload=()=>{
    if(request!==imageSequence)return;
    try {const scale=Math.min(1,960/img.width,960/img.height), canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      let data=canvas.toDataURL('image/webp',.8);if(!validImage(data) || data.length>180000)data=canvas.toDataURL('image/jpeg',.65);
      if(!validImage(data))throw Error('too large');imageData=data;preview.src=data;preview.hidden=false;status.textContent='';
    }catch(error){imageInput.value='';status.textContent='Image is too large or could not be processed. Try a smaller image.';}
  };img.src=reader.result;};reader.readAsDataURL(file);
});
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
    if(validImage(row.image_data)){const image=document.createElement('img');image.className='comment-image';image.src=row.image_data;image.alt='Image attached to comment by '+(row.author_name || 'Player');image.loading='lazy';card.appendChild(image);}
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
async function load(silent=false){
  const request=++sequence;if(!silent)status.textContent='Loading comments…';
  try {const [result,roles]=await Promise.all([
      client.from('tool_comments').select('id,author_id,author_name,body,created_at,pinned,image_data').eq('page',page).order('pinned',{ascending:false}).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(50),
      client.from('comment_roles').select('user_id,role')
    ]);
    if(request!==sequence || !section.isConnected)return;if(result.error || roles.error)throw result.error || roles.error;comments=result.data || [];rolesByUser=new Map((roles.data || []).filter(role=>role.role==='owner' || role.role==='co-owner').map(role=>[role.user_id,role.role]));render();status.textContent=comments.length===50?'Showing up to 50 comments, pinned first.':'';
  }catch(error){if(request===sequence && !silent && section.isConnected)status.textContent='Could not load comments. Please try again later.';}
}
function setUser(session){user=session?.user || null;form.hidden=!user;login.hidden=!!user;render();}
const authSubscription=client.auth.onAuthStateChange((_event,session)=>setUser(session));
// Refresh in visible tabs without a persistent socket or polling hidden pages.
const refreshTimer=setInterval(()=>{if(section.isConnected && !document.hidden)load(true);},15000);
function refreshOnReturn(){if(section.isConnected && !document.hidden)load(true);}
function cleanupComments(){if(section.isConnected)return;clearInterval(refreshTimer);document.removeEventListener('visibilitychange',refreshOnReturn);document.removeEventListener('fmf-nav',cleanupComments);authSubscription?.data?.subscription?.unsubscribe();sequence++;}
document.addEventListener('visibilitychange',refreshOnReturn);document.addEventListener('fmf-nav',cleanupComments);
form.addEventListener('submit',async event=>{
  event.preventDefault();if(!user)return;const body=input.value.trim();if(!body){status.textContent='Write a comment first.';return;}
  if(imageInput.files.length && !imageData){status.textContent='Wait for the image to finish processing or choose another image.';return;}
  const button=form.querySelector('button');button.disabled=true;imageInput.disabled=true;status.textContent='Posting…';
  try{const {error}=await client.from('tool_comments').insert(imageData ? {page,body,image_data:imageData} : {page,body});if(error)throw error;input.value='';imageInput.value='';imageData=null;imageSequence++;preview.hidden=true;preview.removeAttribute('src');await load();}catch(error){status.textContent='Could not post your comment. Please try again.';}finally{button.disabled=false;imageInput.disabled=false;}
});
load();
