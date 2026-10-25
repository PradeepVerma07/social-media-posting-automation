import { DateTime, IANAZone } from 'luxon';

export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata';

export function isValidIanaZone(zone: string): boolean {
  return IANAZone.isValidZone(zone);
}

/**
 * Normalizes input timestamp or SQLite string (e.g. "2026-10-24 20:45:40.044") to a UTC DateTime
 */
export function parseToUtc(dateInput: string | Date | number | null | undefined): DateTime | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return DateTime.fromJSDate(dateInput, { zone: 'utc' });
  }
  if (typeof dateInput === 'number') {
    return DateTime.fromMillis(dateInput, { zone: 'utc' });
  }

  let str = String(dateInput).trim();
  if (!str) return null;

  // If it's a format without T or Z, e.g. "2026-10-24 20:45:40.044"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T');
    if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
      str += 'Z';
    }
  }

  const dt = DateTime.fromISO(str, { zone: 'utc' });
  return dt.isValid ? dt : null;
}

/**
 * Derives scheduled_utc ISO string from human local date and time in a given timezone
 */
export function fromZone(
  localDate: string,
  localTime: string,
  zone: string = DEFAULT_TIMEZONE
): { scheduledUtc: string; normalizedTime: string } {
  const safeZone = isValidIanaZone(zone) ? zone : DEFAULT_TIMEZONE;
  const cleanDate = localDate.trim();
  let cleanTime = localTime.trim();

  // Ensure HH:mm:ss format
  if (/^\d{1,2}:\d{2}$/.test(cleanTime)) {
    cleanTime += ':00';
  } else if (/^\d{1,2}:\d{2}:\d{2}$/.test(cleanTime)) {
    // fine
  } else {
    throw new Error(`Invalid time format "${localTime}". Expected HH:mm or HH:mm:ss`);
  }

  const parts = cleanTime.split(':').map(p => p.padStart(2, '0'));
  cleanTime = parts.join(':');

  const combined = `${cleanDate}T${cleanTime}`;
  const dt = DateTime.fromISO(combined, { zone: safeZone });
  if (!dt.isValid) {
    throw new Error(`Invalid local date/time: "${combined}" in timezone "${safeZone}": ${dt.invalidExplanation}`);
  }

  const scheduledUtc = dt.toUTC().toISO();
  if (!scheduledUtc) {
    throw new Error(`Failed to convert "${combined}" to UTC`);
  }

  return {
    scheduledUtc,
    normalizedTime: cleanTime,
  };
}

/**
 * Converts a UTC timestamp into target timezone components and formatted strings
 */
export function toZone(
  utcDateInput: string | Date | number | null | undefined,
  zone: string = DEFAULT_TIMEZONE
): {
  localDate: string;
  localTime: string;
  displayDateTime: string;
  displayTime: string;
} {
  const safeZone = isValidIanaZone(zone) ? zone : DEFAULT_TIMEZONE;
  const dtUtc = parseToUtc(utcDateInput) || DateTime.utc();
  const dtLocal = dtUtc.setZone(safeZone);

  return {
    localDate: dtLocal.toFormat('yyyy-MM-dd'),
    localTime: dtLocal.toFormat('HH:mm:ss'),
    displayDateTime: dtLocal.toFormat('LLL dd, HH:mm:ss'), // e.g. "Oct 25, 02:15:40" matching n8n
    displayTime: dtLocal.toFormat('HH:mm:ss'),
  };
}
