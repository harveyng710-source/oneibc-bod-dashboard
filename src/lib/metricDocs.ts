/**
 * metricDocs.ts
 * ─────────────
 * Từ điển mô tả TIẾNG VIỆT cho mọi chỉ số hiển thị trên dashboard.
 *
 * Mỗi entry trả lời 3 câu hỏi cho người xem (BOD/Exec):
 *   • what     — Chỉ số này LÀ gì, biểu diễn điều gì.
 *   • logic    — Công thức / cách tính.
 *   • dataFlow — Dữ liệu chảy từ đâu → qua đâu → ra con số này.
 *
 * UI (Phase 4) đọc registry này để hiện tooltip khi RÊ CHUỘT vào ô chỉ số.
 * Đây cũng là nguồn sự thật cho "Từ điển field" trong Google Sheet template.
 */

export interface MetricDoc {
  label: string;     // Tên hiển thị
  what: string;      // Chỉ số biểu diễn gì
  logic: string;     // Công thức / logic tính
  dataFlow: string;  // Luồng dữ liệu
}

export const METRIC_DOCS: Record<string, MetricDoc> = {
  // ── KPI tài chính ───────────────────────────────────────────────────────
  revenue: {
    label: "Doanh thu (Revenue)",
    what: "Tổng doanh thu thực hiện trong kỳ, đối chiếu với Target hoặc Forecast.",
    logic: "Actual = tổng doanh thu ghi nhận. Delta% = (Actual − Target) / Target × 100.",
    dataFlow: "Salesforce (Closed-Won + Recurring) → Google Sheet (section=kpi, metric=revenue) → parser → dashboard.",
  },
  gp: {
    label: "Lợi nhuận gộp (Gross Profit)",
    what: "Doanh thu trừ giá vốn dịch vụ; đo hiệu quả tạo biên lợi nhuận.",
    logic: "GP = Revenue − Cost of Services. Margin% = GP / Revenue × 100.",
    dataFlow: "Salesforce + Accounting → Sheet (section=kpi, metric=gp) → parser → dashboard.",
  },
  ebitda: {
    label: "EBITDA (ước tính)",
    what: "Lợi nhuận trước lãi vay, thuế, khấu hao — đại diện sức khỏe vận hành.",
    logic: "EBITDA = GP − OpEx. ⚠️ SUY LUẬN LOGIC: OpEx ước tính = chi phí nhân sự (~59 người × ~$2.5K/tháng) + overhead ~$30K/tháng. Chưa có số OpEx thực.",
    dataFlow: "Tạm suy ra từ GP thực (workbook) − OpEx ước tính. Khi có P&L kế toán thật → thay bằng section=kpi, metric=ebitda.",
  },
  forecastProgress: {
    label: "Tiến độ Forecast",
    what: "Mức đạt được của doanh thu lũy kế so với mục tiêu cả năm (FY).",
    logic: "% = forecastBase / forecastTarget × 100 (có guard chia 0).",
    dataFlow: "Sheet (section=kpi, metric=forecast_base & forecast_target) → parser → dashboard.",
  },

  pipelineCoverage: {
    label: "Pipeline Coverage",
    what: "Tỷ lệ phủ pipeline so với mục tiêu doanh thu — chỉ báo sức khỏe RevOps đầu phễu.",
    logic: "Lấy từ sub-KPI 'Pipeline Coverage Ratio' của trụ Customer trong scorecard.",
    dataFlow: "Salesforce pipeline → Sheet (section=scorecard, pillar=customer) → parser → dashboard.",
  },

  // ── Scorecard 4 trụ cột ─────────────────────────────────────────────────
  scorecard: {
    label: "Strategic Health Scorecard",
    what: "Điểm sức khỏe theo 4 trụ Balanced Scorecard: Tài chính, Khách hàng, Vận hành, Công nghệ.",
    logic: "Điểm trụ = trung bình có trọng số các sub-KPI = Σ(value × weight) / Σ(weight).",
    dataFlow: "Nhiều nguồn (Salesforce/Ops/IT) → Sheet (section=scorecard, pillar, weight, value) → parser tự tính điểm.",
  },

  // ── Variance / Chart ────────────────────────────────────────────────────
  variance: {
    label: "Variance Intelligence",
    what: "Độ lệch doanh thu thực tế so với Target/Forecast theo từng quý.",
    logic: "Variance = Actual − Base. Hiển thị Actual (đường), Base & Target (tham chiếu).",
    dataFlow: "Sheet (section=chart, q, actual, base, target) → parser → AreaChart.",
  },

  // ── Driver doanh thu ────────────────────────────────────────────────────
  department: {
    label: "Revenue & Margin Driver",
    what: "Phân rã doanh thu/GP theo nhóm pricebook hoặc dòng dịch vụ.",
    logic: "pct = value của nhóm / tổng value × 100.",
    dataFlow: "Salesforce Pricebook → Sheet (section=department, name, value, pct) → parser → dashboard.",
  },

  // ── EVM (Earned Value Management) ───────────────────────────────────────
  bac: {
    label: "BAC — Target At Completion",
    what: "Tổng ngân sách được phê duyệt cho team/initiative.",
    logic: "Giá trị kế hoạch gốc, không đổi trừ khi re-baseline.",
    dataFlow: "Kế hoạch ngân sách → Sheet (section=team_workforce/initiative_evm, bac) → parser.",
  },
  pv: {
    label: "PV — Planned Value (BCWS)",
    what: "Giá trị công việc ĐÁNG LẼ hoàn thành tới thời điểm này theo kế hoạch.",
    logic: "PV = % kế hoạch tới hiện tại × BAC.",
    dataFlow: "Lịch kế hoạch → Sheet (… pv) → parser → computeEVM().",
  },
  ev: {
    label: "EV — Earned Value (BCWP)",
    what: "Giá trị công việc THỰC SỰ hoàn thành, quy theo ngân sách.",
    logic: "EV = % hoàn thành thực tế × BAC.",
    dataFlow: "Tiến độ thực tế → Sheet (… ev) → parser → computeEVM().",
  },
  ac: {
    label: "AC — Actual Cost (ACWP)",
    what: "Chi phí thực tế đã bỏ ra để đạt khối lượng đó.",
    logic: "AC = tổng chi phí ghi nhận tới hiện tại.",
    dataFlow: "Accounting → Sheet (… ac) → parser → computeEVM().",
  },
  sv: {
    label: "SV — Schedule Variance",
    what: "Lệch tiến độ tính theo tiền. Dương = đi nhanh hơn kế hoạch.",
    logic: "SV = EV − PV.",
    dataFlow: "Tính trong computeEVM() từ EV, PV.",
  },
  cv: {
    label: "CV — Cost Variance",
    what: "Lệch chi phí. Dương = đang dưới ngân sách (tốt).",
    logic: "CV = EV − AC.",
    dataFlow: "Tính trong computeEVM() từ EV, AC.",
  },
  spi: {
    label: "SPI — Schedule Performance Index",
    what: "Hiệu suất tiến độ. >1 = nhanh hơn kế hoạch, <1 = chậm.",
    logic: "SPI = EV / PV.",
    dataFlow: "Tính trong computeEVM().",
  },
  cpi: {
    label: "CPI — Cost Performance Index",
    what: "Hiệu suất chi phí. >1 = tiết kiệm, <1 = vượt chi.",
    logic: "CPI = EV / AC.",
    dataFlow: "Tính trong computeEVM().",
  },
  eac: {
    label: "EAC — Estimate At Completion",
    what: "Dự báo TỔNG chi phí khi hoàn thành theo nhịp hiện tại.",
    logic: "EAC = BAC / CPI.",
    dataFlow: "Tính trong computeEVM().",
  },
  vac: {
    label: "VAC — Variance At Completion",
    what: "Dự báo lệch ngân sách cuối cùng. Dương = về đích dưới ngân sách.",
    logic: "VAC = BAC − EAC.",
    dataFlow: "Tính trong computeEVM().",
  },
  percentComplete: {
    label: "% Hoàn thành (EVM)",
    what: "Tỷ lệ khối lượng đã hoàn thành theo giá trị.",
    logic: "% = EV / BAC × 100.",
    dataFlow: "Tính trong computeEVM().",
  },

  // ── Workforce ───────────────────────────────────────────────────────────
  headcount: {
    label: "Headcount",
    what: "Số nhân sự của team/công ty trong kỳ.",
    logic: "Đếm nhân sự active. Tổng công ty = Σ headcount các team.",
    dataFlow: "HRMS → Sheet (section=team_workforce, headcount) → parser.",
  },
  utilization: {
    label: "Capacity Utilization (ước tính)",
    what: "Mức sử dụng năng lực làm việc của team.",
    logic: "% = giờ tính phí / giờ khả dụng × 100. ⚠️ SUY LUẬN LOGIC: hiện là ước lượng — chưa có timesheet thực.",
    dataFlow: "Tạm ước lượng. Khi có Timesheet/Ops → Sheet (… utilization) → parser.",
  },
  attrition: {
    label: "Attrition Rate",
    what: "Tỷ lệ nghỉ việc (annualised).",
    logic: "% = số nghỉ trong kỳ / headcount trung bình × hệ số quy năm.",
    dataFlow: "HRMS → Sheet (… attrition) → parser.",
  },
  costPerHead: {
    label: "Cost per Head (ước tính)",
    what: "Chi phí nhân sự bình quân đầu người mỗi kỳ ($K).",
    logic: "= totalCost (quy $K) / headcount. ⚠️ SUY LUẬN LOGIC: hiện ước tính ~$2–3K/người/tháng — chưa có payroll thực.",
    dataFlow: "Tạm ước tính. Khi có Payroll → Sheet (… cost_per_head / total_cost) → parser.",
  },
  revenueContribution: {
    label: "Revenue Contribution",
    what: "Doanh thu/GP team tạo ra — để soi năng suất theo chi phí.",
    logic: "Doanh thu attributed cho team / chi phí team = năng suất.",
    dataFlow: "Salesforce attribution → Sheet (… revenue_contribution) → parser.",
  },

  // ── Operations ──────────────────────────────────────────────────────────
  serviceCenter: {
    label: "Plants & Centers (ước tính)",
    what: "Hiệu quả vận hành & chi phí theo từng center (HQ/Fulfillment/Procurement).",
    logic: "Var = Actual − Target (chi phí). Index = Actual / Target × 100. ⚠️ SUY LUẬN LOGIC: chi phí center hiện ước tính theo địa điểm/nhân sự — chưa có sổ chi phí theo center.",
    dataFlow: "Tạm ước tính. Khi có Ops/Accounting → Sheet (section=operations_center) → parser.",
  },
  supplier: {
    label: "Supplier & Bank Ecosystem (ước tính)",
    what: "Mức chi tiêu và hiệu suất của ngân hàng/đại lý đối tác.",
    logic: "performance% theo SLA/chất lượng; spend = chi tiêu kỳ. ⚠️ SUY LUẬN LOGIC: hiện ước lượng — chưa có nguồn procurement.",
    dataFlow: "Tạm ước tính. Khi có Procurement → Sheet (section=supply_partner) → parser.",
  },
  cashFlow: {
    label: "Cash Flow (ước tính)",
    what: "Dòng tiền Operating/Investing/Financing theo kỳ.",
    logic: "⚠️ SUY LUẬN LOGIC: Operating inflow ≈ doanh thu × 0.92 (thu tiền); outflow ≈ (Revenue − EBITDA) × 0.95; net = inflow − outflow. Investing/Financing là giả định nhỏ.",
    dataFlow: "Tạm suy ra từ revenue/EBITDA thực. Khi có Treasury → Sheet (section=capital_cf) → parser.",
  },
  payable: {
    label: "Payables (ước tính)",
    what: "Công nợ phải trả ngân hàng/đại lý/nhà nước kèm hạn.",
    logic: "⚠️ SUY LUẬN LOGIC: danh mục & số tiền hiện là ví dụ hợp lý — chưa có sổ AP thực.",
    dataFlow: "Tạm ước tính. Khi có AP/ERP → Sheet (section=payable) → parser.",
  },
  revenue_target: {
    label: "Revenue Target (suy luận)",
    what: "Mục tiêu doanh thu kỳ để đối chiếu với thực tế.",
    logic: "⚠️ SUY LUẬN LOGIC: file nguồn chỉ có GP target, không có revenue target → tạm suy = GP target ÷ biên GP 0.66.",
    dataFlow: "Suy ra từ GP target (workbook). Khi có revenue target thật → section=kpi, metric=revenue, cột target.",
  },

  // ── Risk ────────────────────────────────────────────────────────────────
  risk: {
    label: "Enterprise Risk",
    what: "Danh mục rủi ro doanh nghiệp kèm mức độ và xu hướng.",
    logic: "sev ∈ {Low, Medium, High}; trend ∈ {up, down, flat}.",
    dataFlow: "Risk register → Sheet (section=risk) → parser.",
  },
};

/** Tra cứu an toàn — trả undefined nếu chưa có doc cho key. */
export const getMetricDoc = (key: string): MetricDoc | undefined => METRIC_DOCS[key];
