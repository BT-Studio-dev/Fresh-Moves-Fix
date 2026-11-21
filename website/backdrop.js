// Preview background only: never touches the skin canvas or exported PNG.
(function () {
  var controls = document.querySelector('.backdrop-controls');
  if (!controls) return;
  var panel = controls.closest('.panel');
  var custom = controls.querySelector('[data-backdrop-custom]');
  var key = 'fmf-editor-backdrop';
  function apply(value) {
    if (value !== 'default' && !/^#[0-9a-f]{6}$/i.test(value)) value = 'default';
    if (value === 'default') panel.style.removeProperty('--editor-backdrop');
    else { panel.style.setProperty('--editor-backdrop', value); custom.value = value; }
    controls.querySelectorAll('[data-backdrop]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-backdrop').toLowerCase() === value.toLowerCase()));
    });
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  controls.querySelectorAll('[data-backdrop]').forEach(function (button) {
    button.addEventListener('click', function () { apply(button.getAttribute('data-backdrop')); });
  });
  custom.addEventListener('input', function () { apply(custom.value); });
  custom.addEventListener('change', function () { apply(custom.value); });
  var saved = 'default'; try { saved = localStorage.getItem(key) || saved; } catch (e) {}
  apply(saved);
})();
