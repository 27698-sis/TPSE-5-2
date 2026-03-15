if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('App lista para usar offline', reg))
      .catch(err => console.log('Error al registrar Service Worker', err));
  });
}
