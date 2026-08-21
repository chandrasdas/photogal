<script lang="ts">
	interface Props {
		text?: string;
		class?: string;
	}

	let { text = 'Admin', class: customClass = '' }: Props = $props();
</script>

<div
	class="hidden items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/90 px-2.5 py-1 text-xs font-bold text-amber-800 sm:inline-flex dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300 {customClass}"
>
	<span class="relative flex h-1.5 w-1.5">
		<span
			class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"
		></span>
		<span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
	</span>
	<span>{text}</span>
</div>
