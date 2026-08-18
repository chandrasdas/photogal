import crypto from 'node:crypto';
import { error, type Cookies } from '@sveltejs/kit';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'photogal-admin-session-secret-key-32chars';
export const ADMIN_COOKIE_NAME = 'admin_session';

/**
 * Verify user-entered password in constant time to prevent timing attacks.
 */
export function verifyPassword(password: string): boolean {
	if (!password || typeof password !== 'string') return false;

	const target = Buffer.from(ADMIN_PASSWORD, 'utf8');
	const given = Buffer.from(password, 'utf8');

	if (target.length !== given.length) {
		// Still perform a dummy timing safe equal to avoid length-based early exit timing leak
		crypto.timingSafeEqual(target, target);
		return false;
	}

	return crypto.timingSafeEqual(target, given);
}

/**
 * Generate HMAC session token for the admin cookie.
 */
export function createAdminSessionToken(): string {
	return crypto
		.createHmac('sha256', ADMIN_SECRET)
		.update('admin_authenticated_session')
		.digest('hex');
}

/**
 * Validate the session token from the cookie.
 */
export function validateAdminSession(token?: string | null): boolean {
	if (!token || typeof token !== 'string') return false;

	const expectedToken = createAdminSessionToken();
	const expectedBuf = Buffer.from(expectedToken, 'utf8');
	const tokenBuf = Buffer.from(token, 'utf8');

	if (expectedBuf.length !== tokenBuf.length) {
		crypto.timingSafeEqual(expectedBuf, expectedBuf);
		return false;
	}

	return crypto.timingSafeEqual(expectedBuf, tokenBuf);
}

/**
 * Set the admin HTTP-only session cookie.
 */
export function setAdminCookie(cookies: Cookies): void {
	const token = createAdminSessionToken();
	cookies.set(ADMIN_COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});
}

/**
 * Clear the admin session cookie on logout.
 */
export function clearAdminCookie(cookies: Cookies): void {
	cookies.delete(ADMIN_COOKIE_NAME, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production'
	});
}

/**
 * Guard utility for server actions/loads.
 */
export function requireAdmin(locals: App.Locals): void {
	if (!locals.isAdmin) {
		error(403, 'Unauthorized. Administrator access required.');
	}
}
