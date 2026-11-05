/**
 * PW MedEd - Progressive Web App Installer & Fullscreen Controller
 * Handles Service Worker registration, 'beforeinstallprompt' install triggers,
 * and full-screen launch states across Android, iOS, and Desktop browsers.
 */

class PwaInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.init();
  }

  init() {
    this.checkStandaloneState();
    this.registerServiceWorker();
    this.bindInstallPromptEvents();
    this.injectInstallUI();
  }

  checkStandaloneState() {
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isFullscreen || isStandalone) {
      this.isInstalled = true;
      document.documentElement.classList.add('is-pwa-fullscreen', 'is-pwa-standalone');
      console.log('[PWA] Running in native fullscreen standalone app mode.');
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('[PWA] Service Worker registered successfully (scope: ' + registration.scope + ')');
          })
          .catch((error) => {
            console.warn('[PWA] Service Worker registration error:', error.message);
          });
      });
    }
  }

  bindInstallPromptEvents() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent automatic mini-infobar on mobile Chrome
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('[PWA] Browser install option ready.');
      this.showInstallUI();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isInstalled = true;
      this.hideInstallUI();
      console.log('[PWA] Application successfully installed to home screen.');
    });
  }

  injectInstallUI() {
    // If running in full screen, no need to show in-app install prompt
    if (this.isInstalled) return;

    // Check if install button container already exists in DOM
    if (document.getElementById('pwaInstallHeaderBtn')) return;

    // Add a floating install banner on mobile if installable
    const banner = document.createElement('div');
    banner.id = 'pwaMobileInstallBanner';
    banner.className = 'hidden fixed top-3 left-3 right-3 sm:left-auto sm:right-4 z-50 p-2.5 sm:p-3 bg-[#2d4d37] text-white rounded-2xl shadow-2xl border border-[#4a7c59] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300';
    banner.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0">
        <img src="/icons/icon-192.png" alt="PW MedEd" class="w-8 h-8 rounded-xl shadow-xs shrink-0" />
        <div class="min-w-0">
          <div class="font-headline font-bold text-xs leading-tight truncate">Install PW MedEd App</div>
          <div class="text-[10.5px] text-[#8ecf9e] truncate">Fast full-screen mobile experience</div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button id="pwaTriggerInstallBtn" type="button" class="px-3 py-1.5 rounded-xl bg-white text-[#2d4d37] font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition-all">
          Install
        </button>
        <button id="pwaDismissInstallBtn" type="button" class="w-7 h-7 rounded-lg text-white/70 hover:text-white flex items-center justify-center cursor-pointer" title="Dismiss">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwaTriggerInstallBtn')?.addEventListener('click', () => {
      this.promptInstall();
    });

    document.getElementById('pwaDismissInstallBtn')?.addEventListener('click', () => {
      banner.classList.add('hidden');
      sessionStorage.setItem('pw_meded_pwa_dismissed', 'true');
    });
  }

  showInstallUI() {
    if (this.isInstalled) return;
    if (sessionStorage.getItem('pw_meded_pwa_dismissed') === 'true') return;

    const banner = document.getElementById('pwaMobileInstallBanner');
    if (banner) {
      banner.classList.remove('hidden');
    }

    // Also look for any install button placed in header navigation
    const headerBtn = document.getElementById('pwaInstallHeaderBtn');
    if (headerBtn) {
      headerBtn.classList.remove('hidden');
      headerBtn.onclick = () => this.promptInstall();
    }
  }

  hideInstallUI() {
    const banner = document.getElementById('pwaMobileInstallBanner');
    if (banner) banner.classList.add('hidden');

    const headerBtn = document.getElementById('pwaInstallHeaderBtn');
    if (headerBtn) headerBtn.classList.add('hidden');
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      // If deferredPrompt is unavailable (e.g. iOS Safari), show instructions
      const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIos) {
        alert("To install PW MedEd on iOS:\n1. Tap the Share button (square with arrow) at the bottom.\n2. Scroll down and tap 'Add to Home Screen'.\n3. Tap 'Add' to launch in full screen!");
      } else {
        alert("To install PW MedEd:\nOpen the browser menu (⋮ at top right) and select 'Install app' or 'Add to Home screen'.");
      }
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);
    this.deferredPrompt = null;
    this.hideInstallUI();
  }
}

// Global auto-instantiation
if (typeof window !== 'undefined') {
  window.pwaInstaller = new PwaInstaller();
}

export default PwaInstaller;
