// includes/silver_helpers.js
// Dynamic SQL generation helpers for Silver layer — mirrors your Bronze pattern

/**
 * Generates a SAFE_CAST expression for common QB field types
 */
function castField(col, dataType) {
  switch (dataType) {
    case 'TIMESTAMP':
      return `SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', ${col}) AS ${col.replace(/`/g, '')}`;
    case 'DATE':
      return `SAFE.PARSE_DATE('%Y-%m-%d', ${col}) AS ${col.replace(/`/g, '')}`;
    case 'NUMERIC':
      return `SAFE_CAST(${col} AS NUMERIC) AS ${col.replace(/`/g, '')}`;
    case 'BOOLEAN':
      return `SAFE_CAST(${col} AS BOOL) AS ${col.replace(/`/g, '')}`;
    case 'INTEGER':
      return `SAFE_CAST(${col} AS INT64) AS ${col.replace(/`/g, '')}`;
    default:
      return `TRIM(${col}) AS ${col.replace(/`/g, '')}`;
  }
}

/**
 * Generates a full Silver cleaning SELECT block from a field config array
 * fieldConfig: [{ name: 'col', type: 'DATE' }, ...]
 */
function generateSilverSelect(fieldConfigs) {
  return fieldConfigs
    .map(f => {
      const col = `\`${f.name}\``;
      return `  ${castField(col, f.type)}`;
    })
    .join(',\n');
}

/**
 * Generates dedup CTE using ROW_NUMBER on a primary key
 * pkCols: array of column names to partition by
 * orderByCol: column to use for picking latest row (e.g. '_extracted_at')
 */
function dedupCTE(sourceFQN, pkCols, orderByCol = '_extracted_at') {
  const partitionBy = pkCols.map(c => `\`${c}\``).join(', ');
  return `
  deduped AS (
    SELECT *,
      ROW_NUMBER() OVER (
        PARTITION BY ${partitionBy}
        ORDER BY \`${orderByCol}\` DESC
      ) AS _row_num
    FROM ${sourceFQN}
    WHERE ${pkCols.map(c => `\`${c}\` IS NOT NULL`).join(' AND ')}
  )`;
}

/**
 * Standard WHERE clause to filter only latest dedup row + non-null pk
 */
function dedupFilter() {
  return `WHERE _row_num = 1`;
}

/**
 * Generates full Silver SQLX config block
 */
function silverConfig(tableName, tags = ['silver']) {
  return `
config {
  type: "table",
  schema: dataform.projectConfig.vars.silver_dataset,
  name: "${tableName}",
  tags: ${JSON.stringify(tags)},
  description: "Silver layer: cleaned and typed ${tableName}",
  bigquery: {
    partitionBy: "DATE(_extracted_at)",
    clusterBy: ["id"]
  }
}`;
}

/**
 * Builds a split-flattened CTE for repeated (array-like) fields
 * in QB flat CSVs (lines__, expenseLines__, itemLines__, etc.)
 * Bronze stores these as repeated rows — this labels them as line items
 */
function lineItemCTE(sourceFQN, headerPk, linePrefix) {
  return `
  line_items AS (
    SELECT *
    FROM ${sourceFQN}
    WHERE \`${linePrefix}id\` IS NOT NULL
      AND \`${headerPk}\` IS NOT NULL
  )`;
}

module.exports = {
  castField,
  generateSilverSelect,
  dedupCTE,
  dedupFilter,
  silverConfig,
  lineItemCTE
};
