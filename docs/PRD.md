# PRD — OneIBC BOD Dashboard

> **Tài liệu**: Product Requirements Document (đặc tả sản phẩm)
> **Phạm vi**: Bảng điều khiển điều hành (Board of Directors / Executive) cho OneIBC
> **Trạng thái**: phản ánh đúng codebase hiện tại (Next.js App Router + React + Recharts, dữ liệu từ Google Sheet/CSV/static, tùy chọn Postgres)
> **Ngôn ngữ hiển thị**: Tiếng Việt (số liệu/đơn vị $M)

---

## 1. Mục tiêu & bối cảnh

### 1.1. Vấn đề
Ban điều hành cần một bức tranh **một-màn-hình** về sức khỏe doanh nghiệp: doanh thu/biên lợi nhuận so với mục tiêu, tiến độ sáng kiến (theo chuẩn EVM), rủi ro, nhân sự/chi phí, dòng tiền/công nợ, và dự báo FP&A — **mà không phải chờ** một team lead ngồi soạn báo cáo. Dữ liệu đến từ nhiều nguồn (Salesforce, HRMS, Kế toán/ERP) nên cần một **lớp nhập liệu đơn giản** cho nhân viên không chuyên kỹ thuật.

### 1.2. Mục tiêu sản phẩm
- **G1 — "Drop-in bất kỳ lúc nào"**: Exec mở dashboard là thấy ngay bản tóm tắt điều hành được tổng hợp tự động (rule-based brief).
- **G2 — Spoon-feed nhập liệu**: nhân viên điền **Google Sheet theo mẫu** (workbook nhiều tab, có dropdown + dòng hướng dẫn), không cần hiểu cấu trúc JSON.
- **G3 — Số liệu nhất quán**: mọi chỉ số dẫn xuất (EVM, điểm scorecard, tổng hợp nhân sự, forecast) **được tính tại runtime** từ dữ liệu thô — không lưu giá trị dẫn xuất nên không bao giờ "lệch nhau".
- **G4 — Không phụ thuộc hạ tầng nặng**: chạy được **không cần** database; Postgres chỉ là tùy chọn để lưu override/log/chat.
- **G5 — Minh bạch**: mỗi chỉ số có tooltip (what / logic / dataFlow) để người xem hiểu con số đến từ đâu.

### 1.3. Ngoài phạm vi (Non-goals)
- Không phải hệ thống ghi sổ kế toán / nguồn sự thật tài chính (đó là ERP/Salesforce).
- AI Chat & Executive Brief hiện là **rule-based / mock** (xem §9), chưa gọi LLM thật — đã chừa "adapter seam" để nâng cấp.
- Không có phân quyền người dùng nhiều cấp; chỉ có **một password gate** cho khu Settings.

---

## 2. Người dùng & use case

| Persona | Nhu cầu chính | Màn hình chính |
|---|---|---|
| **Board / CEO / Exec** | Sức khỏe tổng thể, variance, rủi ro, brief điều hành | Overview · Insight · Briefing |
| **CFO / FP&A** | Doanh thu/GP/EBITDA vs target & forecast, dòng tiền, công nợ, kịch bản P50/P80 | Capital · Overview · FP&A |
| **COO / Trưởng vận hành** | Hiệu suất center, đối tác, nhân sự/chi phí, đề xuất khối lượng tháng sau | Operations |
| **Trưởng nhóm (RevOps/Team lead)** | Nhập số liệu vào Sheet, viết comment cho báo cáo bi-weekly/monthly | Sheet + Reports |
| **Admin** | Cấu hình nguồn dữ liệu, trọng số scorecard, ngưỡng cảnh báo, override HRMS, API key | Settings |

---

## 3. Kiến trúc thông tin (Information Architecture)

Điều hướng cấp 1 (`NAV` trong `helpers.ts`) → 6 view; một số view có tab cấp 2.

