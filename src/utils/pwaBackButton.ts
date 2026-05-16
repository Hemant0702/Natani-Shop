export function initPWABackButton() {
  // Only apply in standalone PWA mode
  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone // for iOS safari
  ) {
    let backPressedOnce = false;
    let toastTimeout: any;

    // Push an initial sentinel state
    window.history.pushState({ pwaRoot: true }, '');

    window.addEventListener('popstate', (e) => {
      // If we popped and hit our sentinel (or there's no state but we know we are at root)
      if (e.state?.pwaRoot || !e.state) {
        // Re-push the sentinel immediately to prevent browser from exiting
        window.history.pushState({ pwaRoot: true }, '');

        if (backPressedOnce) {
          // Exit the app if pressed twice within 2 seconds
          window.close(); // Note: window.close() might not work on all mobile browsers
          // If close() fails, we just don't do anything, OS will handle it if possible.
          return;
        }

        backPressedOnce = true;
        
        // Show a custom toast using DOM since we're outside React's lifecycle here
        // or just use a simple alert-like UI. We'll append a tiny toast to body.
        const toast = document.createElement('div');
        toast.textContent = 'Press back again to exit';
        toast.style.position = 'fixed';
        toast.style.bottom = '100px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        toast.style.color = 'white';
        toast.style.padding = '8px 16px';
        toast.style.borderRadius = '20px';
        toast.style.fontSize = '12px';
        toast.style.fontWeight = 'bold';
        toast.style.zIndex = '9999';
        toast.style.transition = 'opacity 0.3s ease';
        toast.id = 'pwa-back-toast';

        // Remove old toast if exists
        const oldToast = document.getElementById('pwa-back-toast');
        if (oldToast) oldToast.remove();

        document.body.appendChild(toast);

        toastTimeout = setTimeout(() => {
          backPressedOnce = false;
          if (toast.parentNode) {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
          }
        }, 2000);
      }
    });
  }
}
