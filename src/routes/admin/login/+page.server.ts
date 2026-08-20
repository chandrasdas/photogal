import { fail, redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import { setAdminCookie, verifyPassword } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const defaultTarget = base || '/';
	const redirectTo = url.searchParams.get('redirectTo') || defaultTarget;
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
		const defaultTarget = base || '/';
		const targetUrl =
			typeof redirectToParam === 'string' && redirectToParam.startsWith('/')
				? redirectToParam
				: url.searchParams.get('redirectTo') || defaultTarget;

		if (typeof password !== 'string' || !password) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			return fail(400, { error: 'Please enter the administrator password.' });
		}

		if (!verifyPassword(password)) {
			// Artificial response delay to throttle brute-force attempts
			await new Promise((resolve) => setTimeout(resolve, 1000));
			return fail(400, { error: 'Incorrect administrator password. Please try again.' });
		}

		setAdminCookie(cookies);
		redirect(303, targetUrl);
	}
} satisfies Actions;