```
Overview (Pulse)          → tab: Executive Pulse · Variance Intelligence · Revenue & Margin Driver
Operations (Centers)      → tab: Plants & Supplier · Workforce & Cost
Capital (Financials)      → P&L · Cash Flow · Payables (công nợ)
Insight Signals           → tín hiệu AI/rule + độ tin cậy + mức ảnh hưởng
Executive Briefing        → brief rule-based + danh mục EVM sáng kiến
Reports Library           → thư viện báo cáo + comment của team lead
```

- **Bộ chọn kỳ (period)**: thanh chuyển `apr/may/jun…`; mặc định mở ở kỳ mới nhất (`periodIdx = periods.length − 1`).
- **Chế độ so sánh (`comparisonMode`)**: `budget` (mục tiêu) ↔ `forecast` (dự báo) — đổi đường tham chiếu của KPI/biểu đồ.
- **AI Chat panel**: nút nổi, đọc dữ liệu kỳ đang xem.
- **Tooltip chỉ số**: rê chuột vào nhãn → portal hiện *what / logic / dataFlow* từ `METRIC_DOCS`.

---

## 4. Mô hình dữ liệu (Data Model)

Nguồn sự thật về kiểu: `src/types/dashboard.ts`. Payload trả về API/loader là `DashboardData`.

```
DashboardData
├─ periods: PeriodData[]          // mỗi kỳ báo cáo một snapshot
│   ├─ KPI: revenue/gp/ebitda (+ Target, + Forecast, + spark[]) , forecastBase/Target
│   ├─ scorecard: { financial, customer, operational, technology } (mỗi pillar: score, trend, subs[])
│   ├─ risks[]            { area, desc, sev, trend, owner }
│   ├─ chart[]            { q, actual|null, base, target }
│   ├─ initiatives[]      { name, status, progress, evm? }
│   ├─ narrative[]        // bullet điều hành
│   ├─ departments[]      { name, value, pct }
│   ├─ operations?        { serviceCenters[], suppliers[], workforce? { …aggregate, teams?[] } }
│   ├─ capital?           { pl[], cashFlow[], payables?[] }
│   └─ insights?[]        { signal, description, category, confidence(0–1), impact }
├─ stories: Story[]               // câu chuyện quản trị (toàn cục)
├─ councils: Council[]            // hội đồng + hạng mục
├─ structuralRisks: StructuralRisk[]
├─ reports: Report[]              // thư viện báo cáo
├─ fpa?: FpaModel                 // { q2TargetGP, teams[], scenarios[], ci }
├─ lastRefreshed?: string
└─ source?: "csv" | "google_sheets" | "static"
```

**Nguyên tắc lưu trữ**: chỉ lưu **dữ liệu thô (primitive)**. Mọi chỉ số dẫn xuất (SV/CV/SPI/CPI/EAC/VAC/%complete, điểm pillar, tổng hợp công ty, blended forecast…) được **tính lại mỗi lần render** → không drift.

### 4.1. EVM (Earned Value Management)
Mỗi team & initiative lưu 4 primitive **BAC, PV, EV, AC** (`EVMInput`). `computeEVM()` (`evm.ts`) suy ra:

| Chỉ số | Công thức | Ý nghĩa |
|---|---|---|
| SV | EV − PV | Lệch tiến độ (>0 = nhanh) |
| CV | EV − AC | Lệch chi phí (>0 = dưới ngân sách) |
| SPI | EV / PV | Hiệu suất tiến độ (>1 tốt) |
| CPI | EV / AC | Hiệu suất chi phí (>1 tốt) |
| EAC | BAC / CPI | Dự báo tổng chi phí khi xong |
| ETC | EAC − AC | Còn cần chi bao nhiêu |
| VAC | BAC − EAC | Lệch ngân sách cuối (>0 tốt) |
| %complete | EV / BAC × 100 | Khối lượng đã hoàn thành |
| health | min(SPI,CPI) ≥1 ⇒ ahead; <0.9 ⇒ behind; còn lại on-track |

