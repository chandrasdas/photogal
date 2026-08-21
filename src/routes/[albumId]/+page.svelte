<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import PhotoSwipeLightbox from 'photoswipe/lightbox';
	import type PhotoSwipe from 'photoswipe';
	import 'photoswipe/style.css';
	import AdminBadge from '$lib/components/AdminBadge.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import HomeLink from '$lib/components/HomeLink.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
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

	// State for delete confirmations
	let photoToDelete = $state<{ id: number; index: number; url: string } | null>(null);
	let isDeletingPhoto = $state(false);
	let showDeleteAlbumModal = $state(false);
	let isDeletingAlbum = $state(false);

	function openDeletePhotoModal(photo: { id: number; url: string }, index: number, e: Event) {
		e.preventDefault();
		e.stopPropagation();
		photoToDelete = { ...photo, index };
	}

	function closeDeletePhotoModal() {
		photoToDelete = null;
	}

	function openDeleteAlbumModal() {
		showDeleteAlbumModal = true;
	}

	function closeDeleteAlbumModal() {
		showDeleteAlbumModal = false;
	}

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

	// Slideshow Engine State
	let activePswp = $state<PhotoSwipe | null>(null);
	let isPlayingSlideshow = $state(false);
	let slideshowTimer: ReturnType<typeof setInterval> | null = null;
	const SLIDESHOW_INTERVAL = 4000;

	function updateSlideshowUiIcon(playing: boolean) {
		const btn = document.querySelector('.pswp__button--slideshow-btn');
		if (btn) {
			if (playing) {
				btn.innerHTML =
					'<svg class="pswp__icn" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
				btn.setAttribute('title', 'Pause Slideshow (Space)');
			} else {
				btn.innerHTML =
					'<svg class="pswp__icn" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
				btn.setAttribute('title', 'Play Slideshow (Space)');
			}
		}
	}

	function startSlideshow(startIndex = 0) {
		if (data.photos.length === 0) return;

		if (!activePswp) {
			const items = document.querySelectorAll<HTMLAnchorElement>('a.pswp-album-item');
			if (items[startIndex]) {
				items[startIndex].click();
			} else if (items[0]) {
				items[0].click();
			}
		}

		isPlayingSlideshow = true;
		updateSlideshowUiIcon(true);

		if (slideshowTimer) clearInterval(slideshowTimer);
		slideshowTimer = setInterval(() => {
			if (activePswp) {
				activePswp.next();
			}
		}, SLIDESHOW_INTERVAL);
	}

	function stopSlideshow() {
		isPlayingSlideshow = false;
		updateSlideshowUiIcon(false);
		if (slideshowTimer) {
			clearInterval(slideshowTimer);
			slideshowTimer = null;
		}
	}

	function toggleSlideshow() {
		if (isPlayingSlideshow) {
			stopSlideshow();
		} else {
			startSlideshow(activePswp?.currIndex ?? 0);
		}
	}

	onMount(() => {
		const lightbox = new PhotoSwipeLightbox({
			gallery: '#album-gallery',
			children: 'a.pswp-album-item',
			pswpModule: () => import('photoswipe'),
			padding: { top: 0, bottom: 0, left: 0, right: 0 }
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

		// Register custom UI buttons in PhotoSwipe toolbar
		lightbox.on('uiRegister', () => {
			// Register Slideshow button in lightbox
			lightbox.pswp?.ui?.registerElement({
				name: 'slideshow-btn',
				order: 7,
				isButton: true,
				html: '<svg class="pswp__icn" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
				title: 'Play / Pause Slideshow (Space)',
				onClick: () => {
					toggleSlideshow();
				}
			});
		});

		lightbox.on('afterInit', () => {
			activePswp = lightbox.pswp ?? null;
			updateSlideshowUiIcon(isPlayingSlideshow);
		});

		lightbox.on('change', () => {
			if (isPlayingSlideshow && slideshowTimer) {
				clearInterval(slideshowTimer);
				slideshowTimer = setInterval(() => {
					if (activePswp) {
						activePswp.next();
					}
				}, SLIDESHOW_INTERVAL);
			}
		});

		lightbox.on('close', () => {
			activePswp = null;
			stopSlideshow();
		});

		lightbox.init();

		// Keyboard controls for slideshow
		const onKeyDown = (e: KeyboardEvent) => {
			if (activePswp && e.code === 'Space') {
				e.preventDefault();
				toggleSlideshow();
			}
		};
		window.addEventListener('keydown', onKeyDown);

		return () => {
			window.removeEventListener('keydown', onKeyDown);
			stopSlideshow();
			lightbox.destroy();
		};
	});

	let formattedEventDate = $derived.by(() => {
		const d = data.album.eventDate || data.album.createdAt;
		if (!d) return null;
		return new Date(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	});
</script>

<svelte:head>
	<title>{data.album.title} | RKMVVM Malda</title>
	<meta
		name="description"
		content={`Browse photos from the ${data.album.title} album in the RKMVVM Malda photo gallery.`}
	/>
</svelte:head>

<div
	class="min-h-screen bg-slate-50/70 text-slate-800 antialiased transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100"
>
	<!-- Top Navigation Bar -->
	<header
		class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-all dark:border-slate-800/80 dark:bg-slate-900/85"
	>
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
			<!-- Brand & Breadcrumb -->
			<div class="flex items-center gap-2.5">
				<a
					href={resolve('/')}
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-amber-500 to-orange-500 text-white shadow-xs shadow-amber-500/25 transition hover:scale-105"
					title="Back to All Albums"
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
							d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
						/>
					</svg>
				</a>
				<div class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
					<a
						href={resolve('/')}
						class="font-semibold text-slate-700 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400"
						>Albums</a
					>
					<span>/</span>
					<span class="font-medium text-amber-600 dark:text-amber-400">{data.album.tag}</span>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center gap-2">
				<!-- School Main Website Home Link -->
				<HomeLink />

				<a
					href={resolve('/')}
					class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
				>
					<svg
						class="h-3.5 w-3.5 text-slate-500 dark:text-slate-400"
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
					<span class="hidden sm:inline">All Albums</span>
				</a>

				<!-- Dark Mode Toggle Button -->
				<ThemeToggle />

				{#if data.isAdmin}
					<!-- Admin Badge -->
					<AdminBadge />

					<!-- Logout Action -->
					<form method="POST" action={resolve('/admin/logout')} class="inline">
						<button
							type="submit"
							class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
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
				{:else}
					<!-- Public Guest Admin Login -->
					<a
						href={resolve('/admin/login')}
						class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-amber-400/50 dark:hover:bg-slate-800/80 dark:hover:text-amber-400"
						title="Sign in as Administrator"
					>
						<svg
							class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
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

	<!-- Compact Album Header & Action Toolbar Bar -->
	<section
		class="border-b border-slate-200/80 bg-white/50 py-3 backdrop-blur-xs transition-colors dark:border-slate-800/80 dark:bg-slate-900/50"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<!-- Album Title, Tag & Photo Count -->
				<div class="flex flex-wrap items-center gap-2.5">
					<h1
						class="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl dark:text-white"
					>
						{data.album.title}
					</h1>

					<!-- Category Pill -->
					<span
						class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50/80 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300"
					>
						<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
						{data.album.tag}
					</span>

					<!-- Photos Count Pill -->
					<span
						class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100/80 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
					>
						{data.photos.length}
						{data.photos.length === 1 ? 'photo' : 'photos'}
					</span>

					<!-- Event Date -->
					{#if formattedEventDate}
						<div
							class="hidden items-center gap-1 text-xs text-slate-500 sm:flex dark:text-slate-400"
						>
							<svg
								class="h-3.5 w-3.5 text-amber-500 dark:text-amber-400"
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
							<span>{formattedEventDate}</span>
						</div>
					{/if}
				</div>

				<!-- Actions Toolbar -->
				<div class="flex flex-wrap items-center gap-2">
					<!-- Slideshow Button -->
					<button
						type="button"
						onclick={() => startSlideshow(0)}
						disabled={data.photos.length === 0}
						class="inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:from-amber-600 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
						title="Start automatic photo slideshow"
					>
						<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
						<span>Slideshow</span>
					</button>

					<!-- Grid Layout Density Switcher -->
					<div
						class="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
					>
						<button
							type="button"
							onclick={() => (gridCols = 'normal')}
							title="Large Grid View"
							class="rounded-md p-1.5 transition {gridCols === 'normal'
								? 'bg-amber-50 font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
								: 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'}"
						>
							<svg
								class="h-3.5 w-3.5"
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
							class="rounded-md p-1.5 transition {gridCols === 'compact'
								? 'bg-amber-50 font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
								: 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'}"
						>
							<svg
								class="h-3.5 w-3.5"
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

					{#if data.isAdmin}
						<!-- Add Photos Toggle -->
						<button
							type="button"
							onclick={toggleOrOpenAddPhotos}
							class="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50/80 px-2.5 py-1.5 text-xs font-bold text-amber-800 shadow-2xs transition hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
						>
							<svg
								class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
							</svg>
							<span>{showAddPhotos ? 'Close Upload' : 'Add Photos'}</span>
						</button>

						<!-- Delete Album Button -->
						<button
							type="button"
							onclick={openDeleteAlbumModal}
							class="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-2xs transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60"
							title="Delete this entire album"
						>
							<svg
								class="h-3.5 w-3.5 text-rose-600 dark:text-rose-400"
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
							<span class="hidden sm:inline">Delete Album</span>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Main Photo Area -->
	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<!-- Feedback Alerts -->
		{#if form?.error}
			<div
				class="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 shadow-xs dark:border-rose-900 dark:bg-rose-950/90 dark:text-rose-200"
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
					<h4 class="font-semibold text-rose-900 dark:text-rose-100">Action Failed</h4>
					<p class="mt-0.5 text-xs text-rose-700 dark:text-rose-300">{form.error}</p>
				</div>
			</div>
		{/if}

		{#if form?.success && form.action === 'addPhotos'}
			<div
				class="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-800 shadow-xs dark:border-emerald-900 dark:bg-emerald-950/90 dark:text-emerald-200"
			>
				<div class="flex items-center gap-2.5">
					<div
						class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs"
					>
						<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div>
						<h4 class="font-bold text-emerald-900 dark:text-emerald-100">
							Photos Added Successfully!
						</h4>
						<p class="text-xs text-emerald-700 dark:text-emerald-300">
							Added {form.addedCount} new photo{form.addedCount === 1 ? '' : 's'} to this album.
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => {
						if (form) form.success = false;
					}}
					class="font-semibold text-emerald-800 hover:underline dark:text-emerald-300"
				>
					Dismiss
				</button>
			</div>
		{/if}

		{#if form?.success && form.action === 'deletePhoto'}
			<div
				class="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-800 shadow-xs dark:border-emerald-900 dark:bg-emerald-950/90 dark:text-emerald-200"
			>
				<div class="flex items-center gap-2.5">
					<div
						class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs"
					>
						<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div>
						<h4 class="font-bold text-emerald-900 dark:text-emerald-100">Photo Deleted</h4>
						<p class="text-xs text-emerald-700 dark:text-emerald-300">
							The photo was permanently removed from this album.
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => {
						if (form) form.success = false;
					}}
					class="font-semibold text-emerald-800 hover:underline dark:text-emerald-300"
				>
					Dismiss
				</button>
			</div>
		{/if}

		<!-- Expandable Upload Photos to This Album Box (Admin Only) -->
		{#if data.isAdmin && showAddPhotos}
			<div
				id="upload-section"
				class="mb-8 scroll-mt-24 rounded-2xl border border-amber-200/80 bg-white/95 p-5 shadow-lg shadow-amber-500/10 backdrop-blur-xs transition-all dark:border-slate-800 dark:bg-slate-900/95"
			>
				<div
					class="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800"
				>
					<div>
						<h3 class="text-base font-bold text-slate-900 dark:text-white">
							Add Photos to "{data.album.title}"
						</h3>
						<p class="text-xs text-slate-500 dark:text-slate-400">
							Select or drop photos below to append them into this album.
						</p>
					</div>
					<button
						type="button"
						onclick={() => (showAddPhotos = false)}
						class="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-300"
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
					class="space-y-4"
				>
					<!-- Dropzone -->
					<div>
						<div class="mb-2 flex items-center justify-between">
							<span
								class="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300"
								>Select Photo Files</span
							>
							{#if selectedPhotos.length > 0}
								<div class="flex items-center gap-2 text-xs">
									<span class="font-semibold text-amber-700 dark:text-amber-400">
										{selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''} ({formatBytes(
											totalSelectedSize
										)})
									</span>
									<span>•</span>
									<button
										type="button"
										onclick={clearAllPhotos}
										class="font-medium text-rose-600 hover:underline dark:text-rose-400"
									>
										Clear
									</button>
								</div>
							{/if}
						</div>

						<div
							class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-all duration-200 {isDragging
								? 'scale-[1.01] border-amber-500 bg-amber-50/60 dark:bg-amber-950/40'
								: selectedPhotos.length > 0
									? 'border-amber-300 bg-slate-50/40 dark:border-amber-500/50 dark:bg-slate-800/40'
									: 'border-slate-300 bg-slate-50/40 hover:border-amber-400 hover:bg-amber-50/30 dark:border-slate-700 dark:bg-slate-800/30'}"
							ondragover={handleDragOver}
							ondragleave={handleDragLeave}
							ondrop={handleDrop}
							role="region"
							aria-label="Add photos dropzone"
						>
							{#if selectedPhotos.length > 0}
								<!-- Selected preview grid -->
								<div class="w-full">
									<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
										{#each selectedPhotos as photo (photo.id)}
											<div
												class="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-black/5 shadow-2xs dark:border-slate-700"
											>
												<img
													src={photo.previewUrl}
													alt={photo.file.name}
													class="h-full w-full object-cover transition duration-200 group-hover:scale-105"
												/>
												<button
													type="button"
													onclick={() => removePhoto(photo.id)}
													class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/80 text-white backdrop-blur-xs transition hover:bg-rose-600"
													title="Remove this photo"
													aria-label="Remove photo"
												>
													<svg
														class="h-3 w-3"
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

									<div class="mt-3 flex items-center justify-center">
										<label
											for="add-photos-input"
											class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
										>
											<svg
												class="h-3.5 w-3.5 text-slate-500"
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
									class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shadow-inner dark:bg-slate-800 dark:text-amber-400"
								>
									<svg
										class="h-5 w-5"
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
								<div class="mt-2">
									<label
										for="add-photos-input"
										class="cursor-pointer font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
									>
										<span class="text-xs">Click to choose photos</span>
										<span class="text-xs font-normal text-slate-600 dark:text-slate-400">
											or drag & drop</span
										>
									</label>
									<p class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
										PNG, JPG, WebP, GIF supported
									</p>
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
					<div class="flex items-center justify-end gap-2.5 pt-1">
						<button
							type="button"
							onclick={() => {
								clearAllPhotos();
								showAddPhotos = false;
							}}
							class="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
						>
							Cancel
						</button>

						<button
							type="submit"
							disabled={isSubmitting || selectedPhotos.length === 0}
							class="inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
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
								<span>Uploading...</span>
							{:else}
								<span
									>Upload {selectedPhotos.length > 0 ? `${selectedPhotos.length} Photos` : ''}</span
								>
							{/if}
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Photo Grid -->
		{#if data.photos.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center shadow-2xs backdrop-blur-xs dark:border-slate-700 dark:bg-slate-900/60"
			>
				<div
					class="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner dark:bg-slate-800 dark:text-amber-400"
				>
					<svg
						class="h-7 w-7"
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
				<h3 class="mt-4 text-base font-bold text-slate-900 dark:text-white">This album is empty</h3>
				<p class="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
					No photos have been uploaded to this album yet.
				</p>
				{#if data.isAdmin}
					<button
						type="button"
						onclick={openAddPhotos}
						class="mt-5 inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/25 transition hover:from-amber-600 hover:to-orange-600"
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
						Upload First Photos
					</button>
				{/if}
			</div>
		{:else}
			<div
				id="album-gallery"
				class="grid gap-3.5 sm:gap-5 {gridCols === 'normal'
					? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
					: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6'}"
			>
				{#each data.photos as photo, index (photo.id)}
					<div
						class="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-400/50"
					>
						<!-- Lightbox Anchor -->
						<a
							href={photo.url}
							data-pswp-width={photo.width || 1920}
							data-pswp-height={photo.height || 1080}
							target="_blank"
							rel="noreferrer external"
							class="pswp-album-item block aspect-4/3 overflow-hidden bg-slate-100 dark:bg-slate-800"
						>
							<img
								src={photo.url}
								alt={`${data.album.title} - Photo #${index + 1}`}
								loading="lazy"
								class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
							/>

							<!-- Floating Cover Badge -->
							{#if data.album.coverPhotoId === photo.id || (!data.album.coverPhotoId && index === 0)}
								<div class="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
									<span
										class="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-400/95 px-2 py-0.5 text-[10px] font-extrabold text-amber-950 shadow-xs backdrop-blur-md dark:border-amber-500/80 dark:bg-amber-500/90 dark:text-amber-950"
										title="Current Album Cover"
									>
										<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
											<path
												d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
											/>
										</svg>
										<span>Cover</span>
									</span>
								</div>
							{/if}

							<!-- Hover Zoom Overlay Hint -->
							<div
								class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
							>
								<div
									class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-md backdrop-blur-xs"
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
											d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6"
										/>
									</svg>
								</div>
							</div>
						</a>

						<!-- Admin Quick Actions Bar (Bottom of each photo card) -->
						{#if data.isAdmin}
							<div
								class="flex items-center justify-between border-t border-slate-100 bg-slate-50/90 px-3 py-1.5 text-xs transition-colors dark:border-slate-800 dark:bg-slate-800/80"
							>
								<!-- Set as Cover Action -->
								<form method="POST" action="?/setCoverPhoto" use:enhance class="inline">
									<input type="hidden" name="photoId" value={photo.id} />
									<button
										type="submit"
										class="inline-flex items-center gap-1 font-medium transition {data.album
											.coverPhotoId === photo.id ||
										(!data.album.coverPhotoId && index === 0)
											? 'font-bold text-amber-700 dark:text-amber-400'
											: 'text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-300'}"
										title="Set this photo as album cover thumbnail"
									>
										<svg
											class="h-3.5 w-3.5 {data.album.coverPhotoId === photo.id ||
											(!data.album.coverPhotoId && index === 0)
												? 'fill-amber-500 text-amber-500'
												: 'text-slate-400'}"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="2"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
											/>
										</svg>
										<span class="text-[11px]">
											{data.album.coverPhotoId === photo.id ||
											(!data.album.coverPhotoId && index === 0)
												? 'Cover Photo'
												: 'Make Cover'}
										</span>
									</button>
								</form>

								<!-- Delete Photo Button -->
								<button
									type="button"
									onclick={(e) => openDeletePhotoModal(photo, index, e)}
									class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
									title="Delete this photo"
								>
									<svg
										class="h-3 w-3"
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
									<span>Delete</span>
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</main>

	<!-- Delete Photo Confirmation Modal -->
	{#if photoToDelete}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-photo-title"
		>
			<button
				type="button"
				class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
				onclick={closeDeletePhotoModal}
				aria-label="Close delete photo modal"
			></button>

			<div
				class="relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
			>
				<div class="flex items-start gap-4">
					<div
						class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
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
								d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
							/>
						</svg>
					</div>
					<div>
						<h3
							id="delete-photo-title"
							class="text-base font-extrabold text-slate-900 dark:text-white"
						>
							Delete Photo #{photoToDelete.index + 1}?
						</h3>
						<p class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
							This will permanently remove this photo file from the album and disk.
						</p>
					</div>
				</div>

				<div class="mt-6 flex items-center justify-end gap-2.5">
					<button
						type="button"
						onclick={closeDeletePhotoModal}
						disabled={isDeletingPhoto}
						class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
					>
						Cancel
					</button>

					<form
						method="POST"
						action="?/deletePhoto"
						use:enhance={() => {
							isDeletingPhoto = true;
							return async ({ update }) => {
								isDeletingPhoto = false;
								closeDeletePhotoModal();
								await update();
							};
						}}
					>
						<input type="hidden" name="photoId" value={photoToDelete.id} />
						<button
							type="submit"
							disabled={isDeletingPhoto}
							class="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 disabled:opacity-60"
						>
							{#if isDeletingPhoto}
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
								<span>Delete Photo</span>
							{/if}
						</button>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<!-- Delete Album Confirmation Modal -->
	{#if showDeleteAlbumModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-entire-album-title"
		>
			<button
				type="button"
				class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
				onclick={closeDeleteAlbumModal}
				aria-label="Close delete album modal"
			></button>

			<div
				class="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
			>
				<div class="flex items-start gap-4">
					<div
						class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
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
								d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
							/>
						</svg>
					</div>
					<div>
						<h3
							id="delete-entire-album-title"
							class="text-base font-extrabold text-slate-900 dark:text-white"
						>
							Delete "{data.album.title}"?
						</h3>
						<p class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
							Are you sure you want to delete this entire album? All
							<strong>{data.photos.length} photos</strong> will be permanently removed from disk and database.
						</p>
					</div>
				</div>

				<div class="mt-6 flex items-center justify-end gap-2.5">
					<button
						type="button"
						onclick={closeDeleteAlbumModal}
						disabled={isDeletingAlbum}
						class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
					>
						Cancel
					</button>

					<form
						method="POST"
						action="?/deleteAlbum"
						use:enhance={() => {
							isDeletingAlbum = true;
							return async ({ update }) => {
								isDeletingAlbum = false;
								closeDeleteAlbumModal();
								await update();
							};
						}}
					>
						<button
							type="submit"
							disabled={isDeletingAlbum}
							class="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 disabled:opacity-60"
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
								<span>Deleting Album...</span>
							{:else}
								<span>Yes, Delete Album</span>
							{/if}
						</button>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<!-- Shared Footer -->
	<Footer />
</div>
