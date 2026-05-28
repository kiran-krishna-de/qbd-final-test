// includes/helpers.js

/**
 * Builds a SELECT clause from a list of column names.
 * Columns using double-underscore (__) are treated as nested JSON paths.
 * Single-underscore columns like createdAt, isActive are treated as flat keys.
 *
 * Usage in SQLX:
 *   const { buildJsonSelect } = require("../includes/helpers.js");
 *   const select_sql = buildJsonSelect(columns);
 *
 * Example:
 *   "createdAt"                  → JSON_VALUE(raw_payload, '$.createdAt') AS createdAt
 *   "taxLineDetails__taxLineId"  → JSON_VALUE(raw_payload, '$.taxLineDetails.taxLineId') AS taxLineDetails__taxLineId
 */
function buildJsonSelect(columns, json_col = "raw_payload") {
  return columns.map(col => {
    // Only double-underscore (__) signals a nested path — single underscore is left as-is
    const json_path = col.replace(/__/g, ".");
    return `JSON_VALUE(${json_col}, '$.${json_path}') AS ${col}`;
  }).join(",\n  ");
}

// const inc = () =>
//   `${when(incremental(), `AND JSON_VALUE(raw_payload,'$.updatedAt') > (SELECT coalesce(MAX(updatedAt),'01-01-1900') FROM ${self()})`) }`;

const FULL_REFRESH_TABLES = [
  "account_tax_lines"
];

const inc = (ctx, tableName) => {
  // Skip incremental filter for selected tables
  if (FULL_REFRESH_TABLES.includes(tableName)) {
    return "";
  }

  return ctx.when(
    ctx.incremental(),
    `AND JSON_VALUE(raw_payload, '$.updatedAt') >
     (SELECT COALESCE(MAX(updatedAt), '1900-01-01') FROM ${ctx.self()})`
  );
};




// Safe extractors from parsed JSON column named 'raw'
const str  = (path) => `NULLIF(TRIM(STRING(raw.${path})), '')`;
const dt   = (path) => `SAFE.DATE(STRING(raw.${path}))`;
const ts   = (path) => `SAFE.TIMESTAMP(STRING(raw.${path}))`;
const num  = (path) => `CAST(SAFE_CAST(STRING(raw.${path}) AS FLOAT64) AS NUMERIC)`;
const bool = (path) => `SAFE_CAST(STRING(raw.${path}) AS BOOL)`;

const costType = (expr) => `
  CASE
    WHEN LOWER(${expr}) LIKE '%labour%' OR LOWER(${expr}) LIKE '%labor%'
      OR LOWER(${expr}) LIKE '%crew%'                         THEN 'Labour'
    WHEN LOWER(${expr}) LIKE '%material%' OR LOWER(${expr}) LIKE '%supply%'
      OR LOWER(${expr}) LIKE '%asphalt%'                      THEN 'Material'
    WHEN LOWER(${expr}) LIKE '%sub%' OR LOWER(${expr}) LIKE '%contract%'
                                                              THEN 'Subcontractor'
    WHEN LOWER(${expr}) LIKE '%equip%' OR LOWER(${expr}) LIKE '%machine%'
      OR LOWER(${expr}) LIKE '%vehicle%'                      THEN 'Equipment'
    WHEN LOWER(${expr}) LIKE '%overhead%'                     THEN 'Overhead'
    ELSE 'Other'
  END`;

const agingBucket = (due, paid) => `
  CASE
    WHEN ${paid}                                               THEN 'Paid'
    WHEN DATE_DIFF(CURRENT_DATE(), ${due}, DAY) <= 0          THEN 'Current'
    WHEN DATE_DIFF(CURRENT_DATE(), ${due}, DAY) <= 30         THEN '1-30 Days'
    WHEN DATE_DIFF(CURRENT_DATE(), ${due}, DAY) <= 60         THEN '31-60 Days'
    WHEN DATE_DIFF(CURRENT_DATE(), ${due}, DAY) <= 90         THEN '61-90 Days'
    ELSE '90+ Days'
  END`;

module.exports = { buildJsonSelect, inc, str, dt, ts, num, bool, costType, agingBucket };