// Site-wide help menu; reinitialised after in-site navigation.
(function () {
  var root = document.getElementById('site-help'); if (!root) return;
  var toggle = root.querySelector('.site-help-toggle'), card = root.querySelector('.site-help-card');
  var close = root.querySelector('.site-help-close');
  function setOpen(open, focus) {
    card.hidden = !open; toggle.setAttribute('aria-expanded', String(open));
    if (focus) (open ? close : toggle).focus();
  }
  toggle.addEventListener('click', function () { setOpen(card.hidden, false); });
  close.addEventListener('click', function () { setOpen(false, true); });
  function onKey(e) { if (e.key === 'Escape' && !card.hidden) { e.preventDefault(); setOpen(false, true); } }
  function onClick(e) { if (!card.hidden && !root.contains(e.target)) setOpen(false, false); }
  function cleanup() { if (root.isConnected) return; document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); document.removeEventListener('fmf-nav', cleanup); }
  document.addEventListener('keydown', onKey); document.addEventListener('click', onClick); document.addEventListener('fmf-nav', cleanup);
})();
