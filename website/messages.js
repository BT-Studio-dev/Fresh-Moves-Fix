import { createClient } from '@supabase/supabase-js';
const client=window.FMFAuthClient || createClient('https://xecdvxknbdwetdlhaazl.supabase.co','sb_publishable_9iI-6RC8bYYDD7QRpgiycw_ZMh1HLDs');
window.FMFAuthClient=client;
const $=id=>document.getElementById(id), root=$('messages-page'), status=$('dm-status'), form=$('dm-form'), text=$('dm-text');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const elem=(tag,value,cls)=>{const n=document.createElement(tag);if(value!=null)n.textContent=value;if(cls)n.className=cls;return n;};
let user=null, selected=new URL(location.href).searchParams.get('to'), messages=[], names=new Map(), blocks=new Set(), version=0, inFlight=false, queued=false;
if(!uuid.test(selected || ''))selected=null;
async function query(q){let timer;try{const result=await Promise.race([Promise.resolve(q),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Timed out')),12000);})]);if(result.error)throw result.error;return result.data;}finally{clearTimeout(timer);}}
function render(){
 const list=$('dm-conversations');list.replaceChildren();const ids=[...new Set(messages.map(m=>m.sender_id===user.id?m.recipient_id:m.sender_id))];
 if(selected && !ids.includes(selected))ids.unshift(selected);
 if(!ids.length)list.append(elem('p','No conversations yet.'));
 ids.forEach(id=>{const b=elem('button',names.get(id)||'Player','btn ghost');b.type='button';b.setAttribute('aria-pressed',String(id===selected));b.addEventListener('click',()=>{selected=id;text.value='';history.replaceState(history.state,'','?to='+encodeURIComponent(id));render();});list.append(b);});
 const thread=$('dm-thread');thread.hidden=!selected || selected===user.id;if(thread.hidden)return;
 $('dm-title').textContent='Messages with '+(names.get(selected)||'Player');const blocked=blocks.has(selected);$('dm-block').textContent=blocked?'Unblock':'Block';
 form.hidden=blocked;const view=$('dm-list');view.replaceChildren();const rows=messages.filter(m=>(m.sender_id===selected || m.recipient_id===selected)).slice().reverse();
 if(!rows.length)view.append(elem('p','No messages yet.'));
 rows.forEach(m=>{const card=elem('article',null,'dm-message'),head=elem('div',null,'comment-header'),date=new Date(m.created_at);head.append(elem('strong',m.sender_id===user.id?'You':(names.get(m.sender_id)||'Player')),elem('time',isNaN(date)?'':date.toLocaleString()));card.append(head,elem('p',m.body));view.append(card);});
}
async function load(silent=false){
 if(!user || !root.isConnected)return;if(inFlight){queued=true;return;}inFlight=true;const seq=++version, current=user.id;
 if(!silent)status.textContent='Loading messages…';
 try{
  const [rows,blocked]=await Promise.all([query(client.from('direct_messages').select('id,sender_id,recipient_id,body,created_at').or('sender_id.eq.'+current+',recipient_id.eq.'+current).order('created_at',{ascending:false}).limit(200)),query(client.from('message_blocks').select('blocked_id'))]);
  const ids=[...new Set((rows||[]).flatMap(m=>[m.sender_id,m.recipient_id]).concat(selected||[]))].filter(id=>uuid.test(id));
  const people=ids.length?await query(client.from('user_profiles').select('user_id,display_name').in('user_id',ids)):[];
  if(seq!==version || !root.isConnected || user?.id!==current)return;
  messages=rows||[];blocks=new Set((blocked||[]).map(b=>b.blocked_id));names=new Map((people||[]).map(p=>[p.user_id,p.display_name]));render();status.textContent=messages.length===200?'Showing up to 200 recent messages.':'';
 }catch(_){if(seq===version && !silent)status.textContent='Could not load messages. Please try again later.';}finally{inFlight=false;if(queued && root.isConnected){queued=false;setTimeout(()=>load(),0);}}
}
form.addEventListener('submit',async e=>{
 e.preventDefault();const body=text.value.trim(), recipient=selected, sender=user?.id;if(!body || !recipient || !sender || blocks.has(recipient))return;
 const b=form.querySelector('button');b.disabled=true;status.textContent='Sending…';
 try{await query(client.from('direct_messages').insert({recipient_id:recipient,body}));if(user?.id===sender && selected===recipient){if(text.value.trim()===body)text.value='';await load();}else status.textContent='Message sent.';}
 catch(_){status.textContent='Could not send the message. The recipient may be unavailable, or you may need to wait before sending again.';}finally{b.disabled=false;}
});
$('dm-block').addEventListener('click',async e=>{const id=selected;if(!user || !id)return;const b=e.currentTarget;b.disabled=true;try{if(blocks.has(id))await query(client.from('message_blocks').delete().eq('blocked_id',id));else await query(client.from('message_blocks').insert({blocked_id:id}));await load();}catch(_){status.textContent='Could not update the block. Please try again.';}finally{b.disabled=false;}});
const subscription=client.auth.onAuthStateChange((_event,session)=>{const next=session?.user||null;if(user && next?.id===user.id)return;version++;user=next;messages=[];names=new Map();blocks=new Set();text.value='';$('dm-conversations').replaceChildren();$('dm-list').replaceChildren();$('dm-thread').hidden=true;$('dm-app').hidden=!user;$('dm-login').hidden=!!user;if(user){if(selected===user.id)selected=null;setTimeout(()=>load(),0);}else{status.textContent='';$('dm-conversations').replaceChildren();$('dm-list').replaceChildren();}});
const timer=setInterval(()=>{if(!document.hidden)load(true);},15000);
function visible(){if(!document.hidden)load(true);}
function cleanup(){if(root.isConnected)return;version++;clearInterval(timer);document.removeEventListener('visibilitychange',visible);document.removeEventListener('fmf-nav',cleanup);subscription?.data?.subscription?.unsubscribe();}
document.addEventListener('visibilitychange',visible);document.addEventListener('fmf-nav',cleanup);