- Chia an toàn (`div`): mẫu ~0 trả fallback (SPI/CPI→1) để tránh NaN.
- `rollupEVM()` cộng dồn BAC/PV/EV/AC nhiều team rồi tính lại (dùng cho brief & portfolio).

---

## 5. Luồng thông tin (Data Flow)

### 5.1. Tổng quan luồng
```
Nguồn nghiệp vụ              Lớp nhập liệu            Lớp parse/đọc           Lớp tính & hiển thị
─────────────────           ───────────────          ──────────────          ────────────────────
Salesforce (Opp, Pricebook) Google Sheet (workbook   googleSheets.ts  ─┐
HRMS (headcount, attrition) 6 tab chủ đề, có dropdown  (API v4 hoặc     ├─ parseRows() →
Kế toán/ERP (P&L, CF, AP)   + dòng note + section)     gviz/CSV)        │  buildFromRows()  →  DashboardData
                            ─ hoặc ─                                    │   (csvParser.ts)        │
                            CSV phẳng (1 sheet,        parseCsvUrl/      ┘                         │
                            cột `section`/`period`)    parseCsvString                              ▼
                                                                              dataLoader → overrides (settings)
                                                                                                  │
                                                                       page.tsx (server) → BODDashboard (client)
                                                                       evm.ts · forecast.ts · workload.ts · aiReasoning.ts
                                                                                                  ▼
                                                                                    Recharts + thẻ KPI + tooltip
```

### 5.2. Thứ tự chọn nguồn (`dataLoader.resolveSource`)
1. **Google Sheets** nếu có `GOOGLE_SHEET_ID` → `fetchGoogleSheetData()`.
2. **CSV URL** nếu có `DASHBOARD_CSV_URL` → `parseCsvUrl()`.
3. **Static seed** (`STATIC_DASHBOARD_DATA`) — luôn chạy được kể cả khi mất mạng/chưa cấu hình.

Mỗi bước có `try/catch`: lỗi nguồn cao hơn → **fallback** xuống nguồn dưới (không bao giờ trắng màn hình).

Sau khi resolve, `loadDashboardData()` áp **override từ settings** (nếu có DB): `applyWeightOverrides` (trọng số scorecard) rồi `applyHrmsOverrides` (HRMS theo team). Không có DB ⇒ no-op.

### 5.3. Google Sheets — 2 layout × 2 transport (`googleSheets.ts`)

**Layout**
- **A. Nhóm theo chủ đề (khuyến nghị)** — 6 tab (`THEMED_TABS`): mỗi dòng có cột **`section`** (dropdown) xác định loại dữ liệu ⇒ một tab chứa nhiều section. Loader đọc section **từ cột của từng dòng** (không gán cứng theo tab).
- **A'. 1-tab-1-section (legacy/power user)** — `TAB_SECTION` map tên tab → section; cũng nhận tab đặt tên đúng bằng khóa section (vd `kpi`, `fpa_monthly`).
- **B. CSV phẳng** — một sheet, mỗi dòng có cột `section` + `period`.

**Transport**
1. **Public gviz/CSV** (zero-config): sheet share "Anyone with link". Đọc từng tab qua endpoint `gviz` theo tên; chống trang lỗi HTML (bỏ nếu body bắt đầu bằng `<`).
2. **Service Account API v4**: đặt `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON) + `GOOGLE_SHEET_ID`. Liệt kê tab rồi **`batchGet` tất cả tab trong 1 request**.

**Xử lý hàng tiêu đề/hướng dẫn** (`rowsFromMatrix`):
- Dòng 1 = header (chuẩn hóa: lowercase, space→`_`).
- Bỏ **dòng hướng dẫn** (ô đầu bắt đầu bằng `#`) và **dòng trống**.
- Tab nhóm ⇒ `section = null` (lấy theo cột); tab đơn ⇒ gán cứng section của tab.

