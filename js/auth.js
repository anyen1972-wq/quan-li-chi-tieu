/**
 * auth.js — Đăng ký / Đăng nhập / Đăng xuất tài khoản (Firebase Auth)
 *           và đồng bộ dữ liệu lên Firestore
 */

const AuthManager = {
  currentUser: null,
  auth: null,
  db: null,
  _pushTimer: null,

  DATA_KEYS: [
    'spendwise_transactions',
    'spendwise_budgets',
    'spendwise_wallets',
    'spendwise_goals',
    'spendwise_recurring',
    'spendwise_currency',
    'spendwise_theme',
    'spendwise_reminder_time'
  ],

  isConfigured() {
    return typeof FIREBASE_CONFIG !== 'undefined' && !!FIREBASE_CONFIG.apiKey;
  },

  init() {
    const overlay = document.getElementById('authOverlay');

    if (!this.isConfigured() || typeof firebase === 'undefined') {
      // Chưa cấu hình Firebase → chạy ở chế độ local như cũ
      if (overlay) overlay.classList.remove('active');
      return;
    }

    firebase.initializeApp(FIREBASE_CONFIG);
    this.auth = firebase.auth();
    this.db = firebase.firestore();

    // Cho phép Firestore chạy offline & tự đồng bộ khi online
    try {
      this.db.enablePersistence({ synchronizeTabs: true });
    } catch (e) {
      // Tab này có thể đang ở nhiều tab cùng lúc — bỏ qua
      console.warn('Firestore persistence:', e.code);
    }

    this.auth.onAuthStateChanged(async user => {
      this.currentUser = user;
      if (user) {
        if (overlay) overlay.classList.remove('active');
        this.updateAccountUI(user);

        // Đổi tài khoản → xóa dữ liệu cũ của tài khoản trước trên máy này
        const storedUid = localStorage.getItem('spendwise_uid');
        if (storedUid && storedUid !== user.uid) {
          this.DATA_KEYS.forEach(key => localStorage.removeItem(key));
        }
        localStorage.setItem('spendwise_uid', user.uid);

        await this.pullFromCloud();
        Toast.success(`Chào mừng ${user.email}!`);
      } else {
        this.updateAccountUI(null);
      }
    });

    const loginBtn = document.getElementById('authLoginBtn');
    const registerBtn = document.getElementById('authRegisterBtn');
    const logoutBtn = document.getElementById('btnLogout');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.signIn());
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.signOut());
    }

    const openAuthBtn = document.getElementById('btnOpenAuth');
    if (openAuthBtn) {
      openAuthBtn.addEventListener('click', () => this.openAuthOverlay());
    }

    const googleBtn = document.getElementById('authGoogleBtn');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => this.signInWithGoogle());
    }

    // Nhấn Enter trong ô tài khoản/mật khẩu = đăng nhập
    ['authEmail', 'authPassword'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.signIn();
          }
        });
      }
    });

    // Nhấn Enter trong form đăng ký = tạo tài khoản
    ['registerName', 'registerPassword', 'registerPassword2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.signUp();
          }
        });
      }
    });

    // Chuyển sang giao diện đăng ký
    document.querySelectorAll('.pw-eye').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        if (!target) return;
        const isHidden = target.type === 'password';
        target.type = isHidden ? 'text' : 'password';
        btn.innerHTML = isHidden
          ? '<i class="fa-solid fa-eye-slash"></i>'
          : '<i class="fa-solid fa-eye"></i>';
      });
    });

    const regBtn = document.getElementById('authRegisterBtn');
    if (regBtn) {
      regBtn.addEventListener('click', () => {
        document.getElementById('authRegisterOverlay').classList.add('active');
      });
    }
    const backBtn = document.getElementById('registerBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        document.getElementById('authRegisterOverlay').classList.remove('active');
      });
    }

    const closeBtn = document.getElementById('registerCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('authRegisterOverlay').classList.remove('active');
      });
    }

    // Bấm vùng nền xám cũng tắt form đăng ký
    const regOverlay = document.getElementById('authRegisterOverlay');
    if (regOverlay) {
      regOverlay.addEventListener('click', (e) => {
        if (e.target === regOverlay) regOverlay.classList.remove('active');
      });
    }
    const regSubmit = document.getElementById('registerSubmitBtn');
    if (regSubmit) {
      regSubmit.addEventListener('click', () => this.signUp());
    }
  },

  async signUp() {
    const username = document.getElementById('registerName').value.trim();
    const email = username.includes('@') ? username : username + '@spendwise.app';
    const password = document.getElementById('registerPassword').value;
    const password2 = document.getElementById('registerPassword2').value;

    if (!username) { Toast.error('Vui lòng nhập tên đăng nhập!'); return; }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) { Toast.error('Tên đăng nhập không được có dấu/khoảng trắng!'); return; }
    if (!password || password.length < 6) { Toast.error('Mật khẩu tối thiểu 6 ký tự!'); return; }
    if (password !== password2) { Toast.error('Hai mật khẩu không khớp!'); return; }

    try {
      const cred = await this.auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: username });
      Toast.success(`Tạo tài khoản "${username}" thành công!`);
      document.getElementById('authRegisterOverlay').classList.remove('active');
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        document.getElementById('registerNameError').style.display = 'block';
        Toast.error('Đăng ký thất bại: Tên đăng nhập đã được đăng ký!');
      } else {
        Toast.error('Đăng ký thất bại: ' + this.friendlyError(e));
      }
    }
  },

  /**
   * Đăng nhập bằng tài khoản Google
   */
  async signInWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await this.auth.signInWithPopup(provider);
    } catch (e) {
      Toast.error('Đăng nhập Google thất bại: ' + this.friendlyError(e));
    }
  },

  getCredentials() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || !email.includes('@')) { Toast.error('Email không hợp lệ!'); return null; }
    if (!password || password.length < 6) { Toast.error('Mật khẩu tối thiểu 6 ký tự!'); return null; }
    return { email, password };
  },

  async signIn() {
    const rawId = document.getElementById('authEmail').value.trim();
    const email = rawId.includes('@') ? rawId : rawId + '@spendwise.app';
    const password = document.getElementById('authPassword').value;
    if (!rawId) { Toast.error('Vui lòng nhập tên tài khoản!'); return null; }
    if (!password || password.length < 6) { Toast.error('Mật khẩu tối thiểu 6 ký tự!'); return null; }
    try {
      await this.auth.signInWithEmailAndPassword(email, password);
    } catch (e) {
      Toast.error('Đăng nhập thất bại: ' + this.friendlyError(e));
    }
  },

  async signOut() {
    await this.auth.signOut();
    Toast.success('Đã đăng xuất!');
  },

  friendlyError(e) {
    const map = {
      'auth/user-not-found': 'Tên đăng nhập không tồn tại!',
      'auth/wrong-password': 'Sai mật khẩu!',
      'auth/email-already-in-use': 'Tên đăng nhập đã được đăng ký!',
      'auth/invalid-email': 'Email không hợp lệ!',
      'auth/weak-password': 'Mật khẩu quá yếu (tối thiểu 6 ký tự)!',
      'auth/invalid-credential': 'Tên đăng nhập không tồn tại hoặc sai mật khẩu!',
      'auth/too-many-requests': 'Thử quá nhiều lần, vui lòng thử lại sau!'
    };
    return map[e.code] || e.message;
  },

  updateAccountUI(user) {
    const emailEl = document.getElementById('accountEmail');
    if (emailEl) {
      emailEl.textContent = user
        ? (user.displayName ? `${user.displayName} — ${user.email}` : user.email)
        : 'Chưa đăng nhập';
    }
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) logoutBtn.style.display = user ? '' : 'none';
    const openAuthBtn = document.getElementById('btnOpenAuth');
    if (openAuthBtn) openAuthBtn.style.display = user ? 'none' : '';
  },

  openAuthOverlay() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.classList.add('active');
  },

  userDoc() {
    return this.db.collection('users').doc(this.currentUser.uid).collection('data').doc('main');
  },

  /**
   * Tải dữ liệu từ cloud về ghi đè localStorage rồi render lại UI
   */
  async pullFromCloud() {
    if (!this.currentUser) return;
    try {
      const doc = await this.userDoc().get();
      if (doc.exists) {
        const data = doc.data();
        this.DATA_KEYS.forEach(key => {
          if (key in data) {
            const val = data[key];
            localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
          }
        });
        this.rerender();
        Toast.success('Đã tải dữ liệu từ đám mây!');
      } else {
        // Tài khoản mới → đẩy dữ liệu local hiện có lên cloud
        await this.pushToCloud();
      }
    } catch (e) {
      console.error(e);
      Toast.error('Không tải được dữ liệu đám mây (có thể đang offline).');
    }
  },

  /**
   * Đẩy toàn bộ dữ liệu local lên Firestore
   */
  async pushToCloud() {
    if (!this.currentUser) return;
    const payload = {};
    this.DATA_KEYS.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { payload[key] = JSON.parse(raw); } catch { payload[key] = raw; }
      }
    });
    payload.updatedAt = new Date().toISOString();
    await this.userDoc().set(payload);
  },

  /**
   * Debounce push mỗi khi dữ liệu đổi
   */
  schedulePush() {
    if (!this.currentUser) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => {
      this.pushToCloud().then(() => {
        Toast.success('Đã lưu lên đám mây!');
      }).catch(() => {});
    }, 1500);
  },

  rerender() {
    if (typeof TransactionManager !== 'undefined') {
      TransactionManager.renderTransactions();
      TransactionManager.updateSummary();
    }
    if (typeof BudgetManager !== 'undefined') {
      BudgetManager.renderBudgetList();
      BudgetManager.updateBudgetSummary();
    }
    if (typeof Features !== 'undefined') {
      Features.renderWalletList();
      Features.renderWalletOptions();
      Features.renderGoals();
      Features.renderRecurringList();
    }
    if (typeof ChartManager !== 'undefined' && typeof PageManager !== 'undefined' && PageManager.currentPage === 'pageStats') {
      ChartManager.renderAllCharts();
    }
  }
};

