<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteDate } from 'svelte/reactivity';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { parseDMYDate, formatToDMY, formatToISODate, formatFriendlyDate } from '$lib/dateUtils';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	interface SelectedPhoto {
		id: string;
		file: File;
		previewUrl: string;
	}

	// Check if albumId was passed in query params
	let initialAlbumId = page.url.searchParams.get('albumId') || '';

	let uploadMode = $state<'new' | 'existing'>(initialAlbumId ? 'existing' : 'new');
	let selectedAlbumId = $state<string>(initialAlbumId);
	let isSubmitting = $state(false);
	let isDragging = $state(false);
	let selectedPhotos = $state<SelectedPhoto[]>([]);
	let title = $state('');
	let tag = $state('General');
	let dateInputMode = $state<'manual' | 'picker'>('manual');
	let manualDateText = $state(formatToDMY(new Date()));
	let pickerDate = $state(formatToISODate(new Date()));
	let fileInputRef = $state<HTMLInputElement | null>(null);

	let parsedDate = $derived.by(() => {
		if (dateInputMode === 'manual') {
			return parseDMYDate(manualDateText);
		} else {
			return parseDMYDate(pickerDate);
		}
	});

	let isValidDate = $derived(parsedDate !== null);
	let friendlyDatePreview = $derived(parsedDate ? formatFriendlyDate(parsedDate) : '');
	let finalEventDateValue = $derived(parsedDate ? formatToDMY(parsedDate) : manualDateText.trim());

	function applyPreset(type: 'today' | 'yesterday') {
		const d = new SvelteDate();
		if (type === 'yesterday') {
			d.setDate(d.getDate() - 1);
		}
		manualDateText = formatToDMY(d);
		pickerDate = formatToISODate(d);
	}

	function applyYear(year: number) {
		const current = parsedDate || new Date();
		const d = new Date(year, current.getMonth(), current.getDate());
		manualDateText = formatToDMY(d);
		pickerDate = formatToISODate(d);
	}

	const popularTags = [
		'Campus',
		'Sports',
		'Arts & Culture',
		'Academics',
		'Events',
		'Celebrations',
		'General'
	];

	function addFiles(files: FileList | File[]) {
		const newSelected: SelectedPhoto[] = [];

		for (const file of Array.from(files)) {
			if (!file.type.startsWith('image/')) continue;
			if (selectedPhotos.some((p) => p.file.name === file.name && p.file.size === file.size)) {
				continue;
			}
			newSelected.push({
				id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
				file,
				previewUrl: URL.createObjectURL(file)
			});
		}

		if (newSelected.length > 0) {
			selectedPhotos = [...selectedPhotos, ...newSelected];

			// Auto-suggest album title if empty based on first file name (only in new album mode)
			if (uploadMode === 'new' && !title.trim() && selectedPhotos.length > 0) {
				const sampleName = selectedPhotos[0].file.name
					.replace(/\.[^/.]+$/, '')
					.replace(/[-_0-9]+/g, ' ')
					.trim()
					.replace(/\b\w/g, (c) => c.toUpperCase());
				if (sampleName.length > 2) {
					title = `${sampleName} Album`;
				}
			}
		}
	}

	function removePhoto(id: string) {
		const photoToRemove = selectedPhotos.find((p) => p.id === id);
		if (photoToRemove) {
			URL.revokeObjectURL(photoToRemove.previewUrl);
		}
		selectedPhotos = selectedPhotos.filter((p) => p.id !== id);
	}

	function clearAllPhotos() {
		for (const p of selectedPhotos) {
			URL.revokeObjectURL(p.previewUrl);
		}
		selectedPhotos = [];
		if (fileInputRef) {
			fileInputRef.value = '';
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			addFiles(e.dataTransfer.files);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	let totalSize = $derived(selectedPhotos.reduce((acc, p) => acc + p.file.size, 0));
</script>

<svelte:head>
	<title>Upload Photos | School Archive Studio</title>
	<meta
		name="description"
		content="Upload multiple photos to create a new album or append to an existing school album."
	/>
</svelte:head>

<div
	class="min-h-screen bg-slate-50/70 text-slate-800 antialiased transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100"
>
	<!-- Top Sticky Navigation Bar -->
	<header
		class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all dark:border-slate-800/80 dark:bg-slate-900/80"
	>
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
			<!-- Brand / Logo -->
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
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
					</svg>
				</div>
				<div>
					<span
						class="text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400"
						>Admin Studio</span
					>
					<h2 class="text-base font-extrabold text-slate-900 sm:text-lg dark:text-white">
						Photo Upload Portal
					</h2>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center gap-3">
				<!-- Theme Toggle -->
				<ThemeToggle />

				<div
					class="hidden items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-1.5 text-xs font-bold text-amber-800 sm:inline-flex dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300"
				>
					<span class="relative flex h-2 w-2">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"
						></span>
						<span class="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
					</span>
					<span>Admin Mode</span>
				</div>

				<a
					href={resolve('/')}
					class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-500 hover:shadow-md hover:shadow-amber-500/25 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none dark:bg-slate-800 dark:hover:bg-amber-500"
				>
					<svg
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
						/>
					</svg>
					<span>View All Albums</span>
				</a>

				<form method="POST" action={resolve('/admin/logout')} class="inline">
					<button
						type="submit"
						class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
						title="Sign out of admin mode"
					>
						<svg
							class="h-3.5 w-3.5 text-slate-500 dark:text-slate-400"
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
			</div>
		</div>
	</header>

	<!-- Hero Banner -->
	<section
		class="relative overflow-hidden border-b border-slate-200/80 bg-linear-to-b from-white via-amber-50/40 to-slate-50 py-10 sm:py-14 dark:border-slate-800/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
	>
		<div
			class="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-3xl -translate-x-1/2 rounded-full bg-linear-to-tr from-amber-200/50 to-orange-200/40 blur-3xl dark:from-amber-900/20 dark:to-orange-950/20"
		></div>

		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="mx-auto max-w-2xl text-center">
				<div
					class="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/90 px-3.5 py-1 text-xs font-semibold text-amber-800 shadow-xs dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300"
				>
					<span class="relative flex h-2 w-2">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"
						></span>
						<span class="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
					</span>
					Archive Management
				</div>

				<h1
					class="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl sm:leading-tight dark:text-white"
				>
					{uploadMode === 'new' ? 'Create a New Photo Album' : 'Add Photos to Existing Album'}
				</h1>
				<p
					class="mt-2.5 text-sm text-slate-600 sm:text-base sm:leading-relaxed dark:text-slate-400"
				>
					Upload multiple photos simultaneously. Images are automatically converted and optimized to
					high-performance WebP formats for instant lightbox viewing.
				</p>

				<!-- Quick Feature Pills -->
				<div
					class="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400"
				>
					<div
						class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300"
					>
						<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
						<span>Multi-File Upload</span>
					</div>
					<div
						class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300"
					>
						<span class="h-2 w-2 rounded-full bg-amber-500"></span>
						<span>Auto WebP Optimization</span>
					</div>
					<div
						class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300"
					>
						<span class="h-2 w-2 rounded-full bg-orange-500"></span>
						<span>{data.albums.length} Existing Album{data.albums.length === 1 ? '' : 's'}</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Main Content Area -->
	<main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-2xl">
			<!-- Feedback Alerts -->
			{#if form?.error}
				<div
					class="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-800 shadow-xs dark:border-rose-900 dark:bg-rose-950/90 dark:text-rose-200"
				>
					<div class="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400">
						<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div>
						<h4 class="font-semibold text-rose-900 dark:text-rose-100">Upload Failed</h4>
						<p class="mt-0.5 text-xs text-rose-700 dark:text-rose-300">{form.error}</p>
					</div>
				</div>
			{/if}

			{#if form?.success}
				<div
					class="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-xs dark:border-emerald-900 dark:bg-emerald-950/90"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs"
						>
							<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div>
							<h4 class="text-sm font-bold text-emerald-900 dark:text-emerald-100">
								{form.mode === 'existing'
									? 'Photos Added Successfully!'
									: 'Album Created Successfully!'}
							</h4>
							<p class="text-xs text-emerald-700 dark:text-emerald-300">
								{form.photoCount} photo{form.photoCount === 1 ? '' : 's'} saved to
								<strong>"{form.albumTitle}"</strong>.
							</p>
						</div>
					</div>

					{#if form.previewUrl}
						<div
							class="mt-4 overflow-hidden rounded-xl border border-emerald-200/80 bg-white shadow-xs dark:border-emerald-800 dark:bg-slate-900"
						>
							<img src={form.previewUrl} alt="Preview" class="max-h-60 w-full object-cover" />
						</div>
					{/if}

					<div class="mt-4 flex flex-wrap gap-2.5">
						<a
							href={resolve('/[albumId]', { albumId: String(form.albumId) })}
							class="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:from-amber-600 hover:to-orange-600"
						>
							<span>Open Album in Gallery &rarr;</span>
						</a>
						<button
							type="button"
							onclick={() => {
								if (form) form.success = false;
								clearAllPhotos();
								title = '';
							}}
							class="rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800"
						>
							Upload More Photos
						</button>
					</div>
				</div>
			{/if}

			<!-- Upload Mode Tabs Switcher -->
			<div
				class="mb-6 flex rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80"
			>
				<button
					type="button"
					onclick={() => (uploadMode = 'new')}
					class="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all {uploadMode ===
					'new'
						? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
						: 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}"
				>
					<svg
						class="h-4 w-4 text-amber-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
					</svg>
					<span>Create New Album</span>
				</button>

				<button
					type="button"
					onclick={() => (uploadMode = 'existing')}
					class="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all {uploadMode ===
					'existing'
						? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
						: 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}"
				>
					<svg
						class="h-4 w-4 text-orange-500"
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
					<span>Add to Existing Album</span>
				</button>
			</div>

			<!-- Main Upload Form Card -->
			<div
				class="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xs sm:p-9 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
			>
				<form
					method="POST"
					enctype="multipart/form-data"
					use:enhance={({ formData }) => {
						isSubmitting = true;

						// Set mode
						formData.set('mode', uploadMode);
						if (uploadMode === 'existing') {
							formData.set('existingAlbumId', String(selectedAlbumId));
						}

						// Append all selected photos from state
						formData.delete('photos');
						for (const p of selectedPhotos) {
							formData.append('photos', p.file);
						}

						return async ({ update }) => {
							isSubmitting = false;
							await update();
							if (form?.success) {
								clearAllPhotos();
								title = '';
								manualDateText = formatToDMY(new Date());
								pickerDate = formatToISODate(new Date());
							}
						};
					}}
					class="space-y-6"
				>
					<input type="hidden" name="mode" value={uploadMode} />

					{#if uploadMode === 'existing'}
						<!-- Existing Album Selector -->
						<div>
							<label
								for="album-selector"
								class="block text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300"
							>
								Select Target Album <span class="text-rose-500">*</span>
							</label>
							<div class="mt-2">
								{#if data.albums.length === 0}
									<div
										class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300"
									>
										No existing albums found. Please choose <strong>"Create New Album"</strong> above.
									</div>
								{:else}
									<select
										id="album-selector"
										name="existingAlbumId"
										bind:value={selectedAlbumId}
										required
										class="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
									>
										<option value="" disabled>-- Select an existing album --</option>
										{#each data.albums as a (a.id)}
											<option value={String(a.id)}>
												{a.title} ({a.tag}) • {new Date(a.createdAt).toLocaleDateString('en-US', {
													month: 'short',
													day: 'numeric',
													year: 'numeric'
												})}
											</option>
										{/each}
									</select>
								{/if}
							</div>
						</div>
					{:else}
						<!-- Create New Album Inputs -->
						<!-- Album Name Input -->
						<div>
							<div class="flex items-center justify-between">
								<label
									for="title-input"
									class="block text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300"
								>
									Album Name <span class="text-rose-500">*</span>
								</label>
								<span class="text-[11px] text-slate-400 dark:text-slate-500"
									>Displayed on album card</span
								>
							</div>
							<div class="mt-2">
								<input
									type="text"
									id="title-input"
									name="title"
									bind:value={title}
									required={uploadMode === 'new'}
									placeholder="e.g. Annual Sports Day 2026"
									class="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 shadow-xs transition placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
								/>
							</div>
						</div>

						<!-- Event Date Input (Manual Typing DD-MM-YYYY + Calendar Picker) -->
						<div>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<label
									for={dateInputMode === 'manual' ? 'event-date-manual' : 'event-date-picker'}
									class="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300"
								>
									<span>Event Date</span>
									<span
										class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
										>DD-MM-YYYY</span
									>
									<span class="text-rose-500">*</span>
								</label>

								<!-- Mode Toggle (Manual Typing vs Calendar Picker) -->
								<div
									class="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800"
								>
									<button
										type="button"
										onclick={() => {
											dateInputMode = 'manual';
											if (pickerDate) {
												const p = parseDMYDate(pickerDate);
												if (p) manualDateText = formatToDMY(p);
											}
										}}
										class="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition {dateInputMode ===
										'manual'
											? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
											: 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
										title="Type date manually in DD-MM-YYYY format"
									>
										<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
										<span>Type DD-MM-YYYY</span>
									</button>
									<button
										type="button"
										onclick={() => {
											dateInputMode = 'picker';
											if (manualDateText) {
												const p = parseDMYDate(manualDateText);
												if (p) pickerDate = formatToISODate(p);
											}
										}}
										class="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition {dateInputMode ===
										'picker'
											? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
											: 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
										title="Pick date using visual calendar"
									>
										<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
										<span>Calendar</span>
									</button>
								</div>
							</div>

							<!-- Hidden Input Bound for Form Submission -->
							<input type="hidden" name="eventDate" value={finalEventDateValue} />

							<div class="mt-2">
								{#if dateInputMode === 'manual'}
									<div class="relative">
										<input
											type="text"
											id="event-date-manual"
											bind:value={manualDateText}
											placeholder="DD-MM-YYYY (e.g. 12-05-2026 or 12/05/2026)"
											required={uploadMode === 'new'}
											class="block w-full rounded-xl border px-4 py-2.5 pr-11 text-sm shadow-xs transition placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:outline-none dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 {isValidDate
												? 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-amber-500 focus:bg-white dark:border-slate-700 dark:focus:bg-slate-800'
												: 'border-rose-300 bg-rose-50/30 text-slate-900 focus:border-rose-500 focus:bg-white dark:border-rose-800/60 dark:bg-rose-950/20 dark:text-white'}"
										/>
										<button
											type="button"
											onclick={() => {
												const p = parseDMYDate(manualDateText);
												if (p) pickerDate = formatToISODate(p);
												dateInputMode = 'picker';
											}}
											class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition hover:text-amber-600 dark:hover:text-amber-400"
											title="Switch to calendar picker"
										>
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
												/>
											</svg>
										</button>
									</div>
								{:else}
									<div class="relative">
										<input
											type="date"
											id="event-date-picker"
											bind:value={pickerDate}
											onchange={() => {
												const p = parseDMYDate(pickerDate);
												if (p) manualDateText = formatToDMY(p);
											}}
											required={uploadMode === 'new'}
											class="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 shadow-xs transition placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
										/>
									</div>
								{/if}
							</div>

							<!-- Real-time formatted date preview & validation badge -->
							<div class="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs">
								{#if isValidDate && friendlyDatePreview}
									<div class="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
										<svg
											class="h-3.5 w-3.5 shrink-0"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											/>
										</svg>
										<span
											>Interpreted as: <strong class="font-semibold">{friendlyDatePreview}</strong
											></span
										>
									</div>
								{:else}
									<div class="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
										<svg
											class="h-3.5 w-3.5 shrink-0"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
											/>
										</svg>
										<span
											>Please enter in <strong>DD-MM-YYYY</strong> (e.g. 12-05-2026, 12/05/2026, 12.05.2026)</span
										>
									</div>
								{/if}
								<span class="hidden text-[11px] text-slate-400 sm:inline dark:text-slate-500"
									>Day-Month-Year</span
								>
							</div>

							<!-- Quick Preset Date & Year Chips -->
							<div class="mt-2.5 flex flex-wrap items-center gap-1.5">
								<span class="text-[11px] font-medium text-slate-400 dark:text-slate-500"
									>Quick set:</span
								>
								<button
									type="button"
									onclick={() => applyPreset('today')}
									class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
								>
									Today
								</button>
								<button
									type="button"
									onclick={() => applyPreset('yesterday')}
									class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
								>
									Yesterday
								</button>
								{#each [2026, 2025, 2024, 2023, 2022, 2020] as yr (yr)}
									<button
										type="button"
										onclick={() => applyYear(yr)}
										class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
									>
										{yr}
									</button>
								{/each}
							</div>
						</div>

						<!-- Album Tag / Category Input + Quick Selection Chips -->
						<div>
							<div class="flex items-center justify-between">
								<label
									for="tag-input"
									class="block text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300"
								>
									Album Tag / Category
								</label>
								<span class="text-[11px] text-slate-400 dark:text-slate-500"
									>Used for gallery filter tabs</span
								>
							</div>
							<div class="mt-2">
								<input
									type="text"
									id="tag-input"
									name="tag"
									bind:value={tag}
									placeholder="e.g. Sports, Campus, Arts, Events"
									class="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 shadow-xs transition placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
								/>
							</div>

							<!-- Suggested Tag Chips -->
							<div class="mt-3">
								<span class="text-[11px] font-medium text-slate-500 dark:text-slate-400"
									>Quick suggestions:</span
								>
								<div class="mt-1.5 flex flex-wrap gap-1.5">
									{#each popularTags as t (t)}
										<button
											type="button"
											onclick={() => (tag = t)}
											class="rounded-lg px-2.5 py-1 text-xs font-medium transition {tag.toLowerCase() ===
											t.toLowerCase()
												? 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-xs'
												: 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}"
										>
											{t}
										</button>
									{/each}
								</div>
							</div>
						</div>
					{/if}

					<!-- Multi-Photo Drag and Drop / Picker Zone -->
					<div>
						<div class="flex items-center justify-between">
							<label
								for="photos-input"
								class="block text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300"
							>
								Photos to Upload <span class="text-rose-500">*</span>
							</label>
							{#if selectedPhotos.length > 0}
								<div class="flex items-center gap-2 text-xs">
									<span class="font-semibold text-amber-700 dark:text-amber-400">
										{selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''} ({formatBytes(
											totalSize
										)})
									</span>
									<span>•</span>
									<button
										type="button"
										onclick={clearAllPhotos}
										class="font-medium text-rose-600 hover:underline dark:text-rose-400"
									>
										Clear all
									</button>
								</div>
							{/if}
						</div>

						<div
							class="mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 {isDragging
								? 'scale-[1.01] border-amber-500 bg-amber-50/60 dark:bg-amber-950/40'
								: selectedPhotos.length > 0
									? 'border-amber-300 bg-slate-50/40 dark:border-amber-500/50 dark:bg-slate-800/40'
									: 'border-slate-300 bg-slate-50/40 hover:border-amber-400 hover:bg-amber-50/30 dark:border-slate-700 dark:bg-slate-800/30 dark:hover:border-amber-500/50'}"
							ondragover={handleDragOver}
							ondragleave={handleDragLeave}
							ondrop={handleDrop}
							role="region"
							aria-label="Multi-photo upload drop zone"
						>
							{#if selectedPhotos.length > 0}
								<!-- Selected Photos Grid Preview -->
								<div class="w-full">
									<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
										{#each selectedPhotos as photo (photo.id)}
											<div
												class="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-black/5 shadow-2xs dark:border-slate-700 dark:bg-slate-800"
											>
												<img
													src={photo.previewUrl}
													alt={photo.file.name}
													class="h-full w-full object-cover transition duration-200 group-hover:scale-105"
												/>
												<button
													type="button"
													onclick={() => removePhoto(photo.id)}
													class="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-white backdrop-blur-xs transition hover:bg-rose-600"
													title="Remove this photo"
													aria-label="Remove photo"
												>
													<svg
														class="h-3.5 w-3.5"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
												</button>
												<div
													class="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-1.5 text-left"
												>
													<p class="truncate text-[10px] font-medium text-white">
														{photo.file.name}
													</p>
												</div>
											</div>
										{/each}
									</div>

									<div class="mt-4 flex items-center justify-center">
										<label
											for="photos-input"
											class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
										>
											<svg
												class="h-4 w-4 text-slate-500 dark:text-slate-400"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												stroke-width="2"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M12 4.5v15m7.5-7.5h-15"
												/>
											</svg>
											<span>Add more photos</span>
										</label>
									</div>
								</div>
							{:else}
								<!-- Empty Multi-Photo Dropzone State -->
								<div
									class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner dark:bg-slate-800 dark:text-amber-400"
								>
									<svg
										class="h-6 w-6"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.75"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
										/>
									</svg>
								</div>

								<div class="mt-3">
									<label
										for="photos-input"
										class="cursor-pointer font-semibold text-amber-600 focus-within:outline-none hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
									>
										<span class="text-sm">Click to browse multiple photos</span>
										<span class="text-sm font-normal text-slate-600 dark:text-slate-400">
											or drag & drop</span
										>
									</label>
									<p class="mt-1 text-xs text-slate-400 dark:text-slate-500">
										Select multiple PNG, JPG, WebP, GIF files at once
									</p>
								</div>
							{/if}

							<input
								bind:this={fileInputRef}
								id="photos-input"
								name="photos"
								type="file"
								accept="image/*"
								multiple
								class="sr-only"
								onchange={(e) => {
									const target = e.currentTarget;
									if (target.files && target.files[0]) {
										addFiles(target.files);
									}
								}}
							/>
						</div>
					</div>

					<!-- Submit Button -->
					<div class="pt-2">
						<button
							type="submit"
							disabled={isSubmitting ||
								selectedPhotos.length === 0 ||
								(uploadMode === 'existing' && !selectedAlbumId)}
							class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-amber-500/25 transition-all hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 hover:shadow-lg hover:shadow-amber-500/35 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
								<span>Optimizing {selectedPhotos.length} Photos & Uploading...</span>
							{:else}
								<svg
									class="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
								</svg>
								<span>
									{uploadMode === 'existing' ? 'Add' : 'Create Album & Add'}
									{selectedPhotos.length > 0 ? `${selectedPhotos.length} Photos` : ''}
								</span>
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer
		class="mt-16 border-t border-slate-200/80 bg-white py-8 text-center text-xs text-slate-500 dark:border-slate-800/80 dark:bg-slate-950 dark:text-slate-500"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<p>© {new Date().getFullYear()} School Photo Gallery. Preserving our community memories.</p>
		</div>
	</footer>
</div>
