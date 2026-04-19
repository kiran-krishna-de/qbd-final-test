# ============================================================
# POWER BI SETUP GUIDE
# QuickBooks Construction Analytics — 10 KPI Dashboard
# ============================================================

## Step 1: Connect Power BI to BigQuery Gold Layer

1. Open Power BI Desktop
2. Get Data → Google BigQuery
3. Project: your-gcp-project-id
4. Import the following Gold tables:
   - kpi_01_revenue_by_job
   - kpi_02_aged_ar
   - kpi_03_aged_ap
   - kpi_04_job_profitability
   - kpi_05_estimate_vs_actual
   - kpi_06_dso
   - kpi_07_vendor_spend
   - kpi_08_po_fulfillment
   - kpi_09_cash_flow
   - kpi_10_backlog
   - dim_customers (from qb_silver)
   - dim_vendors   (from qb_silver)
   - dim_classes   (from qb_silver)
   - dim_accounts  (from qb_silver)

5. Use Import mode (not DirectQuery) for performance
6. Set scheduled refresh: Daily after pipeline completes (~3AM IST)

---

## Step 2: Data Model Relationships

Set up these relationships in Power BI Model view:

| From Table            | From Col        | To Table              | To Col      |
|-----------------------|-----------------|-----------------------|-------------|
| kpi_01_revenue_by_job | customer_id     | dim_customers         | customer_id |
| kpi_01_revenue_by_job | class_id        | dim_classes           | class_id    |
| kpi_02_aged_ar        | customer_id     | dim_customers         | customer_id |
| kpi_03_aged_ap        | vendor_id       | dim_vendors           | vendor_id   |
| kpi_04_job_profitability | class_id     | dim_classes           | class_id    |
| kpi_07_vendor_spend   | vendor_id       | dim_vendors           | vendor_id   |

---

## Step 3: DAX Measures

Paste these into a dedicated "Measures" table in Power BI:

```dax
-- ── KPI 1: Total Revenue ─────────────────────────────────────
Total Revenue =
SUM(kpi_01_revenue_by_job[total_revenue_excl_tax])

Revenue MTD =
CALCULATE(
    [Total Revenue],
    DATESMTD(kpi_01_revenue_by_job[revenue_month])
)

Revenue YTD =
CALCULATE(
    [Total Revenue],
    DATESYTD(kpi_01_revenue_by_job[revenue_month])
)

Revenue vs Prior Month =
VAR CurrentRev = [Total Revenue]
VAR PriorRev =
    CALCULATE(
        [Total Revenue],
        DATEADD(kpi_01_revenue_by_job[revenue_month], -1, MONTH)
    )
RETURN
    DIVIDE(CurrentRev - PriorRev, PriorRev, 0)

-- ── KPI 2: Accounts Receivable ────────────────────────────────
Total AR Outstanding =
SUM(kpi_02_aged_ar[balance_remaining])

AR Current =
CALCULATE(
    [Total AR Outstanding],
    kpi_02_aged_ar[aging_bucket] = "Current"
)

AR 1-30 Days =
CALCULATE(
    [Total AR Outstanding],
    kpi_02_aged_ar[aging_bucket] = "1-30 Days"
)

AR 31-60 Days =
CALCULATE(
    [Total AR Outstanding],
    kpi_02_aged_ar[aging_bucket] = "31-60 Days"
)

AR 61-90 Days =
CALCULATE(
    [Total AR Outstanding],
    kpi_02_aged_ar[aging_bucket] = "61-90 Days"
)

AR 90+ Days =
CALCULATE(
    [Total AR Outstanding],
    kpi_02_aged_ar[aging_bucket] = "90+ Days"
)

AR Collection Rate % =
DIVIDE(
    [AR Current] + [AR 1-30 Days],
    [Total AR Outstanding],
    0
) * 100

-- ── KPI 3: Accounts Payable ───────────────────────────────────
Total AP Outstanding =
SUM(kpi_03_aged_ap[balance_remaining])

AP Current =
CALCULATE(
    [Total AP Outstanding],
    kpi_03_aged_ap[aging_bucket] = "Current (0-30)"
)

-- ── KPI 4: Job Profitability ──────────────────────────────────
Total Job Revenue =
SUM(kpi_04_job_profitability[total_revenue])

Total Job Cost =
SUM(kpi_04_job_profitability[total_cost])

Gross Profit =
[Total Job Revenue] - [Total Job Cost]

Gross Margin % =
DIVIDE([Gross Profit], [Total Job Revenue], 0) * 100

-- ── KPI 5: Estimate vs Actual ─────────────────────────────────
Total Estimated =
SUM(kpi_05_estimate_vs_actual[total_estimated])

Total Invoiced (Actual) =
SUM(kpi_05_estimate_vs_actual[total_invoiced])

Estimate Variance =
SUM(kpi_05_estimate_vs_actual[variance])

Estimate Variance % =
DIVIDE([Estimate Variance], [Total Estimated], 0) * 100

-- ── KPI 6: DSO ────────────────────────────────────────────────
Avg DSO Days =
AVERAGE(kpi_06_dso[avg_days_to_collect])

-- ── KPI 7: Vendor Spend ───────────────────────────────────────
Total Vendor Spend =
CALCULATE(
    SUM(kpi_07_vendor_spend[spend_amount]),
    kpi_07_vendor_spend[spend_source] <> "vendor_credit"
)

Net Vendor Spend =
SUM(kpi_07_vendor_spend[spend_amount])

Vendor Credit Amount =
CALCULATE(
    ABS(SUM(kpi_07_vendor_spend[spend_amount])),
    kpi_07_vendor_spend[spend_source] = "vendor_credit"
)

-- ── KPI 8: PO Fulfillment ─────────────────────────────────────
PO Fulfillment Rate % =
AVERAGE(kpi_08_po_fulfillment[fulfillment_pct])

PO Fully Received Count =
CALCULATE(
    COUNTROWS(kpi_08_po_fulfillment),
    kpi_08_po_fulfillment[fulfillment_status] = "Fully Received"
)

PO Overdue Count =
CALCULATE(
    COUNTROWS(kpi_08_po_fulfillment),
    kpi_08_po_fulfillment[days_overdue] > 0,
    kpi_08_po_fulfillment[fulfillment_status] <> "Fully Received"
)

-- ── KPI 9: Cash Flow ──────────────────────────────────────────
Total Cash Inflow =
SUM(kpi_09_cash_flow[inflow])

Total Cash Outflow =
SUM(kpi_09_cash_flow[outflow])

Net Cash Flow =
[Total Cash Inflow] - [Total Cash Outflow]

-- ── KPI 10: Backlog ───────────────────────────────────────────
Total Backlog =
SUM(kpi_10_backlog[backlog_amount])

Backlog Job Count =
COUNTROWS(kpi_10_backlog)

Overdue Backlog =
CALCULATE(
    SUM(kpi_10_backlog[backlog_amount]),
    kpi_10_backlog[days_overdue] > 0
)
```

