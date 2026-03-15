// Registro de Service Worker para funcionamiento offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('App lista para uso offline'))
            .catch(err => console.error('Error al registrar SW', err));
    });
}

let deferredPrompt;
const installCard = document.getElementById('install-card');
const installButton = document.getElementById('install-button');
const closeButton = document.getElementById('close-install');

// Captura el evento de instalación que envía el navegador
window.addEventListener('beforeinstallprompt', (e) => {
    // Evita que el navegador muestre el cartel automático
    e.preventDefault();
    // Guarda el evento para usarlo después
    deferredPrompt = e;
    
    // Muestra la tarjeta 3 segundos después de que cargue la web
    setTimeout(() => {
        if (installCard) installCard.classList.remove('hidden');
    }, 3000);
});

// Acción al presionar el botón de instalación
if (installButton) {
    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Muestra el prompt oficial del sistema (Android/PC)
            deferredPrompt.prompt();
            
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`El usuario eligió: ${outcome}`);
            
            // Limpia la variable y oculta la tarjeta
            deferredPrompt = null;
            installCard.classList.add('hidden');
        } else {
            // Plan B: Si el evento no se capturó, instruye al alumno
            alert("Para instalar: Abrí el menú de tu navegador (los tres puntos) y elegí 'Instalar aplicación' o 'Agregar a pantalla de inicio'.");
        }
    });
}

// Botón para cerrar la tarjeta sin instalar
if (closeButton) {
    closeButton.addEventListener('click', () => {
        installCard.classList.add('hidden');
    });
}

// Ocultar si ya se instaló
window.addEventListener('appinstalled', () => {
    console.log('¡App instalada con éxito!');
    if (installCard) installCard.classList.add('hidden');
    deferredPrompt = null;
});
