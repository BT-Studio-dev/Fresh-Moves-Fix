// Presentation-only lock: the static tool files are still publicly accessible.
(function(){
  var screen=document.getElementById('project-lock-screen');if(!screen)return;
  screen.dataset.guardStarted='1';
  var root=document.documentElement, id=screen.dataset.projectGuard;
  var heading=screen.querySelector('h1'),message=screen.querySelector('p'),retry=screen.querySelector('button');
  var token=window.fmfProjectGuardToken=(window.fmfProjectGuardToken||0)+1;
  var attempt=0;
  function check(){
    var current=++attempt, timer;
    retry.hidden=true;heading.textContent='Checking project availability';message.textContent='Please wait…';
    var url='https://xecdvxknbdwetdlhaazl.supabase.co/rest/v1/project_card_locks?select=locked&project=eq.'+encodeURIComponent(id);
    // Include response body parsing in the deadline, and handle synchronous fetch errors too.
    var request=Promise.resolve().then(function(){return fetch(url,{headers:{apikey:'sb_publishable_9iI-6RC8bYYDD7QRpgiycw_ZMh1HLDs'},cache:'no-store'});}).then(function(response){if(!response.ok)throw new Error('Request failed');return response.json();});
    var timeout=new Promise(function(_,reject){timer=setTimeout(function(){reject(new Error('Request timed out'));},8000);});
    Promise.race([request,timeout]).then(function(rows){
      if(current!==attempt || token!==window.fmfProjectGuardToken || !screen.isConnected)return;
      if(!Array.isArray(rows)||rows.length!==1 || typeof rows[0].locked!=='boolean')throw new Error('Missing lock setting');
      if(!rows[0].locked){root.classList.remove('project-guard-active');screen.remove();return;}
      heading.textContent='Project locked';message.textContent='This project is currently unavailable. Please check back later.';
    }).catch(function(){if(current!==attempt || token!==window.fmfProjectGuardToken || !screen.isConnected)return;heading.textContent='Unable to check project';message.textContent='Please check your connection and try again.';retry.hidden=false;}).finally(function(){clearTimeout(timer);});
  }
  retry.addEventListener('click',check);check();
})();
