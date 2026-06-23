# OneIBC BOD Dashboard — Google Sheet Template & Từ điển Field

Tài liệu này mô tả **bộ template Google Sheet chuẩn** để nạp dữ liệu vào dashboard.
File mẫu sẵn sàng import: [`public/templates/oneibc-bod-template.csv`](../public/templates/oneibc-bod-template.csv).

## Nguyên tắc

- **1 dòng = 1 reading.** Mỗi dòng mô tả một chỉ số, định danh bởi cột `section` (+ `period`).
- **Sheet phẳng, 1 tab.** Tất cả section nằm chung một sheet; cột không liên quan để trống.
- **Header không phân biệt hoa/thường**, dấu cách → gạch dưới (parser tự chuẩn hóa).
- **Permissive:** dòng không hiểu sẽ bị bỏ qua; field thiếu lấy giá trị mặc định hợp lý.

## Cách dùng

1. Import `oneibc-bod-template.csv` vào Google Sheets (File → Import → Upload).
2. Share "Anyone with the link → Viewer" **hoặc** Publish to web (CSV).
3. Cấu hình `.env.local` / biến môi trường Railway:
   ```env
   GOOGLE_SHEET_ID=<id_giữa_/d/_và_/edit>
   # hoặc dùng CSV URL:
   DASHBOARD_CSV_URL=https://.../export?format=csv
   ```
4. Dashboard tự refresh (cache 5 phút). Trạng thái nguồn + lần fetch cuối hiển thị trên mỗi tab.

---

## Hai cách bố trí sheet (loader tự nhận diện)

Loader (`googleSheets.ts`) hỗ trợ **cả hai**, ưu tiên multi-tab rồi fallback single-tab.

### A. Workbook nhiều tab — *khuyến nghị cho staff* (spoon-feed)

Mỗi **section = một tab riêng**, chỉ chứa cột liên quan, có **dòng note hướng dẫn**
(điền gì + nguồn Salesforce/HRMS/ERP) và **dropdown** cho các cột enum. Staff không
phải gõ `section`/`period` thừa hay nhìn 70+ cột.

- **Dòng 1** = tên cột (machine key) — không sửa, không đổi thứ tự.
- **Dòng 2** = note, **luôn bắt đầu bằng `#`** ở ô đầu → loader tự bỏ qua (staff cũng
  có thể chèn dòng ghi chú riêng bằng cách gõ `#` ở ô đầu dòng).
- **Dòng 3+** = dữ liệu (đã có dòng mẫu).

File mẫu build sẵn: [`public/templates/OneIBC_BOD_Workbook.xlsx`](../public/templates/OneIBC_BOD_Workbook.xlsx)
— **Import vào Google Sheets** (File → Import → Upload → *Replace spreadsheet*) là Google
tự convert thành workbook nhiều tab, giữ nguyên dropdown/định dạng/note.

`section` được suy ra từ **tên tab** (đừng đổi tên tab):

| Tab | section | Tab | section |
|---|---|---|---|
| `01 · KPI tài chính` | kpi | `12 · Sáng kiến` | initiative |
| `02 · Dự báo doanh thu` | revenue_targets | `13 · Insight signals` | insight_signal |
| `03 · Scorecard` | scorecard | `14 · Narrative` | narrative |
| `04 · Biểu đồ quý` | chart | `15 · Stories` | story |
| `05 · Phòng ban` | department | `16 · Báo cáo` | report |
| `06 · Trung tâm vận hành` | operations_center | `17 · FP&A theo tháng` | fpa_monthly |
| `07 · Đối tác cung ứng` | supply_partner | `18 · FP&A dự báo` | fpa_forecast |
| `08 · Nhân sự theo team` | team_workforce | `19 · FP&A kịch bản` | fpa_scenario |
| `09 · P&L vốn` | capital_pl | `20 · FP&A CI` | fpa_ci |
| `10 · Dòng tiền` | capital_cf | `21 · Công nợ phải trả` | payable |
| `11 · Rủi ro` | risk | | |

> Mẹo: một tab đặt tên đúng bằng khóa section (vd `kpi`, `fpa_monthly`) cũng được nhận diện.

- **Service account**: loader liệt kê tab + `batchGet` tất cả tab trong **1 request**.
- **Public link**: loader đọc từng tab qua endpoint `gviz` theo tên tab.

### B. Sheet phẳng 1 tab (legacy)

Một sheet duy nhất với cột `section` mỗi dòng (xem [`oneibc-bod-template.csv`](../public/templates/oneibc-bod-template.csv)).
Vẫn hoạt động; loader fallback về layout này khi không thấy tab multi-tab nào.

## Luồng dữ liệu tổng thể

```
Salesforce / Accounting / HRMS / Risk register
        │  (pull request — đồng bộ định kỳ)
        ▼
Google Sheet (template này)  ──►  csvParser.ts  ──►  DashboardData  ──►  UI
```

