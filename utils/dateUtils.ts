
/**
 * Trả về chuỗi ngày ISO theo giờ địa phương (YYYY-MM-DD)
 * Tránh lỗi của .toISOString() bị lệch múi giờ UTC
 */
export const toLocalISODate = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

/**
 * Kiểm tra xem một chuỗi timestamp có hợp lệ không
 */
export const isValidTimestamp = (ts: string): boolean => {
  const d = new Date(ts.replace(' ', 'T'));
  return !isNaN(d.getTime());
};
