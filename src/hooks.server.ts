import { redirect, type Handle } from '@sveltejs/kit';
import { ADMIN_COOKIE_NAME, validateAdminSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(ADMIN_COOKIE_NAME);
	event.locals.isAdmin = validateAdminSession(sessionToken);

	// Guard admin-only routes
	if (event.url.pathname.startsWith('/photo-gallery/admin') && !event.locals.isAdmin) {
		const redirectTo = encodeURIComponent(event.url.pathname + event.url.search);
		redirect(303, `/admin/login?redirectTo=${redirectTo}`);
	}

	return resolve(event);
};
