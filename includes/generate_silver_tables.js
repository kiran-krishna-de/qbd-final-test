// ============================================================
// includes/generate_silver_tables.js
// Dynamic Dataform JS — generates Silver cleaning sqlx for
// all bronze tables using config-driven approach
// (mirrors your existing Bronze raw→bronze JS pattern)
// ============================================================

/**
 * Master config for all 28 Bronze tables
 * Defines pk, partition, cluster, and field type overrides
 */
const SILVER_TABLE_CONFIG = [
  {
    bronzeTable: "accounts",
    silverTable: "dim_accounts",
    pk: ["id"],
    partitionCol: "_extracted_at",
    clusterCols: ["id"],
    tags: ["silver", "dimensions"],
    fieldTypes: {
      balance: "NUMERIC", totalBalance: "NUMERIC",
      isActive: "BOOLEAN", isTaxAccount: "BOOLEAN",
      sublevel: "INTEGER", createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "customers",
    silverTable: "dim_customers",
    pk: ["id"],
    partitionCol: "_extracted_at",
    clusterCols: ["id"],
    tags: ["silver", "dimensions"],
    fieldTypes: {
      balance: "NUMERIC", totalBalance: "NUMERIC", creditLimit: "NUMERIC",
      isActive: "BOOLEAN", sublevel: "INTEGER",
      jobStartDate: "DATE", jobEndDate: "DATE", jobProjectedEndDate: "DATE",
      createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "vendors",
    silverTable: "dim_vendors",
    pk: ["id"],
    partitionCol: "_extracted_at",
    clusterCols: ["id"],
    tags: ["silver", "dimensions"],
    fieldTypes: {
      balance: "NUMERIC", isActive: "BOOLEAN",
      isEligibleFor1099: "BOOLEAN", isSalesTaxAgency: "BOOLEAN",
      createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "employees",
    silverTable: "dim_employees",
    pk: ["id"],
    partitionCol: "_extracted_at",
    clusterCols: ["id"],
    tags: ["silver", "dimensions"],
    fieldTypes: {
      isActive: "BOOLEAN", targetBonus: "NUMERIC",
      hiredDate: "DATE", createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "classes",
    silverTable: "dim_classes",
    pk: ["id"],
    partitionCol: "_extracted_at",
    clusterCols: ["id"],
    tags: ["silver", "dimensions"],
    fieldTypes: {
      isActive: "BOOLEAN", sublevel: "INTEGER",
      createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "payment_methods",
    silverTable: "dim_payment_methods",
    pk: ["id"],
    partitionCol: "_extracted_at",
    clusterCols: ["id"],
    tags: ["silver", "dimensions"],
    fieldTypes: {
      isActive: "BOOLEAN", createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "sales_tax_codes",
    silverTable: "dim_sales_tax_codes",
    pk: ["id"],
    partitionCol: "_extracted_at",
    clusterCols: ["id"],
    tags: ["silver", "dimensions"],
    fieldTypes: {
      isActive: "BOOLEAN", isTaxable: "BOOLEAN",
      createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "sales_tax_items",
    silverTable: "dim_sales_tax_items",
    pk: ["id"],
    partitionCol: "_extracted_at",
    clusterCols: ["id"],
    tags: ["silver", "dimensions"],
    fieldTypes: {
      isActive: "BOOLEAN", taxRate: "NUMERIC",
      createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "account_tax_lines",
    silverTable: "dim_account_tax_lines",
    pk: ["taxLineId"],
    partitionCol: "_extracted_at",
    clusterCols: ["taxLineId"],
    tags: ["silver", "dimensions"],
    fieldTypes: {}
  },
  {
    bronzeTable: "invoices",
    silverTable: "fct_invoices",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["customer__id", "class__id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      subtotal: "NUMERIC", salesTaxTotal: "NUMERIC",
      salesTaxPercentage: "NUMERIC", appliedAmount: "NUMERIC",
      balanceRemaining: "NUMERIC", isPaid: "BOOLEAN",
      isPending: "BOOLEAN", isFinanceCharge: "BOOLEAN",
      transactionDate: "DATE", dueDate: "DATE",
      createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "bills",
    silverTable: "fct_bills",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["payee__id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      amount: "NUMERIC", balanceRemaining: "NUMERIC",
      transactionDate: "DATE", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "checks",
    silverTable: "fct_checks",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["payee__id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      amount: "NUMERIC", expenseLines__amount: "NUMERIC",
      transactionDate: "DATE", createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "estimates",
    silverTable: "fct_estimates",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["customer__id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      subtotal: "NUMERIC", totalAmount: "NUMERIC", salesTaxTotal: "NUMERIC",
      salesTaxPercentage: "NUMERIC", isActive: "BOOLEAN",
      isQueuedForEmail: "BOOLEAN", transactionDate: "DATE", dueDate: "DATE",
      createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "purchase_orders",
    silverTable: "fct_purchase_orders",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["vendor__id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      totalAmount: "NUMERIC", isFullyReceived: "BOOLEAN",
      isManuallyClosed: "BOOLEAN", lines__quantity: "NUMERIC",
      lines__receivedQuantity: "NUMERIC", lines__amount: "NUMERIC",
      lines__rate: "NUMERIC", lines__isBilled: "BOOLEAN",
      transactionDate: "DATE", dueDate: "DATE", expectedDate: "DATE",
      createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "receive_payments",
    silverTable: "fct_receive_payments",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["customer__id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      totalAmount: "NUMERIC", unusedCredits: "NUMERIC",
      unusedPayment: "NUMERIC", appliedToTransactions__amount: "NUMERIC",
      appliedToTransactions__balanceRemaining: "NUMERIC",
      appliedToTransactions__discountAmount: "NUMERIC",
      transactionDate: "DATE", createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "sales_receipts",
    silverTable: "fct_sales_receipts",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["customer__id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      subtotal: "NUMERIC", salesTaxTotal: "NUMERIC",
      salesTaxPercentage: "NUMERIC", totalAmount: "NUMERIC",
      isPending: "BOOLEAN", transactionDate: "DATE", dueDate: "DATE",
      shippingDate: "DATE", createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "sales_orders",
    silverTable: "fct_sales_orders",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["customer__id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      subtotal: "NUMERIC", salesTaxTotal: "NUMERIC",
      salesTaxPercentage: "NUMERIC", totalAmount: "NUMERIC",
      isFullyInvoiced: "BOOLEAN", isManuallyClosed: "BOOLEAN",
      isQueuedForEmail: "BOOLEAN", isQueuedForPrint: "BOOLEAN",
      transactionDate: "DATE", dueDate: "DATE", shippingDate: "DATE",
      createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "transactions",
    silverTable: "fct_transactions",
    pk: ["transactionId"],
    partitionCol: "transactionDate",
    clusterCols: ["transactionType"],
    tags: ["silver", "facts"],
    fieldTypes: {
      amount: "NUMERIC", amountInHomeCurrency: "NUMERIC",
      exchangeRate: "NUMERIC", transactionDate: "DATE",
      createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "journal_entries",
    silverTable: "fct_journal_entries",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      isAdjustment: "BOOLEAN", isHomeCurrencyAdjustment: "BOOLEAN",
      areAmountsEnteredInHomeCurrency: "BOOLEAN",
      exchangeRate: "NUMERIC",
      transactionDate: "DATE", createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "transfers",
    silverTable: "fct_transfers",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["sourceAccount__id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      amount: "NUMERIC", sourceAccountBalance: "NUMERIC",
      targetAccountBalance: "NUMERIC",
      transactionDate: "DATE", createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "vendor_credits",
    silverTable: "fct_vendor_credits",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["vendor__id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      creditAmount: "NUMERIC", openAmount: "NUMERIC",
      creditAmountInHomeCurrency: "NUMERIC", exchangeRate: "NUMERIC",
      transactionDate: "DATE", createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "bill_check_payments",
    silverTable: "fct_bill_check_payments",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["vendor__id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      amount: "NUMERIC", amountInHomeCurrency: "NUMERIC",
      exchangeRate: "NUMERIC", isQueuedForPrint: "BOOLEAN",
      appliedToTransactions__amount: "NUMERIC",
      appliedToTransactions__balanceRemaining: "NUMERIC",
      transactionDate: "DATE", createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  },
  {
    bronzeTable: "item_receipts",
    silverTable: "fct_item_receipts",
    pk: ["id"],
    partitionCol: "transactionDate",
    clusterCols: ["vendor__id"],
    tags: ["silver", "facts"],
    fieldTypes: {
      totalAmount: "NUMERIC", itemLines__amount: "NUMERIC",
      itemLines__cost: "NUMERIC", itemLines__quantity: "NUMERIC",
      transactionDate: "DATE", createdAt: "TIMESTAMP", updatedAt: "TIMESTAMP"
    }
  }
];

/**
 * Generates a SAFE_CAST expression for a column
 */
function getCastExpression(colName, fieldTypes) {
  const t = fieldTypes[colName];
  const quoted = `\`${colName}\``;
  if (!t) return `TRIM(CAST(${quoted} AS STRING)) AS \`${colName}\``;

  switch (t) {
    case "NUMERIC":
      return `SAFE_CAST(${quoted} AS NUMERIC) AS \`${colName}\``;
    case "BOOLEAN":
      return `SAFE_CAST(${quoted} AS BOOL) AS \`${colName}\``;
    case "INTEGER":
      return `SAFE_CAST(${quoted} AS INT64) AS \`${colName}\``;
    case "DATE":
      return `SAFE.PARSE_DATE('%Y-%m-%d', ${quoted}) AS \`${colName}\``;
    case "TIMESTAMP":
      return `SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', ${quoted}) AS \`${colName}\``;
    default:
      return `TRIM(CAST(${quoted} AS STRING)) AS \`${colName}\``;
  }
}

/**
 * Generates a complete Silver SQLX file content for a given table config
 * Used for tables not requiring custom logic (simple clean + dedup)
 */
function generateSilverSQL(cfg) {
  const pkList = cfg.pk.map(p => `\`${p}\``).join(", ");
  const pkNotNull = cfg.pk.map(p => `\`${p}\` IS NOT NULL`).join(" AND ");
  const partitionDirective = cfg.partitionCol === "_extracted_at"
    ? `DATE(_extracted_at)`
    : `SAFE.PARSE_DATE('%Y-%m-%d', \`${cfg.partitionCol}\`)`;
  const clusterList = cfg.clusterCols.map(c => `"${c}"`).join(", ");

  return `
config {
  type: "table",
  schema: dataform.projectConfig.vars.silver_dataset,
  name: "${cfg.silverTable}",
  tags: ${JSON.stringify(cfg.tags)},
  description: "Silver: auto-generated clean table for ${cfg.bronzeTable}",
  bigquery: {
    partitionBy: "${partitionDirective}",
    clusterBy: [${clusterList}]
  }
}

WITH deduped AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY ${pkList}
      ORDER BY \`_extracted_at\` DESC
    ) AS _row_num
  FROM \${ref("qb_bronze", "${cfg.bronzeTable}")}
  WHERE ${pkNotNull}
)
SELECT
  * EXCEPT(_row_num)
FROM deduped
WHERE _row_num = 1
  AND _extracted_at IS NOT NULL
`.trim();
}

// Export for use in Dataform .js operation files
module.exports = {
  SILVER_TABLE_CONFIG,
  getCastExpression,
  generateSilverSQL
};
