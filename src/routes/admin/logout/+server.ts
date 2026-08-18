import { redirect, type RequestHandler } from '@sveltejs/kit';
import { clearAdminCookie } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	clearAdminCookie(cookies);
	redirect(303, '/photo-gallery');
};

export const GET: RequestHandler = async ({ cookies }) => {
	clearAdminCookie(cookies);
	redirect(303, '/photo-gallery');
};