### 5.4. Làm mới (refresh)
- `page.tsx` và `/api/dashboard` đặt `dynamic = "force-dynamic"` ⇒ luôn fetch mới phía server.
- Header cache: `/api/dashboard` trả `s-maxage=60, stale-while-revalidate=300`; fetch gviz/Sheets `revalidate: 300` ⇒ thực tế làm mới ~5 phút/lần.
- `lastRefreshed` gắn timestamp ISO khi parse.

---

## 6. Quy tắc parse & tổng hợp (`csvParser.ts`)

`buildFromRows()` khởi tạo từ **static scaffold** rồi **chỉ ghi đè** phần nào CSV/Sheet cung cấp ⇒ thiếu field vẫn có giá trị mặc định hợp lý. Parser **cố ý dễ dãi**: dòng không nhận diện được thì bỏ qua âm thầm.

### 6.1. Quy tắc chung
- `num()` lột bỏ `, $ %`; lỗi → 0. `str()` trim. `trendVal()` map up/down/increase/falling… → `up|down|flat`.
- **Bắt buộc `period`** cho hầu hết section; **miễn period** cho: `story, report, structural_risk, fpa_monthly, fpa_forecast, fpa_scenario, fpa_ci`.
- Period mới chưa có ⇒ **clone snapshot của kỳ đầu** rồi đặt `period/label` (để không thiếu section).
- Cập nhật theo **khóa định danh** (tên/metric/area…): trùng khóa ⇒ merge (`Object.assign`), chưa có ⇒ push.

### 6.2. Quy tắc theo section (tóm tắt)
| section | Khóa & hành vi đặc thù |
|---|---|
| `kpi` | metric ∈ revenue/gross_profit(gp)/ebitda → set value+target; forecast_base/target → set; `*_spark` → split `,` thành `number[]` |
| `revenue_targets` | revenue_forecast/gp_forecast/ebitda_forecast → set nhánh Forecast |
| `scorecard` | upsert sub-KPI theo `pillar`; **điểm pillar = Σ(value×weight)/Σweight** (làm tròn); `trend` numeric → set |
| `risk` | upsert theo `area`; sev mặc định Low; trend qua `trendVal` |
| `initiative` | upsert theo `name`; EVM optional (chỉ khi có bac/pv/ev/ac) |
| `department` | upsert theo `name`; set value/pct |
| `narrative` | append bullet (khử trùng lặp) |
| `chart` | upsert theo `q`; `actual` = "" / "null" ⇒ `null` (quý chưa chốt) |
| `story` / `report` | toàn cục (không theo period); upsert theo title/name |
| `operations_center` | upsert theo name; type HQ/Fulfillment/Procurement (mặc định Fulfillment) |
| `supply_partner` | upsert; performance←performance/pct; spend←spend/value |
| `workforce` | aggregate công ty trực tiếp (headcount/utilization/attrition/cost_per_head) |
| `team_workforce` | upsert team + EVM; **tự tính lại aggregate công ty** (headcount=Σ; util/attrition = bình quân *trọng số headcount*; costPerHead = Σcost·1000/Σhead) |
| `capital_pl` | upsert theo item; actual/budget/variance |
| `capital_cf` | upsert theo category; inflow/outflow/net |
| `payable` | **reset list 1 lần/kỳ** (lần đầu gặp) rồi append; status chuẩn hóa Paid/Overdue/Pending |
| `insight_signal` | upsert; **confidence tự chuẩn hóa**: >1 ⇒ chia 100 (nhận cả 0.92 và 92) |
| `fpa_monthly` | upsert team trong `fpa`; tháng M1..M6; gpActual/revenue rỗng ⇒ `null` |
| `fpa_forecast` | set q2Target, posteriorRate, bayesian, pipeline, confidence (regex High/Low) |
| `fpa_scenario` | append P20/P50/P80 (prob, gpForecast, achievement, revenueEst) |
| `fpa_ci` | set p80/p95 low–high |

