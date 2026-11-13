/**
 * Local Date Formatting Utilities
 * Resolves UTC vs Local timezone offset discrepancies (e.g. IST UTC+5:30 late night 12am-5:30am)
 */
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
