// Case-insensitive substring search across common product fields.
// Suitable for POS "search as you type" (name, brand, SKU, barcode).
export function productSearchFilter(term) {
  if (!term) return null;
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = { $regex: safe, $options: 'i' };
  return { $or: [{ name: regex }, { brand: regex }, { sku: regex }, { barcode: regex }] };
}

// Merge a search filter into an existing filter object.
export function withSearch(filter, term, fields = ['name', 'brand', 'sku', 'barcode']) {
  if (!term) return filter;
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = { $regex: safe, $options: 'i' };
  return { ...filter, $or: fields.map((f) => ({ [f]: regex })) };
}
