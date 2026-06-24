# OneIBC BOD Executive Dashboard

Hệ thống dashboard quản trị dành cho Ban Giám đốc (BOD), hỗ trợ tổng hợp và biểu diễn dữ liệu chiến lược, tài chính và vận hành.

> 📄 Đặc tả đầy đủ: [`docs/PRD.md`](docs/PRD.md) · Mẫu nhập liệu: [`docs/google-sheet-template.md`](docs/google-sheet-template.md) · Bàn giao/vận hành: [`docs/HANDOVER.md`](docs/HANDOVER.md) · AI context (đọc nhanh cho LLM): [`/ai-context.html`](public/ai-context.html)

## 🚀 Tính năng chính
- **6 view điều hành**: Overview (Pulse / Variance / Driver), Operations (Centers & Workforce), Capital (P&L · Cash Flow · Payables), Insight Signals, Executive Briefing, Reports Library.
- **Nguồn dữ liệu linh hoạt**: Google Sheets (gần thời gian thực), file CSV, hoặc kéo–thả file `.csv` trực tiếp vào giao diện.
- **Tự động tính toán nhất quán**: Scorecard theo trọng số, EVM (SPI/CPI/EAC/VAC…), dự báo FP&A kép (Bayesian × pipeline), tổng hợp nhân sự — đều tính tại runtime từ dữ liệu thô.
- **Chạy được không cần database**: thiếu cấu hình ⇒ phục vụ dữ liệu seed tĩnh.

## 🛠 Cấu hình nguồn dữ liệu

### Cách 1 — Google Sheets (khuyên dùng)
1. **Mẫu**: import [`public/templates/OneIBC_BOD_Workbook.xlsx`](public/templates/OneIBC_BOD_Workbook.xlsx) vào Google Sheets (workbook **6 tab chủ đề**; mỗi dòng có cột `section` dạng dropdown + dòng hướng dẫn). Xem [`docs/google-sheet-template.md`](docs/google-sheet-template.md).
2. **Cấp quyền**: share "Anyone with the link → Viewer" (hoặc dùng service account cho sheet riêng tư).
3. **Lấy ID**: phần giữa `/d/` và `/edit` trong URL.
4. **Cấu hình** (`.env.local` hoặc Railway → Variables):
   ```env
   GOOGLE_SHEET_ID=your_id_here
   # tùy chọn cho sheet riêng tư:
   # GOOGLE_SERVICE_ACCOUNT_KEY={...json một dòng...}
   ```

> Workbook cũng nhận layout **1-tab-1-section** và **CSV phẳng** (một sheet, mỗi dòng có cột `section` + `period`) để tương thích ngược.

### Cách 2 — CSV
- Kéo–thả `.csv` trực tiếp vào dashboard để xem nhanh (không lưu).
- Lưu cố định: `DASHBOARD_CSV_URL=https://your-domain.com/data.csv`.

## 📊 Các `section` hợp lệ
`kpi`, `revenue_targets`, `scorecard`, `chart`, `department`, `narrative`, `risk`, `initiative`,
`operations_center`, `supply_partner`, `team_workforce`, `capital_pl`, `capital_cf`, `payable`,
`insight_signal`, `story`, `report`, `fpa_monthly`, `fpa_forecast`, `fpa_scenario`, `fpa_ci`.
Chi tiết cột theo từng section: xem [`docs/PRD.md`](docs/PRD.md) §6 và file mẫu.

## 💻 Phát triển

```bash
npm install      # cài dependencies
npm run dev      # chạy local (http://localhost:3000)
npm test         # unit test (vitest)
npm run lint     # eslint
npx tsc --noEmit # type-check
npm run build    # build production
npm run start    # chạy bản build
```

CI (GitHub Actions, `.github/workflows/ci.yml`) chạy lint + type-check + test + build trên mỗi push/PR.

## 🚂 Deploy lên Railway

Cấu hình build/start/healthcheck nằm trong [`railway.json`](railway.json) (Nixpacks; healthcheck `/api/health`).

1. **Tạo project**: Railway → *New Project* → *Deploy from GitHub repo* → chọn repo này (branch deploy: `main`).
2. **Database (tùy chọn)**: *+ New* → *Database* → *PostgreSQL*. Railway tự inject `DATABASE_URL`. Thiếu DB ⇒ app vẫn chạy, chỉ không lưu settings/log/chat.
3. **Variables** (Settings → Variables) — đặt các biến cần dùng:
   ```env
   GOOGLE_SHEET_ID=...            # nguồn dữ liệu chính
   # GOOGLE_SERVICE_ACCOUNT_KEY=  # nếu sheet riêng tư
   SETTINGS_PASSWORD=...          # bắt buộc nếu mở /settings
   SETTINGS_SECRET=...            # chuỗi ngẫu nhiên ≥32 ký tự (bắt buộc ở prod)
   # DATABASE_SSL=require         # chỉ khi dùng Postgres ngoài/proxy
   ```
   **Không** cần đặt `PORT` — Railway tự cấp và `next start` đọc tự động.
4. **Deploy**: Railway tự chạy `npm ci` → `npm run build` → `npm run start`; chờ healthcheck `/api/health` trả `200` là live.
5. **Domain**: Settings → Networking → *Generate Domain* (hoặc gắn custom domain).

> Mỗi push lên `main` ⇒ Railway tự build & deploy lại. Kiểm tra nhanh sau deploy: `GET https://<domain>/api/health`.

## 🔐 Settings console & biến môi trường
- `/settings` được bảo vệ bằng `SETTINGS_PASSWORD` (đặt thêm `SETTINGS_SECRET` ngẫu nhiên ở production).
- Postgres (`DATABASE_URL`) là **tùy chọn**: lưu override trọng số/HRMS, access log, lịch sử chat. Thiếu ⇒ chạy với mặc định, thay đổi không được lưu.
- Danh sách đầy đủ: [`.env.example`](.env.example).

## 📂 Cấu trúc thư mục
- `src/app` — routes & API (Next.js App Router).
- `src/components` — UI (`BODDashboard`, `AIChatPanel`).
- `src/lib` — logic: parser, loaders, EVM, forecast, workload, reasoning, settings, db.
- `src/types` — TypeScript definitions (`DashboardData`).
- `tests` — unit tests (vitest).
- `docs` — PRD, mẫu Google Sheet, tài liệu bàn giao.
