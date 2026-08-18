import { fail, redirect } from '@sveltejs/kit';
import { setAdminCookie, verifyPassword } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectTo = url.searchParams.get('redirectTo') || '/photo-gallery';
	if (locals.isAdmin) {
		redirect(303, redirectTo);
	}

	return {
		redirectTo
	};
};

export const actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const password = formData.get('password');
		const redirectToParam = formData.get('redirectTo');
		const targetUrl =
			typeof redirectToParam === 'string' && redirectToParam.startsWith('/')
				? redirectToParam
				: url.searchParams.get('redirectTo') || '/photo-gallery';

		if (typeof password !== 'string' || !password) {
			return fail(400, { error: 'Please enter the administrator password.' });
		}

		if (!verifyPassword(password)) {
			return fail(400, { error: 'Incorrect administrator password. Please try again.' });
		}

		setAdminCookie(cookies);
		redirect(303, targetUrl);
	}
} satisfies Actions;