---

## Bảng section & field

> Cột chung mọi section: `section`, `period` (mã kỳ: `apr`/`may`/`jun`…), `label` (tên kỳ hiển thị).
> Các section `story`, `report` là cross-period → **không cần** `period`.

### `kpi` — KPI tài chính cấp kỳ
| Field | Ý nghĩa | Nguồn |
|---|---|---|
| `metric` | `revenue` \| `gross_profit` \| `ebitda` \| `forecast_base` \| `forecast_target` \| `revenue_spark`/`gp_spark`/`ebitda_spark` | — |
| `value` | Giá trị actual ($M) | Salesforce + Accounting |
| `target` | Budget tương ứng ($M) | Kế hoạch |
| `spark` | Chuỗi số phẩy-ngăn cho sparkline | Lịch sử |

### `revenue_targets` — Đường so sánh Forecast
| Field | Ý nghĩa |
|---|---|
| `metric` | `revenue_forecast` \| `gp_forecast` \| `ebitda_forecast` |
| `value` | Giá trị forecast ($M) |

### `scorecard` — Balanced Scorecard (4 trụ)
| Field | Ý nghĩa |
|---|---|
| `pillar` | `financial` \| `customer` \| `operational` \| `technology` |
| `metric` | Tên sub-KPI |
| `weight` | Trọng số (0–1) |
| `value` | Điểm sub-KPI (0–100) |
| `trend` | Δ điểm trụ so với kỳ trước |

> **Logic:** điểm trụ = Σ(`value`×`weight`) / Σ(`weight`) — parser tự tính, không nhập tay.

### `chart` — Variance theo quý
| Field | Ý nghĩa |
|---|---|
| `q` | `Q1`…`Q4`/`FY` |
| `actual` | Thực tế ($M), để `null` nếu chưa có |
| `base` | Budget/baseline ($M) |
| `target` | Mục tiêu ($M) |

### `department` — Revenue & Margin Driver
| Field | Ý nghĩa | Nguồn |
|---|---|---|
| `name` | Nhóm pricebook/dịch vụ | Salesforce Pricebook |
| `value` | Doanh thu/GP ($M) | Salesforce |
| `pct` | % đóng góp | Tự tính/nhập |

### `risk` — Rủi ro doanh nghiệp
| Field | Ý nghĩa |
|---|---|
| `area` | Tên rủi ro |
| `severity` | `Low` \| `Medium` \| `High` |
| `trend` | `up` \| `down` \| `flat` |
| `owner` | Council chịu trách nhiệm |
| `desc` | Mô tả ngắn |

### `initiative` — Sáng kiến chiến lược (+ EVM tùy chọn)
| Field | Ý nghĩa |
|---|---|
| `name` | Tên sáng kiến |
| `status` | `On Track` \| `At Risk` \| `Delayed` \| `Critical` |
| `progress` | % hoàn thành (0–100) |
| `bac`,`pv`,`ev`,`ac` | EVM cấp initiative ($M) — *tùy chọn* |

### `narrative` — Bullet điều hành
| Field | Ý nghĩa |
|---|---|
| `value` | Nội dung 1 dòng narrative |

### `operations_center` — Plants & Centers
| Field | Ý nghĩa |
|---|---|
| `name` | Tên center |
| `type` | `HQ` \| `Fulfillment` \| `Procurement` |
| `actual`,`target` | Chi phí thực/mục tiêu ($M) |
| `cost` | Chi phí kế hoạch ($M) |

### `supply_partner` — Banks & Agents
| Field | Ý nghĩa |
|---|---|
| `name` | Đối tác |
| `category` | `Bank` \| `Agent` |
| `performance` | Hiệu suất SLA (%) |
| `spend` | Chi tiêu kỳ ($M) |

### `team_workforce` — Headcount + Cost + EVM theo team
| Field | Ý nghĩa | Nguồn |
|---|---|---|
| `team` | RM + Bank, S&F, Renew, ATA, Marketing, Ops… | HRMS |
| `type` | `revenue` (đội tạo doanh thu) hoặc `support` | Phân loại |
| `headcount` | Số nhân sự | HRMS |
| `utilization` | % sử dụng năng lực | Timesheet/Ops |
| `attrition` | % nghỉ việc (quy năm) | HRMS |
| `cost_per_head` | Chi phí/đầu người ($K) | Payroll |
| `total_cost` | Tổng chi phí team ($M) | Payroll |
| `revenue_contribution` | Doanh thu/GP team tạo ra ($M) | Salesforce attribution |
| `bac`,`pv`,`ev`,`ac` | EVM cấp team ($M) | Plan + Accounting |

> Aggregate công ty (headcount/utilization/attrition/cost_per_head) **tự tính** từ các dòng team.

