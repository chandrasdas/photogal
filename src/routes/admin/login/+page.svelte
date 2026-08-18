<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let password = $state('');
	let showPassword = $state(false);
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Admin Login | School Photo Archive</title>
	<meta name="description" content="Administrator portal login for photo gallery management." />
</svelte:head>

<div
	class="relative flex min-h-screen flex-col justify-center overflow-hidden bg-slate-50/80 px-4 py-12 antialiased sm:px-6 lg:px-8"
>
	<!-- Ambient Glow Background -->
	<div
		class="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-3xl -translate-x-1/2 rounded-full bg-linear-to-tr from-amber-200/50 to-orange-200/40 blur-3xl"
	></div>

	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<!-- Brand / Logo Icon -->
		<div class="flex justify-center">
			<a
				href={resolve('/photo-gallery')}
				class="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 transition hover:scale-105"
				title="Back to Gallery"
			>
				<svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
					/>
				</svg>
			</a>
		</div>

		<div class="mt-4 text-center">
			<span
				class="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-bold text-amber-800"
			>
				<svg
					class="h-3.5 w-3.5 text-amber-600"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
					/>
				</svg>
				Admin Portal
			</span>
			<h2 class="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
				Administrator Sign In
			</h2>
			<p class="mt-1.5 text-xs text-slate-500 sm:text-sm">
				Enter your administrator password to create, edit, or delete albums and photos.
			</p>
		</div>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div
			class="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xs sm:p-9"
		>
			<!-- Feedback Error Alert -->
			{#if form?.error}
				<div
					class="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 shadow-xs"
				>
					<div class="mt-0.5 shrink-0 text-rose-600">
						<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div>
						<h4 class="font-bold text-rose-900">Authentication Failed</h4>
						<p class="mt-0.5 text-rose-700">{form.error}</p>
					</div>
				</div>
			{/if}

			<form
				method="POST"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
				class="space-y-5"
			>
				<input type="hidden" name="redirectTo" value={data.redirectTo} />

				<!-- Password Field -->
				<div>
					<div class="flex items-center justify-between">
						<label
							for="admin-password"
							class="block text-xs font-bold tracking-wider text-slate-700 uppercase"
						>
							Admin Password
						</label>
					</div>
					<div class="relative mt-2">
						<input
							id="admin-password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							required
							autocomplete="current-password"
							placeholder="••••••••••••"
							class="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pr-11 pl-4 text-sm text-slate-900 shadow-xs transition placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
							tabindex="-1"
							aria-label={showPassword ? 'Hide password' : 'Show password'}
						>
							{#if showPassword}
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
									/>
								</svg>
							{:else}
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={isSubmitting || !password}
					class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-amber-500/25 transition hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 hover:shadow-lg hover:shadow-amber-500/35 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if isSubmitting}
						<svg class="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							/>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
						<span>Verifying...</span>
					{:else}
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
							/>
						</svg>
						<span>Sign In as Admin</span>
					{/if}
				</button>
			</form>

			<div class="mt-6 border-t border-slate-100 pt-5 text-center">
				<a
					href={resolve('/photo-gallery')}
					class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
				>
					<span>&larr;</span>
					<span>Back to Public Photo Gallery</span>
				</a>
			</div>
		</div>
	</div>
</div>
