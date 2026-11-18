(() => {
  const estimate = new URLSearchParams(location.search).get('estimate');
  const message = document.querySelector('#inquiry-form textarea[name="message"]');
  if (estimate && message && !message.value) {
    message.value = estimate.slice(0, message.maxLength);
  }
})();