### `capital_pl` — P&L điều hành
| Field | Ý nghĩa |
|---|---|
| `item` | Dòng P&L (Revenue, COGS, GP, OpEx, EBITDA) |
| `actual`,`budget`,`variance` | $M |

### `capital_cf` — Dòng tiền
| Field | Ý nghĩa |
|---|---|
| `category` | Operating/Investing/Financing Activities |
| `inflow`,`outflow`,`net` | $M |

### `payable` — Supplier/Bank payments + deadline *(theo period)*
| Field | Ý nghĩa |
|---|---|
| `supplier` | Tên nhà cung cấp/bank |
| `category` | Bank / Agent / Government… |
| `amount` | Số tiền phải trả ($M) |
| `due` | Hạn thanh toán (YYYY-MM-DD) |
| `status` | `Paid` / `Pending` / `Overdue` |

---

## Khối FP&A (từ GP Forecast Masterworkbook) — *cross-period*

> Khi sheet có **bất kỳ** dòng `fpa_*`, toàn bộ khối FP&A mẫu bị thay bằng dữ liệu sheet (không lẫn số mẫu).

### `fpa_monthly` — GP target/actual + Revenue theo team từng tháng
| Field | Ý nghĩa |
|---|---|
| `team` | Tên team (khớp với `team_workforce`) |
| `type` | `revenue` / `support` (chỉ cần ở dòng đầu mỗi team) |
| `month` | M1…M6 |
| `gp_target` | GP mục tiêu tháng ($M) |
| `gp_actual` | GP thực hiện ($M) — **để trống** nếu tháng chưa chốt |
| `revenue` | Doanh thu tháng ($M) — để trống nếu chưa có |

### `fpa_forecast` — Forecast kép theo team
| Field | Ý nghĩa |
|---|---|
| `team` | Tên team |
| `type` | `revenue` / `support` |
| `q2_target` | GP mục tiêu quý ($M) |
| `posterior_rate` | Tỷ lệ đạt Bayesian (0–1) |
| `bayesian` | Forecast Bayesian ($M) = posterior × target |
| `pipeline` | Forecast Salesforce (median báo giá × % stage, $M) |
| `confidence` | `High` / `Medium` / `Low` |

### `fpa_scenario` — Kịch bản P20/P50/P80
| Field | Ý nghĩa |
|---|---|
| `name` | Tên kịch bản (P20 · Conservative…) |
| `prob` | Xác suất (0–1) |
| `gp_forecast` | GP dự báo ($M) |
| `achievement` | % đạt (0–1) |
| `revenue_est` | Doanh thu ước tính ($M) |

### `fpa_ci` — Khoảng tin cậy (1 dòng)
| Field | Ý nghĩa |
|---|---|
| `p80_low`,`p80_high` | CI 80% GP ($M) |
| `p95_low`,`p95_high` | CI 95% GP ($M) |

### `insight_signal` — Tín hiệu AI
| Field | Ý nghĩa |
|---|---|
| `signal` | Tiêu đề tín hiệu |
| `category` | `Risk` \| `Operational` \| `Financial` |
| `confidence` | 0–1 hoặc 0–100 (parser tự quy đổi) |
| `impact` | `High` \| `Medium` \| `Low` |
| `description` | Mô tả |

### `story` — Management Story *(cross-period)*
| Field | Ý nghĩa |
|---|---|
| `name` | Tiêu đề |
| `sentiment` | `Positive` \| `Watch` \| `Action` |
| `summary`,`thread`,`time` | Nội dung / kênh / thời điểm |

### `report` — Thư viện báo cáo *(cross-period)*
| Field | Ý nghĩa |
|---|---|
| `name` | Tên báo cáo |
| `updated` | Cập nhật lần cuối |

---

## EVM — Earned Value Management

Bốn primitive nhập vào Sheet: **BAC, PV, EV, AC** ($M). Mọi chỉ số dẫn xuất do
[`lib/evm.ts`](../src/lib/evm.ts) tính tại runtime (không lưu, tránh lệch số):

| Chỉ số | Công thức | Đọc hiểu |
|---|---|---|
| SV | EV − PV | >0: nhanh hơn kế hoạch |
| CV | EV − AC | >0: dưới ngân sách |
| SPI | EV / PV | >1: đúng tiến độ |
| CPI | EV / AC | >1: hiệu quả chi phí |
| EAC | BAC / CPI | Dự báo tổng chi phí |
| ETC | EAC − AC | Chi phí còn lại |
| VAC | BAC − EAC | Lệch ngân sách cuối |
| % complete | EV / BAC × 100 | Khối lượng đã làm |

Mô tả tiếng Việt đầy đủ từng chỉ số nằm trong [`lib/metricDocs.ts`](../src/lib/metricDocs.ts)
và hiển thị dạng tooltip khi rê chuột trên dashboard.
