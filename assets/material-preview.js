/* Toolbar appearance is a separate preference; photo and rating state stay intact. */
(() => {
  const key = 'photopick-toolbar-material-v1';
  const root = document.documentElement;
  let material = 'glass';
  try {
    if (['matte','glass'].includes(localStorage.getItem(key))) material = localStorage.getItem(key);
  } catch (_) {}

  const syncChoice = () => {
    document.querySelectorAll('.toolbar-material-options button[data-toolbar-material]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.toolbarMaterial === material));
    });
  };
  window.getToolbarMaterial = () => material;
  window.setToolbarMaterial = value => {
    if (value !== 'matte' && value !== 'glass') return material;
    material = value;
    root.dataset.toolbarMaterial = material;
    try { localStorage.setItem(key, material); } catch (_) {}
    syncChoice();
    return material;
  };
  root.dataset.toolbarMaterial = material;

  const baseMenu = menuSheet;
  menuSheet = function(...args) {
    baseMenu.apply(this, args);
    const sheet = layer.querySelector('.sheet[aria-label="메뉴"]');
    if (!sheet || sheet.querySelector('.toolbar-material-setting')) return;
    const section = document.createElement('section');
    section.className = 'toolbar-material-setting';
    section.setAttribute('aria-labelledby', 'toolbar-material-heading');
    section.innerHTML = '<h4 id="toolbar-material-heading">버튼 스타일</h4>' +
      '<p>사진에 어울리는 버튼 스타일을 골라보세요.</p>' +
      '<div class="toolbar-material-options" role="group" aria-label="버튼 스타일">' +
      '<button type="button" data-toolbar-material="matte" aria-pressed="false">무광</button>' +
      '<button type="button" data-toolbar-material="glass" aria-pressed="false">유리</button></div>';
    const close = sheet.querySelector('#close-sheet');
    if (close) close.before(section); else sheet.appendChild(section);
    section.querySelectorAll('[data-toolbar-material]').forEach(button => {
      button.onclick = () => window.setToolbarMaterial(button.dataset.toolbarMaterial);
    });
    syncChoice();
  };
  // Existing menu callbacks were bound before this final script loaded.
  // Rebind controls without redrawing the screen or changing the current photo.
  bind();
})();
