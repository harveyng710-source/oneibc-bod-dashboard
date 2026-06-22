# OneIBC BOD Executive Dashboard

Hệ thống dashboard quản trị dành cho Ban Giám đốc (BOD), hỗ trợ tổng hợp và biểu diễn dữ liệu chiến lược, tài chính và vận hành.

## 🚀 Tính năng chính
- **8 View chuyên sâu**: Overview, Strategic Health, Enterprise Risk, Financials, Forecast, Initiatives, Management Stories, Reports Library.
- **Nguồn dữ liệu linh hoạt**: Hỗ trợ Google Sheets (thời gian thực), file CSV, hoặc kéo thả trực tiếp file vào giao diện.
- **Tự động tính toán**: Tự động tính Scorecard theo trọng số, tính Delta vs Target, và xu hướng.

## 🛠 Hướng dẫn cấu hình dữ liệu

### Cách 1: Sử dụng Google Sheets (Khuyên dùng)
1. **Chuẩn bị Sheet**: Tạo một Google Sheet với cấu trúc các cột sau:
   `section, period, metric, value, target, pct, trend, severity, owner, label, status, progress, sentiment, summary, thread, time, updated, framework, desc, q, actual, base, weight, spark, pillar, name, council, accountable`
2. **Cấp quyền**: Chia sẻ Sheet ở chế độ "Anyone with the link can view".
3. **Lấy ID**: Copy ID của Sheet từ URL (đoạn mã nằm giữa `/d/` và `/edit`).
4. **Cấu hình**: Thêm vào file `.env.local`:
   ```env
   GOOGLE_SHEET_ID=your_id_here
   ```

### Cách 2: Sử dụng CSV
- Bạn có thể kéo thả file `.csv` trực tiếp vào dashboard để cập nhật dữ liệu tạm thời.
- Để lưu cố định, cấu hình URL CSV trong `.env.local`:
  ```env
  DASHBOARD_CSV_URL=https://your-domain.com/data.csv
  ```

## 📊 Cấu trúc Header CSV/Sheet
Dữ liệu được tổ chức theo từng "Section". Dưới đây là các giá trị hợp lệ cho cột `section`:
- `kpi`: Các chỉ số tài chính chính (revenue, gp, ebitda, forecast_base, forecast_target).
- `scorecard`: Các chỉ số thành phần của 4 trụ cột (financial, customer, operational, technology).
- `risk`: Danh sách rủi ro doanh nghiệp.
- `initiative`: Tiến độ các sáng kiến chiến lược.
- `department`: Phân rã GP theo phòng ban.
- `narrative`: Các ghi chú từ Ban điều hành.
- `story`: Các câu chuyện quản trị/cập nhật quan trọng.
- `report`: Danh mục báo cáo.

## 💻 Hướng dẫn chạy dự án

### Cài đặt
```bash
npm install
```

### Chạy Local (Development)
```bash
npm run dev
```

### Build Production
```bash
npm run build
npm run start
```

## 📂 Cấu trúc thư mục
- `src/app`: Routes và API (Next.js App Router).
- `src/components`: UI Components chính.
- `src/lib`: Logic xử lý dữ liệu (Parsers, Loaders, Helpers).
- `src/types`: TypeScript definitions.
