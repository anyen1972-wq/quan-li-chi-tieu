/**
 * export.js — Xuất dữ liệu Excel (XLSX/CSV) và Sao lưu / Phục hồi JSON
 */

const ExportManager = {
  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Export Excel
    const btnExcel = document.getElementById('btnExportExcel');
    if (btnExcel) {
      btnExcel.addEventListener('click', () => this.exportToExcel());
    }

    // Backup JSON
    const btnBackup = document.getElementById('btnBackupJSON');
    if (btnBackup) {
      btnBackup.addEventListener('click', () => this.backupJSON());
    }

    // Restore JSON input
    const inputRestore = document.getElementById('inputRestoreJSON');
    if (inputRestore) {
      inputRestore.addEventListener('change', (e) => this.restoreJSON(e));
    }

    // Clear all data
    const btnClear = document.getElementById('btnClearAllData');
    if (btnClear) {
      btnClear.addEventListener('click', () => this.clearAllData());
    }
  },

  /**
   * Xuất danh sách giao dịch ra file Excel (.xlsx) bằng SheetJS
   */
  exportToExcel() {
    const transactions = Storage.getTransactions();
    if (transactions.length === 0) {
      Toast.error('Chưa có giao dịch nào để xuất file!');
      return;
    }

    if (typeof XLSX === 'undefined') {
      Toast.error('Thư viện Excel đang tải, vui lòng thử lại sau vài giây!');
      return;
    }

    // Chuẩn bị dữ liệu hiển thị tiếng Việt rõ ràng
    const rows = transactions.map((t, index) => {
      const cat = Categories.getById(t.category);
      return {
        'STT': index + 1,
        'Ngày': Utils.formatDate(t.date),
        'Loại giao dịch': t.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
        'Danh mục': cat ? cat.name : 'Khác',
        'Tên giao dịch': t.name,
        'Số tiền (VNĐ)': t.amount,
        'Ghi chú': t.note || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Căn chỉnh độ rộng cột tự động
    const colWidths = [
      { wch: 6 },  // STT
      { wch: 14 }, // Ngày
      { wch: 16 }, // Loại
      { wch: 16 }, // Danh mục
      { wch: 25 }, // Tên
      { wch: 16 }, // Số tiền
      { wch: 25 }  // Ghi chú
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'GiaoDich');

    const fileName = `SpendWise_BaoCao_${Utils.getToday()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    Toast.success('Đã xuất file Excel thành công!');
  },

  /**
   * Xuất ra CSV
   */
  exportToCSV() {
    const transactions = Storage.getTransactions();
    if (transactions.length === 0) {
      Toast.error('Chưa có giao dịch nào để xuất CSV!');
      return;
    }

    const headers = ['STT,Ngày,Loại,Danh mục,Tên giao dịch,Số tiền (VNĐ),Ghi chú'];
    const rows = transactions.map((t, idx) => {
      const cat = Categories.getById(t.category);
      const name = `"${(t.name || '').replace(/"/g, '""')}"`;
      const note = `"${(t.note || '').replace(/"/g, '""')}"`;
      return `${idx + 1},${Utils.formatDate(t.date)},${t.type === 'income' ? 'Thu nhập' : 'Chi tiêu'},${cat ? cat.name : 'Khác'},${name},${t.amount},${note}`;
    });

    // Thêm UTF-8 BOM để Excel hiển thị đúng tiếng Việt có dấu
    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SpendWise_GiaoDich_${Utils.getToday()}.csv`;
    link.click();
    Toast.success('Đã xuất file CSV thành công!');
  },

  /**
   * Sao lưu toàn bộ cấu hình & giao dịch ra file JSON
   */
  backupJSON() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      transactions: Storage.getTransactions(),
      budgets: BudgetManager.getBudgets(),
      theme: Storage.getTheme()
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SpendWise_Backup_${Utils.getToday()}.json`;
    link.click();
    Toast.success('Đã tải xuống file sao lưu!');
  },

  /**
   * Khôi phục dữ liệu từ file JSON
   */
  restoreJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.transactions || !Array.isArray(data.transactions)) {
          throw new Error('Định dạng dữ liệu không hợp lệ!');
        }

        ConfirmDialog.show({
          title: 'Khôi phục dữ liệu?',
          message: `File sao lưu gồm ${data.transactions.length} giao dịch. Dữ liệu hiện tại sẽ được thay thế hoàn toàn.`,
          confirmText: 'Khôi phục ngay',
          onConfirm: () => {
            Storage.saveTransactions(data.transactions);
            if (data.budgets) {
              Storage.set(BudgetManager.STORAGE_KEY, data.budgets);
            }
            if (data.theme) {
              Storage.setTheme(data.theme);
              ThemeManager.applyTheme(data.theme);
            }

            TransactionManager.renderTransactions();
            TransactionManager.updateSummary();
            BudgetManager.renderBudgetList();
            BudgetManager.updateBudgetSummary();

            Toast.success('Khôi phục dữ liệu thành công!');
          }
        });
      } catch (err) {
        Toast.error('Không thể đọc file sao lưu: ' + err.message);
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  },

  /**
   * Xóa toàn bộ dữ liệu ứng dụng
   */
  clearAllData() {
    ConfirmDialog.show({
      title: 'Xóa toàn bộ dữ liệu?',
      message: 'Mọi giao dịch và cài đặt ngân sách sẽ bị xóa sạch và không thể hoàn tác!',
      confirmText: 'Xóa toàn bộ',
      onConfirm: () => {
        Storage.remove(Storage.KEYS.TRANSACTIONS);
        Storage.remove(BudgetManager.STORAGE_KEY);
        TransactionManager.renderTransactions();
        TransactionManager.updateSummary();
        BudgetManager.renderBudgetList();
        BudgetManager.updateBudgetSummary();
        Toast.warning('Đã xóa sạch toàn bộ dữ liệu!');
      }
    });
  }
};
