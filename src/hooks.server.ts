import { redirect, type Handle } from '@sveltejs/kit';
import { base } from '$app/paths';
import { ADMIN_COOKIE_NAME, validateAdminSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(ADMIN_COOKIE_NAME);
	event.locals.isAdmin = validateAdminSession(sessionToken);

	const adminPath = `${base}/admin`;
	const adminLoginPath = `${base}/admin/login`;
	const adminLogoutPath = `${base}/admin/logout`;

	// Guard admin-only routes
	if (
		event.url.pathname.startsWith(adminPath) &&
		!event.url.pathname.startsWith(adminLoginPath) &&
		!event.url.pathname.startsWith(adminLogoutPath) &&
		!event.locals.isAdmin
	) {
		const redirectTo = encodeURIComponent(event.url.pathname + event.url.search);
		redirect(303, `${adminLoginPath}?redirectTo=${redirectTo}`);
	}

	return resolve(event);
};
