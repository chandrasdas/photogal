<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedTag = $state('All');
	let selectedYear = $state('All');
	let searchQuery = $state('');

	// State for delete album confirmation modal
	let albumToDelete = $state<{ id: number; title: string; photoCount: number } | null>(null);
	let isDeletingAlbum = $state(false);

	function openDeleteModal(album: { id: number; title: string; photoCount: number }, e: Event) {
		e.preventDefault();
		e.stopPropagation();
		albumToDelete = album;
	}

	function closeDeleteModal() {
		albumToDelete = null;
	}

	// Total photo count across all albums
	let totalPhotosCount = $derived(data.albums.reduce((acc, a) => acc + a.photoCount, 0));

	// Extract unique tags and counts of albums
	let tagCounts = $derived.by(() => {
		const counts: Record<string, number> = { All: data.albums.length };
		for (const album of data.albums) {
			const t = album.tag?.trim() || 'General';
			counts[t] = (counts[t] || 0) + 1;
		}
		return counts;
	});

	let tags = $derived.by(() => {
		const list: string[] = [];
		for (const album of data.albums) {
			const t = album.tag?.trim();
			if (t && !list.includes(t)) {
				list.push(t);
			}
		}
		return ['All', ...list];
	});

	function getAlbumEventYear(album: {
		eventDate?: Date | string | null;
		createdAt?: Date | string | null;
	}): string {
		const d = album.eventDate || album.createdAt;
		return d ? new Date(d).getFullYear().toString() : '';
	}

	function getAlbumEventDate(album: {
		eventDate?: Date | string | null;
		createdAt?: Date | string | null;
	}): Date | null {
		const d = album.eventDate || album.createdAt;
		return d ? new Date(d) : null;
	}

	// Extract unique event years sorted descending and counts
	let years = $derived.by(() => {
		const list: string[] = [];
		for (const album of data.albums) {
			const y = getAlbumEventYear(album);
			if (y && !list.includes(y)) {
				list.push(y);
			}
		}
		return ['All', ...list.sort((a, b) => Number(b) - Number(a))];
	});

	let yearCounts = $derived.by(() => {
		const counts: Record<string, number> = { All: data.albums.length };
		for (const album of data.albums) {
			const y = getAlbumEventYear(album);
			if (y) {
				counts[y] = (counts[y] || 0) + 1;
			}
		}
		return counts;
	});

	// Filtered albums based on tag, event year, and search query
	let filteredAlbums = $derived(
		data.albums.filter((album) => {
			const matchesTag = selectedTag === 'All' || (album.tag?.trim() || 'General') === selectedTag;

			const eventYear = getAlbumEventYear(album);
			const matchesYear = selectedYear === 'All' || eventYear === selectedYear;

			const matchesSearch =
				searchQuery.trim() === '' ||
				album.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
				(album.tag && album.tag.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
				eventYear.includes(searchQuery.trim());

			return matchesTag && matchesYear && matchesSearch;
		})
	);

	let latestAlbumDate = $derived.by(() => {
		if (data.albums.length === 0) return null;
		const timestamps = data.albums
			.map((a) => {
				const d = getAlbumEventDate(a);
				return d ? d.getTime() : 0;
			})
			.filter(Boolean);
		if (timestamps.length === 0) return null;
		return new Date(Math.max(...timestamps)).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	});

	let hasActiveFilters = $derived(
		selectedTag !== 'All' || selectedYear !== 'All' || searchQuery.trim() !== ''
	);

	function resetFilters() {
		selectedTag = 'All';
		selectedYear = 'All';
		searchQuery = '';
	}
</script>

<svelte:head>
	<title>Photo Albums | School Photo Archive</title>
	<meta
		name="description"
		content="Explore curated school photo albums, campus events, sports days, and student celebrations."
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50/70 text-slate-800 antialiased">
	<!-- Top Sticky Navigation Bar -->
	<header
		class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all"
	>
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
			<!-- Brand Title -->
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25"
				>
					<svg
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
						/>
					</svg>
				</div>
				<div>
					<span class="text-xs font-bold tracking-wider text-amber-600 uppercase">Archive</span>
					<h2 class="text-base font-extrabold text-slate-900 sm:text-lg">Photo Albums</h2>
				</div>
			</div>

			<!-- Search & Auth Actions -->
			<div class="flex items-center gap-3">
				<!-- Search Bar -->
				<div class="relative hidden sm:block">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						<svg
							class="h-4 w-4 text-slate-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
							/>
						</svg>
					</div>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search albums, tags, years..."
						class="w-56 rounded-xl border border-slate-200 bg-slate-50/50 py-2 pr-4 pl-9 text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:w-68 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
					/>
					{#if searchQuery}
						<button
							type="button"
							onclick={() => (searchQuery = '')}
							aria-label="Clear search"
							class="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
						>
							<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
								<path
									d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
								/>
							</svg>
						</button>
					{/if}
				</div>

				{#if data.isAdmin}
					<!-- Admin Mode Indicator Badge -->
					<div
						class="hidden items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-1.5 text-xs font-bold text-amber-800 sm:inline-flex"
					>
						<span class="relative flex h-2 w-2">
							<span
								class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"
							></span>
							<span class="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
						</span>
						<span>Admin Mode</span>
					</div>

					<!-- Create New Album Button -->
					<a
						href={resolve('/photo-gallery/admin/upload')}
						class="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-600 hover:shadow-md hover:shadow-amber-500/25 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
						</svg>
						<span>New Album</span>
					</a>

					<!-- Logout Action -->
					<form method="POST" action="/admin/logout" class="inline">
						<button
							type="submit"
							class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50"
							title="Sign out of admin mode"
						>
							<svg
								class="h-3.5 w-3.5 text-slate-500"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
								/>
							</svg>
							<span class="hidden sm:inline">Logout</span>
						</button>
					</form>
				{:else}
					<!-- Public Guest Login Action -->
					<a
						href={resolve('/admin/login')}
						class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-800"
						title="Sign in as Administrator to manage photos and albums"
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
						<span>Admin Login</span>
					</a>
				{/if}
			</div>
		</div>
	</header>

	<!-- Feedback Alerts -->
	{#if form?.error}
		<div class="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
			<div
				class="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 shadow-xs"
			>
				<div class="flex items-center gap-2">
					<svg class="h-4 w-4 shrink-0 text-rose-600" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>{form.error}</span>
				</div>
			</div>
		</div>
	{/if}

	{#if form?.success && form.action === 'deleteAlbum'}
		<div class="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
			<div
				class="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-800 shadow-xs"
			>
				<div class="flex items-center gap-2">
					<svg class="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>Album "{form.deletedAlbumTitle || 'Selected album'}" was successfully deleted.</span
					>
				</div>
				<button
					type="button"
					onclick={() => {
						if (form) form.success = false;
					}}
					class="font-semibold text-emerald-800 hover:underline"
				>
					Dismiss
				</button>
			</div>
		</div>
	{/if}

	<!-- Hero Banner -->
	<section
		class="relative overflow-hidden border-b border-slate-200/80 bg-linear-to-b from-white via-amber-50/40 to-slate-50 py-12 sm:py-16"
	>
		<!-- Ambient Glow -->
		<div
			class="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-3xl -translate-x-1/2 rounded-full bg-linear-to-tr from-amber-200/50 to-orange-200/40 blur-3xl"
		></div>

		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="max-w-3xl">
				<div
					class="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1 text-xs font-semibold text-amber-800 shadow-xs"
				>
					<span class="relative flex h-2 w-2">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"
						></span>
						<span class="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
					</span>
					School Moments & Memories
				</div>

				<h1
					class="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl sm:leading-tight"
				>
					Explore Campus Photo Albums
				</h1>
				<p class="mt-3 text-base text-slate-600 sm:text-lg sm:leading-relaxed">
					Browse through curated event albums, annual celebrations, sports meets, and student life.
					Filter by year or category and view full-resolution photo galleries.
				</p>

				<!-- Quick Stats Pills -->
				<div class="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
					<div
						class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 shadow-xs"
					>
						<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
						<span><strong>{data.albums.length}</strong> Total Albums</span>
					</div>

					<div
						class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 shadow-xs"
					>
						<span class="h-2 w-2 rounded-full bg-amber-500"></span>
						<span><strong>{totalPhotosCount}</strong> Total Photos</span>
					</div>

					{#if latestAlbumDate}
						<div
							class="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 shadow-xs sm:flex"
						>
							<span class="h-2 w-2 rounded-full bg-orange-500"></span>
							<span>Latest Album: <strong>{latestAlbumDate}</strong></span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Main Albums Area -->
	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Mobile Search input -->
		<div class="mb-6 block sm:hidden">
			<div class="relative">
				<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
					<svg
						class="h-4 w-4 text-slate-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
						/>
					</svg>
				</div>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search albums, tags, years..."
					class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-9 text-sm text-slate-900 shadow-xs focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
				/>
			</div>
		</div>

		<!-- Comprehensive Filter Section (Categories + Years) -->
		<div
			class="mb-8 space-y-4 rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs"
		>
			<!-- Row 1: Category Tag Filter Tabs -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase"
						>Filter by Category</span
					>
					<span class="text-xs text-slate-500">
						Showing <strong class="text-slate-900">{filteredAlbums.length}</strong> of {data.albums
							.length} albums
					</span>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					{#each tags as t (t)}
						{@const count = tagCounts[t] ?? 0}
						<button
							type="button"
							onclick={() => (selectedTag = t)}
							class="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all {selectedTag ===
							t
								? 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25'
								: 'border border-slate-200 bg-slate-50/70 text-slate-700 hover:border-amber-300 hover:bg-amber-50/40 hover:text-amber-800'}"
						>
							<span>{t}</span>
							<span
								class="rounded-full px-1.5 py-0.5 text-[10px] font-bold {selectedTag === t
									? 'bg-white/20 text-white'
									: 'bg-white text-slate-600 shadow-2xs'}"
							>
								{count}
							</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Row 2: Year Filter Pills -->
			{#if years.length > 2}
				<div class="border-t border-slate-100 pt-3">
					<div class="mb-2 flex items-center gap-2">
						<svg
							class="h-3.5 w-3.5 text-amber-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
							/>
						</svg>
						<span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase"
							>Filter by Event Year</span
						>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						{#each years as y (y)}
							{@const count = yearCounts[y] ?? 0}
							<button
								type="button"
								onclick={() => (selectedYear = y)}
								class="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all {selectedYear ===
								y
									? 'bg-slate-900 text-white shadow-xs'
									: 'border border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100'}"
							>
								<span>{y === 'All' ? 'All Years' : y}</span>
								<span
									class="py-0.2 rounded-md px-1.5 text-[10px] font-bold {selectedYear === y
										? 'bg-white/20 text-white'
										: 'bg-white text-slate-500 shadow-2xs'}"
								>
									{count}
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Active Filter Summary & Clear All -->
			{#if hasActiveFilters}
				<div class="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
					<span class="font-medium text-slate-400">Active filters:</span>
					{#if selectedTag !== 'All'}
						<button
							type="button"
							onclick={() => (selectedTag = 'All')}
							class="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
						>
							<span>Tag: {selectedTag}</span>
							<span>&times;</span>
						</button>
					{/if}
					{#if selectedYear !== 'All'}
						<button
							type="button"
							onclick={() => (selectedYear = 'All')}
							class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 hover:bg-slate-200"
						>
							<span>Event Year: {selectedYear}</span>
							<span>&times;</span>
						</button>
					{/if}
					{#if searchQuery.trim() !== ''}
						<button
							type="button"
							onclick={() => (searchQuery = '')}
							class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 hover:bg-slate-200"
						>
							<span>Query: "{searchQuery}"</span>
							<span>&times;</span>
						</button>
					{/if}
					<button
						type="button"
						onclick={resetFilters}
						class="font-semibold text-amber-600 hover:underline"
					>
						Clear all
					</button>
				</div>
			{/if}
		</div>

		<!-- Album Cards Grid -->
		{#if filteredAlbums.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-20 text-center shadow-2xs backdrop-blur-xs"
			>
				<div
					class="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner"
				>
					<svg
						class="h-8 w-8"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
						/>
					</svg>
				</div>
				<h3 class="mt-4 text-lg font-bold text-slate-900">No albums found</h3>
				<p class="mt-1 max-w-sm text-sm text-slate-500">
					{hasActiveFilters
						? 'No albums match your selected filters. Try resetting filters or changing keyword.'
						: 'No photo albums have been created yet.'}
				</p>
				<div class="mt-6 flex items-center gap-3">
					{#if hasActiveFilters}
						<button
							type="button"
							onclick={resetFilters}
							class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
						>
							Reset All Filters
						</button>
					{/if}
					{#if data.isAdmin}
						<a
							href={resolve('/photo-gallery/admin/upload')}
							class="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-amber-500/25 transition hover:from-amber-600 hover:to-orange-600"
						>
							<svg
								class="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
							</svg>
							Create First Album
						</a>
					{/if}
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredAlbums as album (album.id)}
					{@const eventDateObj = getAlbumEventDate(album)}
					<div
						class="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/15"
					>
						<!-- Whole Card Link for Navigation -->
						<a
							href={resolve('/photo-gallery/[albumId]', { albumId: String(album.id) })}
							class="flex h-full flex-col"
						>
							<!-- Album Cover Image / Multi-Thumbnail Collage -->
							<div class="relative aspect-16/10 overflow-hidden bg-slate-100">
								{#if album.previewPhotos.length > 1}
									<!-- Dynamic Collage for Multi-Photo Albums -->
									<div class="grid h-full w-full grid-cols-3 gap-0.5">
										<div class="col-span-2 h-full overflow-hidden">
											<img
												src={album.previewPhotos[0].url}
												alt={album.title}
												loading="lazy"
												class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
											/>
										</div>
										<div class="col-span-1 grid h-full grid-rows-2 gap-0.5">
											{#each album.previewPhotos.slice(1, 3) as previewPhoto (previewPhoto.id)}
												<div class="h-full overflow-hidden">
													<img
														src={previewPhoto.url}
														alt=""
														loading="lazy"
														class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
													/>
												</div>
											{/each}
										</div>
									</div>
								{:else if album.coverUrl}
									<img
										src={album.coverUrl}
										alt={album.title}
										loading="lazy"
										class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
									/>
								{:else}
									<div
										class="flex h-full w-full items-center justify-center bg-amber-50/50 text-slate-400"
									>
										<span class="text-xs">No photos</span>
									</div>
								{/if}

								<!-- Floating Tag Badge -->
								<div class="absolute top-3 left-3 z-10">
									<span
										class="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/95 px-3 py-1 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-md"
									>
										<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
										{album.tag || 'General'}
									</span>
								</div>

								<!-- Floating Photo Count Pill -->
								<div class="absolute top-3 right-3 z-10">
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs backdrop-blur-md"
									>
										<svg
											class="h-3.5 w-3.5 text-amber-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="2"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
											/>
										</svg>
										<span>{album.photoCount} photo{album.photoCount === 1 ? '' : 's'}</span>
									</span>
								</div>
							</div>

							<!-- Album Card Body (Title, Date, Link) -->
							<div class="flex flex-1 flex-col justify-between p-5">
								<div>
									<h3
										class="line-clamp-1 text-base font-bold text-slate-900 transition-colors group-hover:text-amber-600"
										title={album.title}
									>
										{album.title}
									</h3>
								</div>

								<div
									class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400"
								>
									{#if eventDateObj}
										<div class="flex items-center gap-1.5" title="Event Date">
											<svg
												class="h-3.5 w-3.5 text-amber-500"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="2"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
												/>
											</svg>
											<time datetime={eventDateObj.toISOString()}>
												{eventDateObj.toLocaleDateString('en-US', {
													month: 'short',
													day: 'numeric',
													year: 'numeric'
												})}
											</time>
										</div>
									{/if}

									<span
										class="flex items-center gap-1 text-xs font-semibold text-amber-600 transition group-hover:translate-x-0.5"
									>
										<span>View Album</span>
										<span>&rarr;</span>
									</span>
								</div>
							</div>
						</a>

						<!-- Admin Quick Actions: Delete Album button -->
						{#if data.isAdmin}
							<div class="absolute right-3 bottom-14 z-10">
								<button
									type="button"
									onclick={(e) => openDeleteModal(album, e)}
									class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-400 opacity-80 shadow-xs backdrop-blur-xs transition-all hover:scale-110 hover:border-rose-300 hover:bg-rose-500 hover:text-white hover:opacity-100 hover:shadow-md"
									title={`Delete album "${album.title}"`}
									aria-label="Delete album"
								>
									<svg
										class="h-4 w-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
										/>
									</svg>
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</main>

	<!-- Delete Album Confirmation Modal -->
	{#if albumToDelete}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-album-title"
		>
			<div
				class="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7"
			>
				<div class="flex items-center gap-3.5">
					<div
						class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-inner"
					>
						<svg
							class="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
							/>
						</svg>
					</div>
					<div>
						<h3 id="delete-album-title" class="text-base font-bold text-slate-900">
							Delete Album Permanently?
						</h3>
						<p class="text-xs text-slate-500">This action cannot be undone.</p>
					</div>
				</div>

				<div
					class="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-700"
				>
					<p>
						Are you sure you want to delete <strong class="text-slate-900"
							>"{albumToDelete.title}"</strong
						>?
					</p>
					<p class="mt-1 text-slate-500">
						All <strong class="text-rose-600">{albumToDelete.photoCount}</strong>
						photo{albumToDelete.photoCount === 1 ? '' : 's'} in this album will be permanently deleted
						from the database and storage.
					</p>
				</div>

				<form
					method="POST"
					action="?/deleteAlbum"
					use:enhance={() => {
						isDeletingAlbum = true;
						return async ({ update }) => {
							isDeletingAlbum = false;
							closeDeleteModal();
							await update();
						};
					}}
					class="mt-6 flex items-center justify-end gap-3"
				>
					<input type="hidden" name="albumId" value={albumToDelete.id} />

					<button
						type="button"
						onclick={closeDeleteModal}
						disabled={isDeletingAlbum}
						class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
					>
						Cancel
					</button>

					<button
						type="submit"
						disabled={isDeletingAlbum}
						class="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-rose-600/25 transition hover:bg-rose-700 disabled:opacity-50"
					>
						{#if isDeletingAlbum}
							<svg class="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
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
							<span>Deleting...</span>
						{:else}
							<span>Delete Entire Album</span>
						{/if}
					</button>
				</form>
			</div>
		</div>
	{/if}

	<!-- Footer -->
	<footer
		class="mt-16 border-t border-slate-200/80 bg-white py-8 text-center text-xs text-slate-500"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<p>© {new Date().getFullYear()} School Photo Gallery. Preserving our community memories.</p>
		</div>
	</footer>
</div>
