/**
 * Utilities for parsing and formatting DD-MM-YYYY dates and conversions.
 */

/**
 * Parses date string in DD-MM-YYYY (or DD/MM/YYYY, DD.MM.YYYY) format.
 * Also handles ISO YYYY-MM-DD (from native datepicker) and year shortcuts.
 */
export function parseDMYDate(input: string | null | undefined): Date | null {
	if (!input) return null;
	const str = input.trim();
	if (!str) return null;

	// Check DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD MM YYYY
	const dmyMatch = str.match(/^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{4})$/);
	if (dmyMatch) {
		const day = parseInt(dmyMatch[1], 10);
		const month = parseInt(dmyMatch[2], 10);
		const year = parseInt(dmyMatch[3], 10);

		if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
			const date = new Date(year, month - 1, day);
			// Validate that the day did not overflow (e.g. Feb 31 -> Mar 3)
			if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
				return date;
			}
		}
		return null;
	}

	// Check ISO YYYY-MM-DD or YYYY/MM/DD (e.g. from native date picker)
	const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
	if (isoMatch) {
		const year = parseInt(isoMatch[1], 10);
		const month = parseInt(isoMatch[2], 10);
		const day = parseInt(isoMatch[3], 10);

		if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
			const date = new Date(year, month - 1, day);
			if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
				return date;
			}
		}
		return null;
	}

	// 4-digit year only: "2024" -> 01-01-2024
	if (/^\d{4}$/.test(str)) {
		const year = parseInt(str, 10);
		if (year >= 1900 && year <= 2100) {
			return new Date(year, 0, 1);
		}
	}

	// Relative keywords
	const lower = str.toLowerCase();
	const now = new Date();
	if (lower === 'today') {
		return new Date(now.getFullYear(), now.getMonth(), now.getDate());
	}
	if (lower === 'yesterday') {
		const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		d.setDate(d.getDate() - 1);
		return d;
	}

	return null;
}

/**
 * Formats a Date object to DD-MM-YYYY string.
 */
export function formatToDMY(date: Date, separator: '-' | '/' | '.' = '-'): string {
	const d = String(date.getDate()).padStart(2, '0');
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const y = date.getFullYear();
	return `${d}${separator}${m}${separator}${y}`;
}

/**
 * Formats a Date object to standard ISO YYYY-MM-DD string.
 */
export function formatToISODate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * Formats a Date object into human-friendly format (e.g., "Friday, 21 August 2026").
 */
export function formatFriendlyDate(date: Date): string {
	return date.toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}
