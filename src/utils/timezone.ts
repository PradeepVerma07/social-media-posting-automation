/**
 * Indian Standard Time (IST - Asia/Kolkata) Utility
 * Matches n8n's display format: e.g. "Oct 25, 02:15:40"
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Normalizes input timestamp string into a valid Date object assuming UTC if no timezone is provided
 */
export function normalizeToUtcDate(dateInput: string | number | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);

  let str = String(dateInput).trim();
  if (!str) return null;

  // Handle format like "2026-10-24 20:45:40.044" or "2026-10-24 20:45:40"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T');
    if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
      str += 'Z';
    }
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
    if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
      str += 'Z';
    }
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats time in Indian Standard Time: e.g. "02:15:40"
 */
export function formatISTTime(
  dateInput: string | number | Date | null | undefined,
  includeSeconds = true
): string {
  const d = normalizeToUtcDate(dateInput);
  if (!d) return '--:--:--';
  return d.toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  });
}

/**
 * Formats date and time in Indian Standard Time matching n8n UI exactly: e.g. "Oct 25, 02:15:40"
 */
export function formatISTDateTime(
  dateInput: string | number | Date | null | undefined,
  includeSeconds = true
): string {
  const d = normalizeToUtcDate(dateInput);
  if (!d) return '—';
  return d.toLocaleString('en-US', {
    timeZone: IST_TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  });
}

/**
 * Formats date and time in short format: e.g. "Oct 25, 02:15"
 */
export function formatISTShort(
  dateInput: string | number | Date | null | undefined
): string {
  return formatISTDateTime(dateInput, false);
}

/**
 * Formats date in Indian Standard Time: e.g. "Oct 25" or "Oct 25, 2026"
 */
export function formatISTDate(
  dateInput: string | number | Date | null | undefined,
  includeYear = false
): string {
  const d = normalizeToUtcDate(dateInput);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', {
    timeZone: IST_TIMEZONE,
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
}

/**
 * Converts a UTC/ISO timestamp into IST HTML form inputs: date (YYYY-MM-DD) and time (HH:mm)
 */
export function toISTInputValues(dateInput: string | number | Date | null | undefined): { date: string; time: string } {
  const d = normalizeToUtcDate(dateInput) || new Date();
  const date = d.toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE }); // YYYY-MM-DD
  const time = d.toLocaleTimeString('en-GB', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return { date, time };
}

/**
 * Converts IST date ("2026-10-25") and time ("02:15") input into an ISO UTC timestamp
 */
export function fromISTInputValues(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  // IST is UTC+5:30 -> UTC is IST - 5 hours 30 mins
  const utcDate = new Date(Date.UTC(y, m - 1, d, hh - 5, mm - 30, 0));
  return utcDate.toISOString();
}
