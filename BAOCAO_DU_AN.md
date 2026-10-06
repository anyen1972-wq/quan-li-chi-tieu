# 📋 BÁO CÁO DỰ ÁN — SpendWise

> Ngày tạo báo cáo: 05/10/2026
> Thư mục dự án: `D:\web số 1`

---

## 1. Tổng quan dự án

**SpendWise** là một ứng dụng web dạng **Single Page Application (SPA)** dùng để quản lý chi tiêu cá nhân: theo dõi thu/chi, phân tích ngân sách theo danh mục, trực quan hóa dữ liệu bằng biểu đồ, xuất báo cáo Excel/CSV và hoạt động như một **PWA** (Progressive Web App) hỗ trợ cài đặt và chạy offline.

- Không cần build tool / npm — mở `index.html` là chạy.
- Toàn bộ dữ liệu lưu trong trình duyệt (`localStorage`), không có backend.

---

## 2. Cấu trúc thư mục

```
D:\web số 1\
├── index.html            # File chính, chứa toàn bộ markup SPA (24.9 KB)
├── manifest.json         # Cấu hình PWA (tên, icon, theme color, standalone...)
├── sw.js                 # Service Worker — cache assets, chạy offline
├── README.md             # Tài liệu mô tả dự án
├── assets/
│   ├── icon.svg          # Favicon vector
│   ├── icon-192.png      # Icon PWA 192x192
│   ├── icon-512.png      # Icon PWA 512x512 (any + maskable)
│   └── icon-original.png # Icon gốc
├── css/
│   ├── variables.css     # CSS Variables (màu, font, dark/light theme)
│   ├── style.css         # Style chính (layout, header, summary, form)
│   ├── stats.css         # Style trang Thống kê
│   ├── budget.css        # Style trang Ngân sách
│   ├── pwa.css           # Style banner cài đặt PWA, onboarding
│   ├── responsive.css    # Responsive / mobile-first
│   └── fab-fix.css       # File rỗng (0 byte) — chưa sử dụng
└── js/
    ├── app.js            # Entry point: Toast, khởi tạo app, theme toggle
    ├── utils.js          # Hàm tiện ích (format tiền VNĐ, ngày...)
    ├── storage.js        # Wrapper localStorage (transactions, theme, settings)
    ├── category.js       # Danh mục thu/chi (icon, màu, tên)
    ├── transaction.js    # CRUD giao dịch, filter, cập nhật số dư
    ├── chart.js          # Biểu đồ Chart.js (doughnut, bar, line)
    ├── budget.js         # Ngân sách theo danh mục + cảnh báo %
    ├── export.js         # Xuất XLSX/CSV, backup/restore JSON
    ├── notification.js   # Nhắc nhở ghi chép (Web Notification API)
    └── pwa.js            # Cài PWA, service worker, tour hướng dẫn, Bill Splitter
```

---

## 3. Công nghệ & thư viện

| Thành phần | Công nghệ |
|---|---|
| Frontend | HTML5, CSS3 (CSS Variables, Flexbox, Grid), Vanilla JS (ES6+) |
| Biểu đồ | Chart.js v4.4.4 (CDN jsdelivr) |
| Xuất Excel | SheetJS `xlsx.full.min.js` v0.20.0 (CDN cdn.sheetjs.com) |
| Icon | Font Awesome 6.5.0 (CDN cdnjs) |
| Font | Google Fonts — Inter |
| Lưu trữ | `localStorage` (key: `spendwise_transactions`, `spendwise_theme`, `spendwise_settings`, `spendwise_reminder_time`) |
| PWA | Web App Manifest + Service Worker (`sw.js`, cache name `spendwise-cache-v1`) |

---

## 4. Các trang (pages) trong SPA

1. **Trang Chủ** (`pageHome`) — Thẻ tổng: số dư hiện tại, tổng thu, tổng chi; danh sách giao dịch; thêm/sửa/xóa giao dịch; lọc Tất cả / Chi tiêu / Thu nhập. Có cảnh báo số dư âm.
2. **Thống Kê** (`pageStats`) — 3 biểu đồ Chart.js: biểu đồ tròn (tỷ lệ chi theo danh mục), cột kép (thu vs chi), đường (xu hướng lũy kế). Lọc theo Tuần / Tháng / Năm. Đồng bộ dark/light mode.
3. **Ngân Sách** (`pageBudget`) — Đặt hạn mức chi hàng tháng theo danh mục; thanh tiến độ + nhãn trạng thái (Ổn định / Sắp chạm hạn mức / Vượt hạn mức); toast cảnh báo khi chi ≥ 85% và ≥ 100% hạn mức.
4. **Cài Đặt** (`pageSettings`) — Đổi theme sáng/tối, hẹn giờ nhắc nhở (Notification API), xuất Excel/CSV, sao lưu/khôi phục JSON.

---

## 5. Tính năng nổi bật

- ✅ CRUD giao dịch đầy đủ với xác nhận xóa.
- ✅ 14 danh mục (8 chi tiêu + thu nhập như Lương, Freelance...).
- ✅ Dark/Light mode tự động cập nhật biểu đồ.
- ✅ PWA: cài lên màn hình chính, banner mời cài đặt, chạy offline nhờ Service Worker.
- ✅ Onboarding tour hướng dẫn lần đầu.
- ✅ Bill Splitter — chia tiền nhóm nhỏ.
- ✅ Nhắc nhở ghi chép chi tiêu qua Web Notification hẹn giờ.
- ✅ Xuất báo cáo Excel (.xlsx), CSV (UTF-8 BOM, không lỗi font tiếng Việt), backup/restore JSON.
- ✅ Mobile-first responsive.

---

## 6. Nhận xét & ghi chú

- **Điểm mạnh:** cấu trúc rõ ràng theo module (mỗi file JS một trách nhiệm), thuần vanilla nên nhẹ, chạy ngay không cần cài đặt, hỗ trợ PWA đầy đủ, giao diện tiếng Việt thân thiện.
- **Điểm cần lưu ý:**
  - `css/fab-fix.css` đang rỗng (0 byte) — có thể xóa hoặc chưa dùng.
  - Dữ liệu phụ thuộc hoàn toàn vào `localStorage` — xóa cache trình duyệt sẽ mất dữ liệu; nên nhắc người dùng backup JSON định kỳ.
  - Các thư viện CDN (Chart.js, SheetJS, Font Awesome, Google Fonts) yêu cầu Internet lần đầu tải; Service Worker cache giúp dùng lại các lần sau.
  - Không có kiểm thử tự động hay linting — có thể bổ sung nếu phát triển tiếp.

---

## 7. Cách chạy

Mở trực tiếp `D:\web số 1\index.html` trong trình duyệt (Chrome/Edge/Firefox/Safari). Để PWA (cài app, service worker) hoạt động đầy đủ, nên serve qua HTTP (ví dụ: `npx serve .` hoặc extension Live Server).