---

## Step 4: Dashboard Pages Layout

### Page 1 — Executive Summary
| Visual | Type | Fields |
|--------|------|--------|
| Total Revenue MTD | KPI Card | Revenue MTD |
| Total AR Outstanding | KPI Card | Total AR Outstanding |
| Gross Margin % | KPI Card | Gross Margin % |
| Net Cash Flow | KPI Card | Net Cash Flow |
| Revenue by Month | Line Chart | revenue_month, Total Revenue |
| Revenue by Class | Donut Chart | class_name, Total Revenue |
| Top 10 Customers by Revenue | Bar Chart | customer_name, Total Revenue |

### Page 2 — Accounts Receivable (KPI 2 + 6)
| Visual | Type | Fields |
|--------|------|--------|
| AR Aging Summary | Stacked Bar | aging_bucket, balance_remaining |
| AR by Customer | Table | customer_name, Current, 1-30, 31-60, 61-90, 90+ |
| DSO Trend | Line Chart | invoice_month, Avg DSO Days |
| AR Outstanding Gauge | Gauge | Total AR Outstanding |
| Overdue Invoice List | Table | ref_number, customer_name, due_date, days_overdue, balance_remaining |

### Page 3 — Accounts Payable (KPI 3 + 7)
| Visual | Type | Fields |
|--------|------|--------|
| AP Aging Summary | Stacked Bar | aging_bucket, balance_remaining |
| Vendor Spend by Month | Column Chart | spend_month, Total Vendor Spend |
| Top Vendors by Spend | Bar Chart | vendor_name, Net Vendor Spend |
| Spend by Type | Treemap | expense_account_name, spend_amount |
| Vendor Credits | Table | vendor_name, credit_amount |

### Page 4 — Job Profitability (KPI 4 + 5)
| Visual | Type | Fields |
|--------|------|--------|
| Revenue vs Cost by Class | Clustered Bar | class_name, Total Job Revenue, Total Job Cost |
| Gross Margin % by Class | Bar Chart | class_name, Gross Margin % |
| Estimate vs Actual | Clustered Bar | customer_name, Total Estimated, Total Invoiced (Actual) |
| Variance Table | Table | customer_name, class_name, total_estimated, total_invoiced, variance_pct |

### Page 5 — Operations (KPI 8 + 9 + 10)
| Visual | Type | Fields |
|--------|------|--------|
| PO Fulfillment Rate | Gauge | PO Fulfillment Rate % |
| PO Status Breakdown | Donut | fulfillment_status, count |
| Overdue POs | Table | ref_number, vendor_name, expected_date, days_overdue |
| Cash Flow Waterfall | Waterfall Chart | transaction_type, net_cash_flow |
| Cash Inflow vs Outflow | Line Chart | flow_month, Total Cash Inflow, Total Cash Outflow |
| Backlog by Customer | Bar Chart | customer_name, backlog_amount |
| Total Backlog KPI | KPI Card | Total Backlog |

---

## Step 5: Slicers (Filters — add to all pages)

- Date Range (revenue_month / transaction_date)
- Class Name (New Construction / Remodel / etc.)
- Customer Name
- Vendor Name

---

## Step 6: Publish & Schedule Refresh

1. File → Publish → Publish to Power BI Service
2. In Power BI Service:
   - Datasets → Settings → Scheduled Refresh
   - Set to Daily, 3:30 AM IST (after pipeline finishes)
   - Add BigQuery credentials (OAuth2 service account)
3. Share workspace with stakeholders
4. Set up Row Level Security (RLS) if needed per user role
