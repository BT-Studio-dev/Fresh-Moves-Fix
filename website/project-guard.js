// Presentation-only lock: the static tool files are still publicly accessible.
(function(){
  var screen=document.getElementById('project-lock-screen');if(!screen)return;
  var root=document.documentElement, id=screen.dataset.projectGuard;
  var heading=screen.querySelector('h1'),message=screen.querySelector('p'),retry=screen.querySelector('button');
  var token=window.fmfProjectGuardToken=(window.fmfProjectGuardToken||0)+1;
  function check(){
    retry.hidden=true;heading.textContent='Checking project availability';message.textContent='Please wait…';
    var url='https://xecdvxknbdwetdlhaazl.supabase.co/rest/v1/project_card_locks?select=locked&project=eq.'+encodeURIComponent(id);
    fetch(url,{headers:{apikey:'sb_publishable_9iI-6RC8bYYDD7QRpgiycw_ZMh1HLDs'},cache:'no-store'}).then(function(response){if(!response.ok)throw new Error('Request failed');return response.json();}).then(function(rows){
      if(token!==window.fmfProjectGuardToken || !screen.isConnected)return;
      if(!Array.isArray(rows)||rows.length!==1 || typeof rows[0].locked!=='boolean')throw new Error('Missing lock setting');
      if(!rows[0].locked){root.classList.remove('project-guard-active');screen.remove();return;}
      heading.textContent='Project locked';message.textContent='This project is currently unavailable. Please check back later.';
    }).catch(function(){if(token!==window.fmfProjectGuardToken || !screen.isConnected)return;heading.textContent='Unable to check project';message.textContent='Please check your connection and try again.';retry.hidden=false;});
  }
  retry.addEventListener('click',check);check();
})();
