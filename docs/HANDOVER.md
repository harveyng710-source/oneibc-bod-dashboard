# HANDOVER — OneIBC BOD Dashboard

Tài liệu bàn giao cho team Dev/Tech. Mô hình mục tiêu: **SaaS single-tenant nội bộ** (1 tổ chức OneIBC). Đọc kèm [`PRD.md`](PRD.md).

---

## 1. Tóm tắt trạng thái production-readiness

| Hạng mục | Trạng thái |
|---|---|
| Kiến trúc, type safety, fallback nguồn dữ liệu | ✅ Tốt |
| Tính dẫn xuất runtime (EVM/scorecard/forecast/HRMS) | ✅ Nhất quán, có test |
| Unit test (parser/evm/forecast/workload/settings) | ✅ 24 test, `npm test` |
| CI (lint + type-check + test + build) | ✅ `.github/workflows/ci.yml` |
| Bảo mật endpoint (upload size-cap, SSRF gate, headers, timing-safe auth) | ✅ Đã vá (xem §4) |
| Security headers cơ bản | ✅ Có (CSP để follow-up) |
| Observability (error monitoring tập trung) | ⚠️ Mới có console + access_logs (DB) |
| Rate limiting | ⚠️ Chưa có (đề xuất §6) |
| DB migration tool | ⚠️ `CREATE IF NOT EXISTS`, chưa có tool |
| Multi-tenant (nhiều org/RBAC/billing) | ❌ Không áp dụng cho single-tenant |

→ **Đủ điều kiện bàn giao** cho mô hình single-tenant nội bộ. Các mục ⚠️ là *nên có*, không chặn deploy; xem backlog §6.

---

## 2. Kiến trúc 1 phút

```
Google Sheet (6 tab) / CSV / static
        │  googleSheets.ts · csvParser.ts
        ▼
dataLoader.ts ──(ưu tiên Sheets→CSV→static)──► DashboardData
        │  + applyWeightOverrides / applyHrmsOverrides (settings, nếu có DB)
        ▼
page.tsx (server) ─► BODDashboard (client)  ◄─ evm/forecast/workload/aiReasoning (tính tại render)
```

- **Stateless về dữ liệu nghiệp vụ**: không có DB cho số liệu — đọc từ Sheet mỗi lần (cache ~5'). DB (tùy chọn) chỉ giữ settings/log/chat.
- **Nguyên tắc vàng**: không lưu giá trị dẫn xuất; mọi chỉ số tính lại từ primitive.

---

## 3. Chạy & kiểm thử cục bộ

```bash
npm install
npm run dev        # http://localhost:3000  (chưa cấu hình ENV ⇒ dùng seed tĩnh)
npm test           # vitest (24 test)
npm run lint
npx tsc --noEmit
npm run build && npm run start
```

Test xoay quanh các lớp **pure** trong `src/lib` (giá trị bắt regression cao nhất). Khi thêm/đổi rule parse hay công thức, **bổ sung test tương ứng** trong `tests/`.

---

## 4. Bảo mật — đã xử lý trong đợt bàn giao

| Vấn đề | Trước | Sau |
|---|---|---|
| `POST /api/upload-csv` | Unauth, không giới hạn size | Cap **2 MB** + chặn nội dung phình to (413). Không ghi state nên giữ public cho UX xem nhanh. |
| `GET /api/dashboard?source=…&url=…` | **SSRF**: fetch URL tùy ý, unauth | Tham số `?source`/`?url` chỉ chạy khi **đã đăng nhập Settings**; load mặc định (env) vẫn public. |
| Security headers | Không có | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS` (`next.config.ts`). |
| Settings auth | So sánh chuỗi thường + secret default ẩn | `timingSafeEqual` cho password & cookie; **cảnh báo** nếu thiếu `SETTINGS_SECRET`. |

**Bắt buộc khi lên production**: đặt `SETTINGS_PASSWORD` mạnh **và** `SETTINGS_SECRET` ngẫu nhiên ≥32 ký tự.

---

## 5. Vận hành (runbook)

- **Đổi dữ liệu**: sửa Google Sheet → tự cập nhật sau ~5 phút (revalidate 300s). Cần ngay: redeploy hoặc xoá cache CDN.
- **Sự cố nguồn dữ liệu**: app **tự fallback** Sheets→CSV→static, không trắng màn hình. Kiểm log server (`[dataLoader]`).
- **Quên/đổi mật khẩu Settings**: đổi `SETTINGS_PASSWORD` trong Variables → session cũ tự vô hiệu (token đổi theo password).
- **Bật/tắt lưu trữ**: thêm/xoá `DATABASE_URL`. Schema tự tạo lần chạy đầu (`db.ts`).
- **Deploy (Railway)**: thêm Postgres plugin (inject `DATABASE_URL`); `next start` đọc `PORT` tự động. Nội bộ không cần SSL; proxy ngoài đặt `DATABASE_SSL=require`.

### Biến môi trường (xem `.env.example`)
`GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_SHEET_TAB`, `DASHBOARD_CSV_URL`, `DATABASE_URL`, `DATABASE_SSL`, `SETTINGS_PASSWORD`, `SETTINGS_SECRET`.

---

## 6. Backlog đề xuất (không chặn bàn giao)

**Nên làm sớm**
- Rate-limit cho `/api/upload-csv` & `/api/settings/auth` (vd token bucket theo IP, hoặc middleware Edge).
- Error monitoring tập trung (Sentry/Logtail) thay cho `console.*`.
- Validate **schema** body khi ghi settings (vd `zod`) — hiện chỉ lọc theo key, chưa kiểm shape value.
- `Content-Security-Policy` (cần tinh chỉnh cho inline style/script của Next).
- Endpoint `/api/health` cho readiness/liveness probe.

**Trung hạn**
- Công cụ migration DB (drizzle/prisma/node-pg-migrate) thay `CREATE IF NOT EXISTS`.
- Nâng AI Chat & Executive Brief lên LLM thật qua "adapter seam" có sẵn (`aiReasoning.ts`, dùng `apiKey` đã mask).
- Hỗ trợ upload `.xlsx` (convert server-side) bên cạnh `.csv`.
- E2E test (Playwright) cho luồng view chính.

**Nếu chuyển sang multi-tenant** (ngoài phạm vi hiện tại): tenant isolation dữ liệu, RBAC nhiều vai trò, onboarding/billing, audit per-tenant — đây là một khối công việc riêng, lập roadmap khi cần.

---

## 7. Mở rộng — checklist khi thêm chỉ số/section mới

1. `src/types/dashboard.ts` — thêm/khai báo kiểu.
2. `src/lib/csvParser.ts` — thêm `case` trong `buildFromRows` (theo mẫu upsert hiện có).
3. `src/lib/googleSheets.ts` — gán section vào tab (THEMED_TABS / TAB_SECTION) nếu cần.
4. `src/lib/metricDocs.ts` — thêm tooltip (what/logic/dataFlow).
5. `src/components/BODDashboard.tsx` — render.
6. `tests/` — thêm unit test cho rule mới.
7. Cập nhật `public/templates/OneIBC_BOD_Workbook.xlsx`, `docs/PRD.md`, README.
