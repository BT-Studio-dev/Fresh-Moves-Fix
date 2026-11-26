import { createClient } from '@supabase/supabase-js';
const client=createClient('https://xecdvxknbdwetdlhaazl.supabase.co','sb_publishable_9iI-6RC8bYYDD7QRpgiycw_ZMh1HLDs');
window.FMFAuthClient=client;
const cards=Array.from(document.querySelectorAll('[data-project-card]'));
const panel=document.getElementById('project-lock-admin'), controls=document.getElementById('project-lock-controls'), status=document.getElementById('project-lock-status');
const projects=[['pack','Fresh Moves Fix'],['minecraft-skins','Minecraft Skins'],['paint','Skin Painter 3D'],['editor','Skin eye editor'],['pfp','Minecraft PFP Maker'],['creator','Minecraft Creator Studio'],['title','Minecraft Title'],['animation','Minecraft Animation']];
let locks=new Map(), owner=false, authVersion=0, loaded=false, loadFailed=false;
const showLocked=document.getElementById('show-locked-projects');
const visibilityStatus=document.getElementById('project-visibility-status');
const visibilityKey='fmf-show-locked-projects';
if(showLocked){
  const visibilityControls=document.getElementById('project-visibility-controls');
  if(visibilityControls)visibilityControls.hidden=false;
  try{showLocked.checked=localStorage.getItem(visibilityKey)!=='off';}catch(_){}
  showLocked.addEventListener('change',()=>{
    try{localStorage.setItem(visibilityKey,showLocked.checked?'on':'off');}catch(_){}
    renderVisibility();
  });
}
cards.forEach(card=>{card.dataset.link=card.getAttribute('href');card.dataset.originalLabel=card.querySelector('.project-link-label').innerHTML;});
function renderVisibility(){
  if(!showLocked)return;
  let hidden=0;
  cards.forEach(card=>{
    const hide=loaded && !showLocked.checked && locks.get(card.dataset.projectCard)===true;
    card.hidden=hide;
    if(hide)hidden++;
  });
  if(!visibilityStatus)return;
  if(!loaded) visibilityStatus.textContent=loadFailed?'Lock status unavailable; all projects are shown.':'Checking project lock status…';
  else if(hidden===cards.length && hidden) visibilityStatus.textContent='All projects are locked. Turn on Show locked projects to see them.';
  else if(hidden) visibilityStatus.textContent=`${hidden} locked ${hidden===1?'project is':'projects are'} hidden.`;
  else visibilityStatus.textContent='';
}
function render(){
  renderVisibility();
  cards.forEach(card=>{
    const locked=locks.get(card.dataset.projectCard)===true, label=card.querySelector('.project-link-label');
    card.classList.toggle('project-locked',locked);
    if(locked){card.removeAttribute('href');card.setAttribute('aria-disabled','true');label.textContent='Locked';}
    else{card.setAttribute('href',card.dataset.link);card.removeAttribute('aria-disabled');label.innerHTML=card.dataset.originalLabel;}
  });
  if(!panel || !controls)return;
  controls.replaceChildren();panel.hidden=!owner;
  if(!owner || !loaded)return;
  projects.forEach(([id,name])=>{
    const locked=locks.get(id)===true;
    const row=document.createElement('div');row.className='project-lock-row';
    const title=document.createElement('span');title.textContent=name;
    const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=locked?'Unlock':'Lock';button.setAttribute('aria-label',(locked?'Unlock ':'Lock ')+title.textContent);
    button.addEventListener('click',async()=>{
      button.disabled=true;status.textContent='Saving…';
      try{const {data,error}=await client.from('project_card_locks').update({locked:!locked}).eq('project',id).select('project,locked');if(error || !data?.length)throw error || new Error('Not permitted');locks.set(id,data[0].locked);render();status.textContent=title.textContent+(data[0].locked?' locked.':' unlocked.');}
      catch(error){status.textContent='Could not update this project. Please try again.';button.disabled=false;}
    });row.append(title,button);controls.appendChild(row);
  });
}
async function load(){try{const {data,error}=await client.from('project_card_locks').select('project,locked');if(error)throw error;locks=new Map((data||[]).map(row=>[row.project,row.locked]));loaded=true;loadFailed=false;render();status.textContent='';}catch(error){loadFailed=true;renderVisibility();status.textContent='Could not load project lock settings. Links may not reflect their current status.';}}
if(panel)client.auth.onAuthStateChange((_event,session)=>{
  const version=++authVersion;owner=false;render();
  if(session?.user) setTimeout(async()=>{try{const {data,error}=await client.from('comment_roles').select('role').eq('user_id',session.user.id).maybeSingle();if(version!==authVersion)return;owner=!error && data?.role==='owner';render();}catch(_){}},0);
});
renderVisibility();
load();
