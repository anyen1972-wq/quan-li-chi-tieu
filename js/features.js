/**
 * features.js — Ví/tài khoản, Giao dịch định kỳ, Mục tiêu tiết kiệm,
 *               Ảnh hóa đơn, Đa tiền tệ, Xuất PDF
 */

const Features = {
  esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  },

  DEFAULT_WALLETS: [
    { id: 'cash', name: 'Tiền mặt', icon: 'fa-money-bill-wave' },
    { id: 'bank', name: 'Ngân hàng', icon: 'fa-building-columns' },
    { id: 'momo', name: 'MoMo', icon: 'fa-wallet' }
  ],

  CURRENCIES: {
    VND: { symbol: 'đ', rate: 1, locale: 'vi-VN' },
    USD: { symbol: '$', rate: 25000, locale: 'en-US' },
    EUR: { symbol: '€', rate: 27000, locale: 'de-DE' }
  },

  // ============================================================
  // WALLETS
  // ============================================================
  getWallets() {
    let wallets = Storage.get('spendwise_wallets', null);
    if (!wallets) {
      wallets = [...this.DEFAULT_WALLETS];
      Storage.set('spendwise_wallets', wallets);
    }
    return wallets;
  },

  saveWallets(wallets) {
    Storage.set('spendwise_wallets', wallets);
  },

  getWalletById(id) {
    return this.getWallets().find(w => w.id === id) || null;
  },

  addWallet(name) {
    const wallets = this.getWallets();
    wallets.push({ id: 'w_' + Utils.generateId(), name, icon: 'fa-wallet' });
    this.saveWallets(wallets);
    this.renderWalletList();
    this.renderWalletOptions();
  },

  deleteWallet(id) {
    const wallets = this.getWallets().filter(w => w.id !== id);
    this.saveWallets(wallets);
    this.renderWalletList();
    this.renderWalletOptions();
  },

  renderWalletOptions() {
    const select = document.getElementById('inputWallet');
    if (!select) return;
    select.innerHTML = this.getWallets()
      .map(w => `<option value="${w.id}">${this.esc(w.name)}</option>`).join('');
  },

  renderWalletList() {
    const container = document.getElementById('walletList');
    if (!container) return;
    container.innerHTML = this.getWallets().map(w => `
      <div class="settings-item">
        <div class="settings-item__info">
          <span class="settings-item__title"><i class="fa-solid ${w.icon}"></i> ${this.esc(w.name)}</span>
        </div>
        <button class="settings-btn settings-btn--danger" data-wallet-id="${w.id}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `).join('');
    container.querySelectorAll('[data-wallet-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.getWallets().length <= 1) {
          Toast.error('Cần ít nhất 1 ví!');
          return;
        }
        this.deleteWallet(btn.dataset.walletId);
        Toast.success('Đã xóa ví!');
      });
    });
  },

  bindWalletEvents() {
    const btnAdd = document.getElementById('btnAddWallet');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const input = document.getElementById('inputWalletName');
        const name = input.value.trim();
        if (!name) { Toast.error('Nhập tên ví!'); return; }
        this.addWallet(name);
        input.value = '';
        Toast.success('Đã thêm ví mới!');
      });
    }
  },

  // ============================================================
  // GOALS (Mục tiêu tiết kiệm)
  // ============================================================
  getGoals() {
    return Storage.get('spendwise_goals', []);
  },

  saveGoals(goals) {
    Storage.set('spendwise_goals', goals);
  },

  addGoal(name, target) {
    const goals = this.getGoals();
    goals.push({ id: 'g_' + Utils.generateId(), name, target, saved: 0 });
    this.saveGoals(goals);
    this.renderGoals();
    Toast.success('Đã thêm mục tiêu!');
  },

  addToGoal(id) {
    const amountStr = prompt('Nhập số tiền muốn nạp vào mục tiêu:');
    if (!amountStr) return;
    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''));
    if (!amount || amount <= 0) { Toast.error('Số tiền không hợp lệ!'); return; }
    const goals = this.getGoals();
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    goal.saved += amount;
    this.saveGoals(goals);
    this.renderGoals();
    Toast.success(`Đã nạp ${Utils.formatCurrency(amount)} vào "${goal.name}"!`);
  },

  deleteGoal(id) {
    ConfirmDialog.show({
      title: 'Xóa mục tiêu?',
      message: 'Bạn có chắc muốn xóa mục tiêu này?',
      onConfirm: () => {
        this.saveGoals(this.getGoals().filter(g => g.id !== id));
        this.renderGoals();
        Toast.success('Đã xóa mục tiêu!');
      }
    });
  },

  renderGoals() {
    const container = document.getElementById('goalList');
    if (!container) return;
    const goals = this.getGoals();
    if (goals.length === 0) {
      container.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:var(--space-lg)">Chưa có mục tiêu tiết kiệm nào. Thêm mục tiêu đầu tiên!</p>`;
      return;
    }
    container.innerHTML = goals.map(g => {
      const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
      return `
      <div class="goal-item">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-xs)">
          <strong>${this.esc(g.name)}</strong>
          <span style="font-size:var(--font-size-sm);color:var(--text-secondary)">${pct}%</span>
        </div>
        <div class="budget-summary__progress-bar" style="margin-bottom:var(--space-xs)">
          <div class="budget-summary__progress-fill budget-summary__progress-fill--safe" style="width:${pct}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:var(--font-size-sm)">${Utils.formatCurrency(g.saved)} / ${Utils.formatCurrency(g.target)}</span>
          <span style="display:flex;gap:var(--space-xs)">
            <button class="settings-btn" data-goal-add="${g.id}"><i class="fa-solid fa-plus"></i> Nạp</button>
            <button class="settings-btn settings-btn--danger" data-goal-del="${g.id}"><i class="fa-solid fa-trash"></i></button>
          </span>
        </div>
      </div>`;
    }).join('');
    container.querySelectorAll('[data-goal-add]').forEach(b => b.addEventListener('click', () => this.addToGoal(b.dataset.goalAdd)));
    container.querySelectorAll('[data-goal-del]').forEach(b => b.addEventListener('click', () => this.deleteGoal(b.dataset.goalDel)));
  },

  bindGoalEvents() {
    const btn = document.getElementById('btnAddGoal');
    if (btn) {
      btn.addEventListener('click', () => {
        const name = document.getElementById('inputGoalName').value.trim();
        const target = parseInt(document.getElementById('inputGoalTarget').value);
        if (!name) { Toast.error('Nhập tên mục tiêu!'); return; }
        if (!target || target <= 0) { Toast.error('Nhập số tiền mục tiêu hợp lệ!'); return; }
        this.addGoal(name, target);
        document.getElementById('inputGoalName').value = '';
        document.getElementById('inputGoalTarget').value = '';
      });
    }
  },

  // ============================================================
  // RECURRING (Giao dịch định kỳ)
  // ============================================================
  getRecurring() {
    return Storage.get('spendwise_recurring', []);
  },

  saveRecurring(list) {
    Storage.set('spendwise_recurring', list);
  },

  addRecurring(data) {
    const list = this.getRecurring();
    list.push({ id: 'r_' + Utils.generateId(), ...data, lastRun: null });
    this.saveRecurring(list);
    this.renderRecurringList();
  },

  deleteRecurring(id) {
    this.saveRecurring(this.getRecurring().filter(r => r.id !== id));
    this.renderRecurringList();
  },

  getNextDate(date, frequency) {
    const d = new Date(date);
    if (frequency === 'daily') d.setDate(d.getDate() + 1);
    else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
    else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
    return d;
  },

  processRecurring() {
    const list = this.getRecurring();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let totalCreated = 0;
    list.forEach(rule => {
      let cursor = rule.lastRun ? new Date(rule.lastRun) : new Date(rule.startDate);
      if (rule.lastRun) cursor = this.getNextDate(cursor, rule.frequency);
      let created = 0;
      while (cursor <= today && created < 365) {
        Storage.addTransaction({
          name: rule.name,
          amount: rule.amount,
          type: rule.type,
          category: rule.category,
          wallet: rule.wallet,
          date: cursor.toISOString().slice(0, 10),
          note: 'Tự động (định kỳ)'
        });
        rule.lastRun = cursor.toISOString().slice(0, 10);
        cursor = this.getNextDate(cursor, rule.frequency);
        created++;
      }
      totalCreated += created;
    });
    this.saveRecurring(list);

    if (totalCreated > 0) {
      if (typeof TransactionManager !== 'undefined') {
        TransactionManager.renderTransactions();
        TransactionManager.updateSummary();
      }
      if (typeof Toast !== 'undefined') {
        Toast.success(`Đã tự động thêm ${totalCreated} giao dịch định kỳ!`);
      }
    }
  },

  renderRecurringList() {
    const container = document.getElementById('recurringList');
    if (!container) return;
    const list = this.getRecurring();
    if (list.length === 0) {
      container.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:var(--space-md)">Chưa có giao dịch định kỳ nào.</p>`;
      return;
    }
    const freqLabel = { daily: 'Hàng ngày', weekly: 'Hàng tuần', monthly: 'Hàng tháng' };
    container.innerHTML = list.map(r => `
      <div class="settings-item">
        <div class="settings-item__info">
          <span class="settings-item__title">${this.esc(r.name)} — ${Utils.formatCurrency(r.amount)}</span>
          <span class="settings-item__desc">${freqLabel[r.frequency] || r.frequency}</span>
        </div>
        <button class="settings-btn settings-btn--danger" data-rec-del="${r.id}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>`).join('');
    container.querySelectorAll('[data-rec-del]').forEach(b => {
      b.addEventListener('click', () => {
        this.deleteRecurring(b.dataset.recDel);
        Toast.success('Đã xóa giao dịch định kỳ!');
      });
    });
  },

  // ============================================================
  // CURRENCY (Đa tiền tệ — lưu gốc bằng VNĐ, hiển thị theo lựa chọn)
  // ============================================================
  getCurrency() {
    return Storage.get('spendwise_currency', 'VND');
  },

  setCurrency(code) {
    Storage.set('spendwise_currency', code);
    if (typeof ChartManager !== 'undefined' && typeof PageManager !== 'undefined' && PageManager.currentPage === 'pageStats') {
      ChartManager.renderAllCharts();
    }
    if (typeof TransactionManager !== 'undefined') TransactionManager.renderTransactions();
    if (typeof BudgetManager !== 'undefined') {
      BudgetManager.renderBudgetList();
      BudgetManager.updateBudgetSummary();
    }
    this.renderGoals();
  },

  // ============================================================
  // RECEIPT (Ảnh hóa đơn) — nén ảnh bằng canvas, lưu base64
  // ============================================================
  handleReceiptFile(file, callback) {
    if (!file) { callback(null); return; }
    if (!file.type.startsWith('image/')) { Toast.error('Vui lòng chọn file ảnh!'); callback(null); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const max = 600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  // ============================================================
  // PDF EXPORT (in báo cáo ra PDF qua print CSS)
  // ============================================================
  exportPDF() {
    const transactions = Storage.getTransactions();
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const rows = transactions.map(t => `
      <tr>
        <td>${Utils.formatDate(t.date)}</td>
        <td>${this.esc(t.name)}</td>
        <td>${t.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}</td>
        <td style="text-align:right;color:${t.type === 'income' ? '#00C897' : '#FF6B6B'}">
          ${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}
        </td>
      </tr>`).join('');

    document.getElementById('printReport').innerHTML = `
      <h1 style="margin-bottom:4px">💰 SpendWise — Báo cáo thu chi</h1>
      <p style="color:#666;margin-bottom:16px">Ngày xuất: ${Utils.formatDate(new Date().toISOString())}</p>
      <p><strong>Tổng thu:</strong> ${Utils.formatCurrency(totalIncome)} &nbsp;|&nbsp;
         <strong>Tổng chi:</strong> ${Utils.formatCurrency(totalExpense)} &nbsp;|&nbsp;
         <strong>Số dư:</strong> ${Utils.formatCurrency(totalIncome - totalExpense)}</p>
      <table>
        <thead><tr><th>Ngày</th><th>Tên giao dịch</th><th>Loại</th><th style="text-align:right">Số tiền</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    window.print();
  },

  // ============================================================
  // INIT
  // ============================================================
  init() {
    this.renderWalletOptions();
    this.renderWalletList();
    this.bindWalletEvents();
    this.renderGoals();
    this.bindGoalEvents();
    this.renderRecurringList();
    this.processRecurring();

    // Currency select
    const currencySelect = document.getElementById('inputCurrency');
    if (currencySelect) {
      currencySelect.value = this.getCurrency();
      currencySelect.addEventListener('change', e => this.setCurrency(e.target.value));
    }

    // Receipt preview
    const receiptInput = document.getElementById('inputReceipt');
    if (receiptInput) {
      receiptInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
          this.handleReceiptFile(file, dataUrl => {
            this._pendingReceipt = dataUrl;
            const preview = document.getElementById('receiptPreview');
            preview.src = dataUrl;
            preview.style.display = 'block';
          });
        }
      });
    }

    // PDF button
    const btnPDF = document.getElementById('btnExportPDF');
    if (btnPDF) btnPDF.addEventListener('click', () => this.exportPDF());
  }
};
