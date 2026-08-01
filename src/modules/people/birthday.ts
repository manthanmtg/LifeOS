interface BirthdayOccurrence {
  year: number;
  month: number;
  day: number;
}

function parseBirthdayDate(date: string): BirthdayOccurrence {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`Invalid birthday date: ${date}`);
  }

  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const candidate = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error(`Invalid birthday date: ${date}`);
  }

  return { year, month, day };
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function normalizeToCalendarDate(
  month: number,
  day: number,
  year: number,
): BirthdayOccurrence {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return { year, month: 3, day: 1 };
  }

  return { year, month, day };
}

export function getBirthdayOccurrenceDate(
  birthday: string,
  occurrenceYear: number,
): string | null {
  try {
    const { month, day } = parseBirthdayDate(birthday);
    const occurrence = normalizeToCalendarDate(month, day, occurrenceYear);
    const date = new Date(
      Date.UTC(
        occurrence.year,
        occurrence.month - 1,
        occurrence.day,
        0,
        0,
        0,
        0,
      ),
    );

    if (Number.isNaN(date.getTime())) return null;

    return `${String(occurrence.year).padStart(4, "0")}-${String(occurrence.month).padStart(2, "0")}-${String(occurrence.day).padStart(2, "0")}`;
  } catch {
    return null;
  }
}

export function getBirthdayAgeTurning(
  birthday: string,
  occurrenceYear: number,
): number | null {
  const parsed = parseBirthdayDate(birthday);
  if (parsed.year < 1900 || parsed.year > new Date().getFullYear() + 1) {
    return null;
  }

  if (parsed.month === 2 && parsed.day === 29 && !isLeapYear(occurrenceYear)) {
    return occurrenceYear - parsed.year - 1;
  }

  return occurrenceYear - parsed.year;
}

export function getCalendarDayDifference(
  fromDate: string,
  toDate: string,
): number {
  try {
    const from = parseBirthdayDate(fromDate);
    const to = parseBirthdayDate(toDate);
    const start = Date.UTC(from.year, from.month - 1, from.day);
    const end = Date.UTC(to.year, to.month - 1, to.day);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  } catch {
    return Number.NaN;
  }
}
