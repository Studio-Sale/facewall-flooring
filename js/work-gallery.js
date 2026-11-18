(() => {
  const gallery = document.getElementById('work-gallery');
  const photos = [...gallery.querySelectorAll('[data-work-photo]')];
  const dialog = gallery.querySelector('dialog');
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('#work-viewer-caption');
  let current = 0;

  function show(index) {
    current = (index + photos.length) % photos.length;
    const thumbnail = photos[current].querySelector('img');
    image.src = thumbnail.dataset.fullSrc || thumbnail.src;
    image.alt = thumbnail.alt;
    caption.textContent = thumbnail.alt + ' · ' + (current + 1) + ' / ' + photos.length;
  }

  photos.forEach((photo, index) => photo.addEventListener('click', () => {
    show(index);
    dialog.showModal();
  }));
  dialog.querySelector('.work-close').addEventListener('click', () => dialog.close());
  for (const button of dialog.querySelectorAll('[data-work-step]')) {
    button.addEventListener('click', () => show(current + Number(button.dataset.workStep)));
  }
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
})();
