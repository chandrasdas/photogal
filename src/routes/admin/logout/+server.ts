import { redirect, type RequestHandler } from '@sveltejs/kit';
import { base } from '$app/paths';
import { clearAdminCookie } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	clearAdminCookie(cookies);
	redirect(303, base || '/');
};

export const GET: RequestHandler = async ({ cookies }) => {
	clearAdminCookie(cookies);
	redirect(303, base || '/');
};
