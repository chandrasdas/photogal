<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import PhotoSwipeLightbox from 'photoswipe/lightbox';
	import 'photoswipe/style.css';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	interface SelectedPhoto {
		id: string;
		file: File;
		previewUrl: string;
	}

	let gridCols = $state<'normal' | 'compact'>('normal');
	let showAddPhotos = $state(false);
	let isSubmitting = $state(false);
	let isDragging = $state(false);
	let selectedPhotos = $state<SelectedPhoto[]>([]);
	let fileInputRef = $state<HTMLInputElement | null>(null);

	function openAddPhotos() {
		showAddPhotos = true;
		setTimeout(() => {
			const uploadSection = document.getElementById('upload-section');
			if (uploadSection) {
				uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
			} else {
				window.scrollTo({ top: 0, behavior: 'smooth' });
			}
		}, 50);
	}

	function toggleOrOpenAddPhotos() {
		showAddPhotos = !showAddPhotos;
		if (showAddPhotos) {
			setTimeout(() => {
				const uploadSection = document.getElementById('upload-section');
				if (uploadSection) {
					uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
				} else {
					window.scrollTo({ top: 0, behavior: 'smooth' });
				}
			}, 50);
		}
	}

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

	let totalSelectedSize = $derived(selectedPhotos.reduce((acc, p) => acc + p.file.size, 0));

	onMount(() => {
		const lightbox = new PhotoSwipeLightbox({
			gallery: '#album-gallery',
			children: 'a.pswp-album-item',
			pswpModule: () => import('photoswipe'),
			padding: { top: 24, bottom: 24, left: 24, right: 24 }
		});

		// Dynamic size calculation: Automatically set exact original aspect ratio
		lightbox.addFilter('domItemData', (itemData, element) => {
			const img = element.querySelector('img');
			if (img && img.naturalWidth && img.naturalHeight) {
				itemData.width = img.naturalWidth;
				itemData.height = img.naturalHeight;
			}
			return itemData;
		});

		lightbox.init();

		return () => {
			lightbox.destroy();
		};
	});

	let formattedDate = $derived.by(() => {
		if (!data.album.createdAt) return 'Unknown date';
		return new Date(data.album.createdAt).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	});
</script>

