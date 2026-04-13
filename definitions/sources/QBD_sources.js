const tables = ['accounts','account_tax_lines','bill_check_payments','bills','classes','customer_types',
'customers','estimates','inventory_adjustments','inventory_items','journal_entries','other_charge_items',
'payment_methods','sales_tax_codes','sales_tax_items','service_items','shipping_methods','standard_terms',
'templates','transactions','unit_of_measure_sets','vendors','checks','employees','invoices','item_groups',
'item_receipts','non_inventory_items','price_levels','purchase_orders','receive_payments','sales_orders',
'sales_receipts','transfers','vendor_credits'];

tables.forEach(tableName => {
  declare({
    schema: "qdb_new",
    name: tableName
  });
});