- **Reset chống rò seed**: `fpa` và `payables` reset về rỗng **lần đầu** Sheet cung cấp (cờ `fpaTouched` / set `payablesReset`) để dữ liệu mẫu static không lẫn vào.
- Cuối cùng: nếu `fpa` chưa có `q2TargetGP` ⇒ tính = Σ q2Target các team; `periods` rebuild từ map (giữ thứ tự).

---

## 7. Quy tắc tính dẫn xuất (Business Logic / Rules)

### 7.1. Scorecard & Company Health
- Điểm pillar = trung bình **có trọng số** sub-KPI (parse-time và lại trong `applyWeightOverrides`).
- `pillarWeights` (mặc định financial .35 / customer .25 / operational .25 / technology .15) — trọng số cho chỉ số Company Health tổng hợp.
- Tone màu điểm: `scoreTone` ≥80 emerald · ≥60 amber · còn lại red.

### 7.2. Forecast kép (`forecast.ts`)
Mỗi team blend 2 mô hình:
- **Bayesian** (workbook): `bayesianForecast = posteriorRate × q2Target`.
- **Pipeline** (Salesforce): Σ(median quote × stage %).
- `blended = (bayes + pipeline)/2`; `agreementPct = (1 − |bayes−pipeline|/max)·100`; `confidencePct = agreement × CONF_FACTOR(confidence)` (High 1 / Medium .85 / Low .6). Tổng công ty: confidence bình quân **trọng số blended**.

### 7.3. EVM theo loại team (`workload.effectiveTeamEVM`)
- **Team revenue**: EVM khóa theo GP — EV = Σ GP thực tế (tháng đã chốt), PV = Σ GP target tương ứng, AC = chi phí nhân sự (`totalCost`), BAC = `q2Target`. ⇒ SPI = GP earned / GP planned, CPI = GP earned / people cost (kiểu ROI).
- **Team support**: dùng EVM lưu sẵn của team.

### 7.4. Đề xuất khối lượng tháng sau (`recommendWorkload`)
Rule-based theo `utilization`:
- ≥90% → **Quá tải** (red): đề xuất bổ sung `round(headcount·(util/85−1))` người hoặc giãn việc.
- <70% → **Dư công suất** (amber): phân bổ thêm pipeline.
- còn lại → **Cân bằng** (emerald).
- Cộng thêm: attrition ≥ `attritionHigh` (mặc định 16) ⇒ +1 backfill; SPI < 0.9 ⇒ cảnh báo chậm tiến độ, cân nhắc tái phân bổ.

### 7.5. RevOps progress (`revOpsProgress`)
`revenuePct = revenue/revenueTarget`, `forecastPct = forecastBase/forecastTarget`, `pipeline` lấy từ sub-KPI "Pipeline Coverage" của pillar Customer.

### 7.6. Executive Brief (`aiReasoning.generateExecutiveBrief`)
Sinh 3–5 câu **deterministic** (cùng input → cùng output), xếp theo độ nổi bật:
1. Doanh thu vs target + biên gộp.
2. Sức khỏe danh mục EVM (rollup SPI/CPI/VAC) + initiative lệch nhất (min(SPI,CPI)<0.9).
3. Rủi ro High (area, desc, owner).
4. Áp lực nhân sự (team attrition cao nhất ≥16%).
- `needsLeadComment(reportName)`: báo cáo bi-weekly/biweekly/monthly ⇒ **bắt buộc** team lead nhập comment.

---

## 8. Cách dữ liệu được biểu diễn (Visualization mapping)

| Dữ liệu | Thành phần UI | Thư viện |
|---|---|---|
| KPI revenue/gp/ebitda | `KpiCard` (value vs target/forecast + sparkline + delta%) | inline SVG spark |
| Variance theo quý (`chart`) | Area / Line / Bar / Combo (chuyển kiểu) — Actual vs Base vs Target | Recharts `ComposedChart` |
| Revenue & Margin Driver | Bar (Target vs Actual GP) + Line (% đạt) hai trục | Recharts Composed |
| Scorecard 4 trụ | `Gauge` (vòng cung) + `ProgressBar` sub-KPI + `TrendArrow` | SVG |
| Cash flow | Bar inflow/outflow + Line net | Recharts Composed |
| Risk / Initiative / Supplier… | bảng + `Badge`/`ProgressBar`, màu theo `statusColor/sevColor` | — |
| Insight signals | thẻ tín hiệu + % confidence + impact | — |
| Mọi nhãn chỉ số | `InfoTip` portal (what/logic/dataFlow) khi hover | `METRIC_DOCS` |

