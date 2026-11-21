// The browser retains control of editable elements, links, images, and canvases.
(function () {
  'use strict';
  if (window.__fmfContextCleanup) window.__fmfContextCleanup();
  var menu = document.createElement('div');
  menu.className = 'fmf-context-menu'; menu.hidden = true;
  menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Page actions');
  menu.innerHTML = '<button type="button" role="menuitem" data-action="save"><span>Save page as…</span><small>Ctrl+S</small></button>' +
    '<button type="button" role="menuitem" data-action="print"><span>Print</span><small>Ctrl+P</small></button>' +
    '<button type="button" role="menuitem" data-action="copy"><span>Copy page link</span></button>' +
    '<button type="button" role="menuitem" data-action="top"><span>Back to top</span></button>' +
    '<p class="fmf-context-hint">Shift + right-click for browser menu</p>';
  var notice = document.createElement('div'); notice.className = 'fmf-context-notice'; notice.hidden = true;
  notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite');
  document.body.appendChild(menu); document.body.appendChild(notice);
  var items = Array.prototype.slice.call(menu.querySelectorAll('button')), timer;
  function hide(restore) { if (menu.hidden) return; menu.hidden = true; if (restore && previousFocus && previousFocus.isConnected) previousFocus.focus(); }
  var previousFocus = null;
  function showNotice(text) { notice.textContent = text; notice.hidden = false; clearTimeout(timer); timer = setTimeout(function () { notice.hidden = true; }, 5000); }
  function open(e) {
    var target = e.target;
    if (e.defaultPrevented || e.shiftKey || !target || !target.closest || target.closest('a, button, input, textarea, select, option, canvas, img, video, audio, [contenteditable]:not([contenteditable="false"]), .fmf-context-menu')) { hide(false); return; }
    var selected = window.getSelection && window.getSelection();
    if (selected && !selected.isCollapsed) { hide(false); return; }
    e.preventDefault(); previousFocus = document.activeElement;
    menu.hidden = false; menu.style.left = '0px'; menu.style.top = '0px';
    var width = menu.offsetWidth, height = menu.offsetHeight;
    menu.style.left = Math.max(4, Math.min(e.clientX, window.innerWidth - width - 4)) + 'px';
    menu.style.top = Math.max(4, Math.min(e.clientY, window.innerHeight - height - 4)) + 'px';
    items[0].focus();
  }
  function closeOutside(e) { if (!menu.hidden && !menu.contains(e.target)) hide(false); }
  function keys(e) {
    if (menu.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); hide(true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); var i = items.indexOf(document.activeElement);
      i = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[i].focus();
    }
  }
  function click(e) {
    var item = e.target.closest('button[data-action]'); if (!item) return;
    var action = item.getAttribute('data-action'); hide(true);
    if (action === 'print') window.print();
    else if (action === 'save') showNotice('Press Ctrl+S (or Command+S on Mac) to save this page using your browser.');
    else if (action === 'top') window.scrollTo(0, 0);
    else if (action === 'copy') {
      if (!navigator.clipboard || !navigator.clipboard.writeText) { showNotice('Copy the address from your browser’s address bar.'); return; }
      try { navigator.clipboard.writeText(location.href).then(function () { showNotice('Page link copied.'); }, function () { showNotice('Could not copy. Use the address bar instead.'); }); }
      catch (err) { showNotice('Could not copy. Use the address bar instead.'); }
    }
  }
  document.addEventListener('contextmenu', open);
  document.addEventListener('pointerdown', closeOutside);
  document.addEventListener('keydown', keys);
  window.addEventListener('resize', hide);
  window.addEventListener('scroll', hide, true);
  menu.addEventListener('click', click);
  window.__fmfContextCleanup = function () {
    document.removeEventListener('contextmenu', open); document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', keys);
    window.removeEventListener('resize', hide); window.removeEventListener('scroll', hide, true);
    clearTimeout(timer); menu.remove(); notice.remove();
  };
})();
