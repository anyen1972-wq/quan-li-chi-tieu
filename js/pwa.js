/**
 * pwa.js — Quản lý PWA (Cài đặt app, Service Worker), Tour hướng dẫn & Chia tiền nhóm
 */

const PWAManager = {
  deferredPrompt: null,

  init() {
    this.registerServiceWorker();
    this.handleInstallPrompt();
    this.initOnboarding();
    this.initBillSplitter();
  },

  /**
   * Đăng ký Service Worker
   */
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('✅ Service Worker đăng ký thành công:', reg.scope);
          })
          .catch((err) => {
            console.log('ℹ️ Service Worker (bỏ qua khi chạy qua file:// local):', err.message);
          });
      });
    }
  },

  /**
   * Bắt sự kiện cài đặt PWA
   */
  handleInstallPrompt() {
    const banner = document.getElementById('pwaInstallBanner');
    const installBtn = document.getElementById('pwaInstallBtn');
    const closeBtn = document.getElementById('pwaCloseBtn');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;

      // Kiểm tra nếu người dùng chưa từng tắt banner
      const dismissed = sessionStorage.getItem('spendwise_pwa_dismissed');
      if (!dismissed && banner) {
        banner.style.display = 'flex';
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!this.deferredPrompt) {
          Toast.show('Để cài đặt: Bấm dấu 3 chấm trên trình duyệt và chọn "Cài đặt ứng dụng"', 'warning');
          return;
        }
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          Toast.success('Cảm ơn bạn đã cài đặt SpendWise!');
        }
        this.deferredPrompt = null;
        if (banner) banner.style.display = 'none';
      });
    }

    if (closeBtn && banner) {
      closeBtn.addEventListener('click', () => {
        banner.style.display = 'none';
        sessionStorage.setItem('spendwise_pwa_dismissed', 'true');
      });
    }
  },

  /**
   * Tour giới thiệu ứng dụng cho người dùng mới
   */
  initOnboarding() {
    const overlay = document.getElementById('onboardingOverlay');
    const btn = document.getElementById('onboardingNextBtn');
    const dots = document.querySelectorAll('.onboarding-dot');
    const steps = document.querySelectorAll('.onboarding-step');

    if (!overlay || !btn) return;

    // Kiểm tra xem đã từng xem tour chưa
    const seen = Storage.get('spendwise_onboarded', false);
    if (!seen) {
      setTimeout(() => {
        overlay.classList.add('active');
      }, 500);
    }

    let currentStep = 0;
    const totalSteps = steps.length;

    btn.addEventListener('click', () => {
      currentStep++;
      if (currentStep < totalSteps) {
        steps.forEach((s, idx) => s.classList.toggle('active', idx === currentStep));
        dots.forEach((d, idx) => d.classList.toggle('active', idx === currentStep));

        if (currentStep === totalSteps - 1) {
          btn.textContent = 'Bắt đầu sử dụng ngay 🚀';
        }
      } else {
        // Hoàn tất
        overlay.classList.remove('active');
        Storage.set('spendwise_onboarded', true);
        Toast.success('Chào mừng bạn đến với SpendWise!');
      }
    });
  },

  /**
   * Công cụ Chia tiền nhóm (Bill Splitter)
   */
  initBillSplitter() {
    const modal = document.getElementById('splitterModal');
    const openBtn = document.getElementById('btnOpenSplitter');
    const closeBtn = document.getElementById('splitterCloseBtn');
    const inputTotal = document.getElementById('splitterTotalAmount');
    const inputPeople = document.getElementById('splitterPeopleCount');
    const inputNote = document.getElementById('splitterMealNote');
    const perPersonEl = document.getElementById('splitterPerPerson');
    const copyBtn = document.getElementById('splitterCopyBtn');

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    }

    const calculate = () => {
      const total = parseInt(inputTotal.value) || 0;
      const count = parseInt(inputPeople.value) || 1;
      const perPerson = Math.ceil(total / count);
      perPersonEl.textContent = Utils.formatCurrency(perPerson);
    };

    if (inputTotal && inputPeople) {
      inputTotal.addEventListener('input', calculate);
      inputPeople.addEventListener('input', calculate);
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const total = parseInt(inputTotal.value) || 0;
        const count = parseInt(inputPeople.value) || 1;
        const note = inputNote.value.trim() || 'Bữa ăn';
        const perPerson = Math.ceil(total / count);

        const text = `💸 TIN NHẮN CHIA TIỀN: ${note}\n━━━━━━━━━━━━━━\n• Tổng tiền: ${Utils.formatCurrency(total)}\n• Số người: ${count} người\n👉 Mỗi người chuyển: ${Utils.formatCurrency(perPerson)}\n━━━━━━━━━━━━━━\n(Tính tự động bằng SpendWise 💰)`;

        navigator.clipboard.writeText(text).then(() => {
          Toast.success('Đã copy tin nhắn chia tiền vào clipboard! Dán gửi Zalo/Messenger ngay nhé.');
        }).catch(() => {
          Toast.show('Không thể tự động copy, bạn vui lòng copy thủ công', 'warning');
        });
      });
    }
  }
};