<svelte:head>
	<title>{data.album.title} | School Photo Archive</title>
	<meta
		name="description"
		content={`Browse photos from the ${data.album.title} album in the school photo archive.`}
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50/70 text-slate-800 antialiased">
	<!-- Top Sticky Navigation Bar -->
	<header
		class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all"
	>
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
			<!-- Brand & Breadcrumb -->
			<div class="flex items-center gap-3">
				<a
					href={resolve('/photo-gallery')}
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 transition hover:scale-105"
					title="Back to All Albums"
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
				</a>
				<div class="hidden sm:block">
					<div
						class="flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-600 uppercase"
					>
						<a href={resolve('/photo-gallery')} class="hover:underline">Albums</a>
						<span>/</span>
						<span class="text-slate-500">{data.album.tag}</span>
					</div>
					<h2 class="line-clamp-1 max-w-sm text-base font-extrabold text-slate-900">
						{data.album.title}
					</h2>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center gap-3">
				<a
					href={resolve('/photo-gallery')}
					class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
				>
					<svg
						class="h-4 w-4 text-slate-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
						/>
					</svg>
					<span>All Albums</span>
				</a>

				<button
					type="button"
					onclick={toggleOrOpenAddPhotos}
					class="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-amber-500/25 transition hover:from-amber-600 hover:to-orange-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none"
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
					<span>{showAddPhotos ? 'Close Upload' : 'Add Photos'}</span>
				</button>
			</div>
		</div>
	</header>

	<!-- Album Hero Banner -->
	<section
		class="relative overflow-hidden border-b border-slate-200/80 bg-linear-to-b from-white via-amber-50/40 to-slate-50 py-10 sm:py-14"
	>
		<div
			class="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-3xl -translate-x-1/2 rounded-full bg-linear-to-tr from-amber-200/50 to-orange-200/40 blur-3xl"
		></div>

		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="max-w-3xl">
				<!-- Tag Pill -->
				<div class="flex items-center gap-2.5">
					<span
						class="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1 text-xs font-bold text-amber-800 shadow-xs"
					>
						<span class="h-2 w-2 rounded-full bg-amber-500"></span>
						{data.album.tag}
					</span>

					<span class="text-xs font-semibold text-slate-500">
						Created {formattedDate}
					</span>
				</div>

				<h1
					class="mt-3.5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl sm:leading-tight"
				>
					{data.album.title}
				</h1>

				<div class="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
					<div
						class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-1.5 shadow-xs"
					>
						<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
						<span><strong>{data.photos.length}</strong> Total Photos in Album</span>
					</div>

					<div
						class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-1.5 shadow-xs"
					>
						<span class="h-2 w-2 rounded-full bg-amber-500"></span>
						<span>Original Aspect Ratio Display</span>
					</div>

					<button
						type="button"
						onclick={openAddPhotos}
						class="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/80 px-3.5 py-1.5 font-bold text-amber-800 shadow-xs transition hover:bg-amber-100"
					>
						<svg
							class="h-3.5 w-3.5 text-amber-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
						</svg>
						<span>+ Add More Photos</span>
					</button>
				</div>
			</div>
		</div>
	</section>

	<!-- Main Area -->
	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Feedback Alerts -->
		{#if form?.error}
			<div
				class="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-800 shadow-xs"
			>
				<div class="mt-0.5 shrink-0 text-rose-600">
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div>
					<h4 class="font-semibold text-rose-900">Upload Failed</h4>
					<p class="mt-0.5 text-xs text-rose-700">{form.error}</p>
				</div>
			</div>
		{/if}

		{#if form?.success}
			<div
				class="mb-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs"
					>
						<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div>
						<h4 class="text-sm font-bold text-emerald-900">Photos Added Successfully!</h4>
						<p class="text-xs text-emerald-700">
							Added {form.addedCount} new photo{form.addedCount === 1 ? '' : 's'} to this album.
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => {
						if (form) form.success = false;
					}}
					class="text-xs font-semibold text-emerald-800 hover:underline"
				>
					Dismiss
				</button>
			</div>
		{/if}

		<!-- Expandable Upload Photos to This Album Box -->
		{#if showAddPhotos}
			<div
				id="upload-section"
				class="mb-10 scroll-mt-24 rounded-3xl border border-amber-200/80 bg-white/95 p-6 shadow-xl shadow-amber-500/10 backdrop-blur-xs transition-all sm:p-8"
			>
				<div class="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
					<div>
						<h3 class="text-lg font-bold text-slate-900">Add Photos to "{data.album.title}"</h3>
						<p class="text-xs text-slate-500">
							Select or drop photos below to append them into this album.
						</p>
					</div>
					<button
						type="button"
						onclick={() => (showAddPhotos = false)}
						class="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-slate-600"
						title="Close upload box"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<form
					method="POST"
					action="?/addPhotos"
					enctype="multipart/form-data"
					use:enhance={({ formData }) => {
						isSubmitting = true;

						formData.delete('photos');
						for (const p of selectedPhotos) {
							formData.append('photos', p.file);
						}

						return async ({ update }) => {
							isSubmitting = false;
							await update();
							if (form?.success) {
								clearAllPhotos();
								showAddPhotos = false;
							}
						};
					}}
					class="space-y-6"
				>
					<!-- Dropzone -->
					<div>
						<div class="mb-2 flex items-center justify-between">
							<span class="text-xs font-bold tracking-wider text-slate-700 uppercase"
								>Select Photo Files</span
							>
							{#if selectedPhotos.length > 0}
								<div class="flex items-center gap-2 text-xs">
									<span class="font-semibold text-amber-700">
										{selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''} ({formatBytes(
											totalSelectedSize
										)})
									</span>
									<span>•</span>
									<button
										type="button"
										onclick={clearAllPhotos}
										class="font-medium text-rose-600 hover:underline"
									>
										Clear
									</button>
								</div>
							{/if}
						</div>

						<div
							class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 {isDragging
								? 'scale-[1.01] border-amber-500 bg-amber-50/60'
								: selectedPhotos.length > 0
									? 'border-amber-300 bg-slate-50/40'
									: 'border-slate-300 bg-slate-50/40 hover:border-amber-400 hover:bg-amber-50/30'}"
							ondragover={handleDragOver}
							ondragleave={handleDragLeave}
							ondrop={handleDrop}
							role="region"
							aria-label="Add photos dropzone"
						>
							{#if selectedPhotos.length > 0}
								<!-- Selected preview grid -->
								<div class="w-full">
									<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
										{#each selectedPhotos as photo (photo.id)}
											<div
												class="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-black/5 shadow-2xs"
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
													class="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-1 text-left"
												>
													<p class="truncate text-[9px] font-medium text-white">
														{photo.file.name}
													</p>
												</div>
											</div>
										{/each}
									</div>

									<div class="mt-4 flex items-center justify-center">
										<label
											for="add-photos-input"
											class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
										>
											<svg
												class="h-4 w-4 text-slate-500"
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
											<span>Select more photos</span>
										</label>
									</div>
								</div>
							{:else}
								<!-- Empty state -->
								<div
									class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner"
								>
									<svg
										class="h-6 w-6"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="1.75"
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
										for="add-photos-input"
										class="cursor-pointer font-semibold text-amber-600 hover:text-amber-700"
									>
										<span class="text-sm">Click to choose photos</span>
										<span class="text-sm font-normal text-slate-600"> or drag & drop</span>
									</label>
									<p class="mt-1 text-xs text-slate-400">PNG, JPG, WebP, GIF supported</p>
								</div>
							{/if}

							<input
								bind:this={fileInputRef}
								id="add-photos-input"
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

					<!-- Upload Button -->
					<div class="flex items-center justify-end gap-3 pt-2">
						<button
							type="button"
							onclick={() => {
								clearAllPhotos();
								showAddPhotos = false;
							}}
							class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
						>
							Cancel
						</button>

						<button
							type="submit"
							disabled={isSubmitting || selectedPhotos.length === 0}
							class="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-amber-500/25 transition hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if isSubmitting}
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
								<span>Optimizing & Adding Photos...</span>
							{:else}
								<span
									>Upload {selectedPhotos.length > 0 ? `${selectedPhotos.length} Photos` : ''} to Album</span
								>
							{/if}
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Action & density bar -->
		<div class="mb-8 flex items-center justify-between border-b border-slate-200/80 pb-4">
			<span class="text-xs text-slate-500">
				Displaying <strong class="text-slate-900">{data.photos.length}</strong> photos in original proportions
				• Click any image to open lightbox
			</span>

			<div class="flex items-center gap-3">
				<div class="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
					<button
						type="button"
						onclick={() => (gridCols = 'normal')}
						title="Large Grid View"
						class="rounded-lg p-1.5 transition {gridCols === 'normal'
							? 'bg-amber-50 font-bold text-amber-700'
							: 'text-slate-400 hover:text-slate-700'}"
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
								d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
							/>
						</svg>
					</button>
					<button
						type="button"
						onclick={() => (gridCols = 'compact')}
						title="Compact Grid View"
						class="rounded-lg p-1.5 transition {gridCols === 'compact'
							? 'bg-amber-50 font-bold text-amber-700'
							: 'text-slate-400 hover:text-slate-700'}"
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
								d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>

		<!-- Masonry Photo Grid in Original Aspect Ratio -->
		{#if data.photos.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center shadow-2xs backdrop-blur-xs"
			>
				<p class="text-sm text-slate-500">No photos in this album yet.</p>
				<button
					type="button"
					onclick={openAddPhotos}
					class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-xs"
				>
					<span>Upload Photos Now</span>
				</button>
			</div>
		{:else}
			<div
				id="album-gallery"
				class="transition-all duration-300 {gridCols === 'normal'
					? 'columns-1 gap-5 sm:columns-2 md:columns-3 lg:columns-4'
					: 'columns-2 gap-4 sm:columns-3 md:columns-4 lg:columns-5'}"
			>
				{#each data.photos as photo, index (photo.id)}
					<div
						class="group mb-5 break-inside-avoid overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/15"
					>
						<a
							href={photo.url}
							data-pswp-width={photo.width || 0}
							data-pswp-height={photo.height || 0}
							target="_blank"
							rel="noreferrer external"
							class="pswp-album-item relative block overflow-hidden bg-slate-100"
						>
							<img
								src={photo.url}
								alt={`${data.album.title} - Photo ${index + 1}`}
								loading="lazy"
								class="block h-auto w-full transition-transform duration-500 ease-out group-hover:scale-105"
							/>

							<!-- Number Pill -->
							<div class="absolute top-2.5 left-2.5 z-10">
								<span
									class="inline-flex items-center rounded-lg border border-white/60 bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-800 shadow-sm backdrop-blur-md"
								>
									#{index + 1}
								</span>
							</div>

							<!-- Hover Lightbox Trigger Overlay -->
							<div
								class="absolute inset-0 flex items-center justify-center bg-linear-to-t from-slate-900/60 via-slate-900/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
							>
								<span
									class="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/20 px-3 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-md transition-transform duration-300 group-hover:scale-105"
								>
									<svg
										class="h-3.5 w-3.5"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="2.5"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
										/>
									</svg>
									View Full
								</span>
							</div>
						</a>
					</div>
				{/each}
			</div>
		{/if}
	</main>

	<!-- Footer -->
	<footer
		class="mt-16 border-t border-slate-200/80 bg-white py-8 text-center text-xs text-slate-500"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<p>© {new Date().getFullYear()} School Photo Gallery. Preserving our community memories.</p>
		</div>
	</footer>
</div>
