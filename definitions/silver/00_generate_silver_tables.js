// definitions/silver/00_generate_silver_tables.js
// ============================================================
// Dynamically generates Silver table definitions for simple
// tables using the config in includes/generate_silver_tables.js
// Complex tables (invoices, bills, etc.) have hand-crafted sqlx
// This file handles all remaining reference/lookup tables
// ============================================================

const { SILVER_TABLE_CONFIG, generateSilverSQL } = require("../../includes/generate_silver_tables");

// Tables handled by hand-crafted sqlx (skip auto-generation)
const MANUAL_TABLES = new Set([
  "invoices", "bills", "checks", "estimates", "purchase_orders",
  "receive_payments", "sales_receipts", "transactions",
  "vendor_credits", "item_receipts", "accounts", "customers",
  "vendors", "employees", "classes",
  "inventory_items", "service_items", "non_inventory_items"
]);

// Auto-generate Silver tables for all remaining configs
SILVER_TABLE_CONFIG
  .filter(cfg => !MANUAL_TABLES.has(cfg.bronzeTable))
  .forEach(cfg => {
    publish(cfg.silverTable, {
      type: "table",
      schema: dataform.projectConfig.vars.silver_dataset,
      tags: cfg.tags,
      description: `Silver: auto-generated clean table for ${cfg.bronzeTable}`,
      bigquery: {
        partitionBy: `DATE(_extracted_at)`,
        clusterBy: cfg.clusterCols
      }
    }).query(ctx => `
      WITH deduped AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY ${cfg.pk.map(p => `\`${p}\``).join(", ")}
            ORDER BY _extracted_at DESC
          ) AS _row_num
        FROM ${ctx.ref("qdb_bronze", cfg.bronzeTable)}
        WHERE ${cfg.pk.map(p => `\`${p}\` IS NOT NULL`).join(" AND ")}
      )
      SELECT * EXCEPT(_row_num)
      FROM deduped
      WHERE _row_num = 1
    `);
  });


// ============================================================
// definitions/gold/00_generate_gold_summaries.js
// Dynamically generates monthly rollup Gold tables
// for all Silver fact tables
// ============================================================

const GOLD_ROLLUP_CONFIG = [
  {
    goldTable: "gold_invoices_monthly",
    silverTable: "fct_invoices",
    dateCol: "transaction_date",
    measures: [
      { col: "subtotal",          agg: "SUM",   alias: "total_revenue"    },
      { col: "sales_tax_total",   agg: "SUM",   alias: "total_tax"        },
      { col: "balance_remaining", agg: "SUM",   alias: "total_ar_balance" },
      { col: "invoice_id",        agg: "COUNT", alias: "invoice_count"    }
    ],
    dimensions: ["customer_id", "customer_full_name", "class_id", "class_name"],
    filters: ["is_finance_charge = FALSE"]
  },
  {
    goldTable: "gold_bills_monthly",
    silverTable: "fct_bills",
    dateCol: "transaction_date",
    measures: [
      { col: "amount",            agg: "SUM",   alias: "total_spend"   },
      { col: "balance_remaining", agg: "SUM",   alias: "total_ap_balance" },
      { col: "bill_id",           agg: "COUNT", alias: "bill_count"    }
    ],
    dimensions: ["vendor_id", "vendor_name", "class_id", "class_name"],
    filters: []
  },
  {
    goldTable: "gold_payments_monthly",
    silverTable: "fct_receive_payments",
    dateCol: "transaction_date",
    measures: [
      { col: "total_amount",   agg: "SUM",   alias: "total_collected" },
      { col: "payment_id",     agg: "COUNT", alias: "payment_count"   }
    ],
    dimensions: ["customer_id", "customer_full_name", "payment_method"],
    filters: []
  }
];

function buildMeasureSQL(measure) {
  if (measure.agg === "COUNT") {
    return `COUNT(DISTINCT ${measure.col}) AS ${measure.alias}`;
  }
  return `${measure.agg}(${measure.col}) AS ${measure.alias}`;
}

GOLD_ROLLUP_CONFIG.forEach(cfg => {
  const dimList = cfg.dimensions.join(", ");
  const measureSQL = cfg.measures.map(buildMeasureSQL).join(",\n    ");
  const filterSQL = cfg.filters.length > 0
    ? `WHERE ${cfg.filters.join(" AND ")}`
    : "";

  publish(cfg.goldTable, {
    type: "table",
    schema: dataform.projectConfig.vars.gold_dataset,
    tags: ["gold", "rollup"],
    description: `Gold: monthly rollup for ${cfg.silverTable}`,
    bigquery: {
      partitionBy: "period_month",
      clusterBy: cfg.dimensions.slice(0, 4)
    }
  }).query(ctx => `
    SELECT
      DATE_TRUNC(${cfg.dateCol}, MONTH) AS period_month,
      ${dimList},
      ${measureSQL},
      CURRENT_TIMESTAMP() AS _refreshed_at
    FROM ${ctx.ref(dataform.projectConfig.vars.silver_dataset, cfg.silverTable)}
    ${filterSQL}
    GROUP BY
      period_month,
      ${dimList}
    ORDER BY period_month DESC
  `);
});
