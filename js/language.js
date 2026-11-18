(() => {
  const english = document.documentElement.lang === 'en';
  window.facewallText = (thai, translation) => english ? translation : thai;
  window.facewallPage = page => english ? page.replace(/\.html(?=[?#]|$)/, '.en.html') : page;

  const switcher = document.querySelector('.language-switch');
  const alternate = new URL(switcher.href);
  alternate.search = location.search;
  alternate.hash = location.hash;
  switcher.href = alternate.href;

  // Preserve query changes made by interactive filters before switching.
  switcher.addEventListener('click', () => {
    alternate.search = location.search;
    alternate.hash = location.hash;
    switcher.href = alternate.href;
  });
})();