- Bảng màu thống nhất: `colorMap` (emerald/amber/red/indigo/slate).
- Tooltip render bằng **React portal + fixed position** để không bị `overflow:hidden`/`truncate` cắt.

---

## 9. AI / Reasoning (hiện trạng & seam nâng cấp)

- **Executive Brief** (`aiReasoning.ts`) và **đề xuất khối lượng** (`workload.ts`): thuần rule-based, deterministic. Đã chú thích **ADAPTER SEAM** — thêm sibling async gọi Claude API với cùng chữ ký để nâng cấp, không đổi call site.
- **AI Chat panel** (`AIChatPanel.tsx`): hiện là **mock** (`generateAIResponse` match keyword variance/kyc/center/capital, có `setTimeout` giả "typing"). Lưu lịch sử chat best-effort qua `/api/settings/chat-history` (no-op nếu không có DB).
- **API key Claude**: lưu trong settings (`apiKey`), **mask khi trả client** (`maskKey`, giữ 4 ký tự cuối) — đặt sẵn để bật LLM thật.

---

## 10. Settings, Override & Lưu trữ

### 10.1. Khu Settings (`/settings`) — có password gate
- `settingsAuth.ts`: gate bằng `SETTINGS_PASSWORD`; session cookie là HMAC(secret, password) ⇒ verify **stateless**, không lưu session.
- API: `/api/settings` (đọc/ghi), `/api/settings/auth` (đăng nhập), `/api/settings/logs`, `/api/settings/chat-history`.

### 10.2. Cấu hình điều chỉnh được (`AppSettings`)
- `scorecardWeights`: override trọng số sub-KPI (`${pillar}.${sub}` → 0..1) ⇒ `applyWeightOverrides` tính lại điểm pillar.
- `pillarWeights`: trọng số 4 trụ cho Company Health.
- `thresholds`: `spiWarn`, `cpiWarn`, `attritionHigh` (đổi ngưỡng cảnh báo & đề xuất nhân sự).
- `sheetTemplate`: sheetId/sheetTab/csvUrl/mappingNote (hiển thị + hướng dẫn).
- `hrmsOverrides`: chỉnh headcount/utilization/attrition/costPerHead/revenueContribution **theo team** ⇒ `applyHrmsOverrides` ghi đè rồi **tính lại** totalCost & aggregate công ty.
- `apiKey`: khóa Claude (mask khi trả về).

### 10.3. Lưu trữ (`db.ts`, tùy chọn)
- Postgres qua `DATABASE_URL`; **lazy pool**, tự `CREATE TABLE IF NOT EXISTS` (`app_settings`, `access_logs`, `chat_history`) — không có công cụ migration.
- **Không có `DATABASE_URL`** ⇒ `isDbEnabled()=false`: mọi read trả default, mọi write là no-op ⇒ app vẫn chạy.
- `logAccess` ghi log truy cập (vd `dashboard.view` + source) — không bao giờ làm hỏng request nếu lỗi.

---

## 11. API bề mặt

| Endpoint | Method | Mô tả |
|---|---|---|
| `/` | GET (server) | Load data + log view, render `BODDashboard` |
| `/api/dashboard` | GET | Trả `DashboardData`. Query: `?source=static\|csv&url=…\|sheets` (mặc định auto) |
| `/api/upload-csv` | POST | Upload CSV (FormData `file`, phải `.csv`) → parse → trả `DashboardData` |
| `/api/settings` | GET/POST | Đọc/ghi settings (sau gate) |
| `/api/settings/auth` | POST | Đăng nhập Settings (password → cookie) |
| `/api/settings/logs` | GET | Nhật ký truy cập |
| `/api/settings/chat-history` | GET/POST/DELETE | Lịch sử AI chat |

---

## 12. Cấu hình môi trường (ENV)

| Biến | Vai trò |
|---|---|
| `GOOGLE_SHEET_ID` | Bật nguồn Google Sheets (ưu tiên #1) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON service account ⇒ dùng API v4 (batchGet); không có ⇒ thử public gviz |
| `DASHBOARD_CSV_URL` | Nguồn CSV phẳng (ưu tiên #2) |
| `DATABASE_URL` (+ `DATABASE_SSL`) | Bật Postgres cho settings/log/chat |
| `SETTINGS_PASSWORD` (+ `SETTINGS_SECRET`) | Gate khu Settings |

> Không đặt biến nào ⇒ chạy bằng **static seed data** (demo/local).

---

## 13. Yêu cầu phi chức năng

- **Khả dụng (resilience)**: chuỗi fallback Sheets→CSV→static; parser dễ dãi; DB/log/chat lỗi không chặn request.
- **Nhất quán số liệu**: không lưu giá trị dẫn xuất; tính tại runtime (EVM, scorecard, aggregate, forecast).
- **Bảo mật**: API key mask khi trả client; Settings sau password (HMAC cookie, stateless); chỉ đọc Sheet (không ghi ngược).
- **Hiệu năng**: cache `s-maxage=60 / SWR 300`, fetch Sheet `revalidate 300` (~5 phút); service account dùng 1 `batchGet`.
- **Khả dụng cho người không kỹ thuật**: workbook 6 tab có dropdown + dòng note + dữ liệu mẫu; import 1 click thành Google Sheet.
- **Bản địa hóa**: nhãn/tooltip/đề xuất bằng tiếng Việt; tiền tệ $M.
- **Khả mở rộng**: thêm section = thêm `case` trong parser + (tùy) entry `METRIC_DOCS`; thêm period = thêm dòng Sheet.

---

## 14. Quy ước nhập liệu (tóm tắt cho người dùng cuối)

- 6 tab chủ đề; **chọn `section`** ở cột đầu (dropdown) cho mỗi dòng.
- Dòng 1 = tên cột (không sửa); dòng 2 (bắt đầu `#`) = hướng dẫn, dashboard tự bỏ qua.
- `period` viết thường, đồng nhất giữa các tab (`jun, jul…`); FP&A và story/report **không cần** period.
- Để **trống** ô không dùng; tiền = $M; % điền số (82) trừ cột ghi "0–1".
- Spark: 8 số cách nhau dấu phẩy, **bọc ngoặc kép**. Chart `actual` để trống nếu quý chưa chốt.
- **Không đổi tên 6 tab**. Chi tiết: `docs/google-sheet-template.md`.

---

## 15. Rủi ro đã biết & hướng phát triển

| Hạng mục | Hiện trạng | Hướng nâng cấp |
|---|---|---|
| AI Chat / Brief | Rule-based / mock | Gọi Claude qua adapter seam đã chừa (dùng `apiKey`) |
| Upload | Chỉ nhận `.csv` | Nhận `.xlsx` (convert phía server) |
| Phân quyền | 1 password cho Settings | RBAC nhiều vai trò |
| Sheet rộng (FP&A/Scorecard) | Tab gộp nhiều cột | Tùy chọn tách lại tab nặng |
| Nguồn dữ liệu | Pull theo lịch (~5') | Webhook/realtime từ Salesforce |
| Migration DB | `CREATE IF NOT EXISTS` | Công cụ migration chính thức |

---

*Tài liệu phản ánh code tại thời điểm viết. Khi thêm section/chỉ số mới, cập nhật song song: `csvParser.ts` (case), `types/dashboard.ts` (kiểu), `metricDocs.ts` (tooltip), workbook mẫu và tài liệu này.*
