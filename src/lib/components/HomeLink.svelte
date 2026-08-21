<script lang="ts">
	interface Props {
		label?: string;
		title?: string;
		class?: string;
	}

	let {
		label = 'Home',
		title = 'Visit School Main Website (rkmvvmmalda.org)',
		class: customClass = ''
	}: Props = $props();
</script>

<a
	href="https://rkmvvmmalda.org"
	target="_blank"
	rel="noopener noreferrer"
	{title}
	class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-amber-400/50 dark:hover:bg-slate-800/80 dark:hover:text-amber-400 {customClass}"
>
	<svg
		class="h-3.5 w-3.5 text-slate-500 dark:text-slate-400"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="2"
		stroke="currentColor"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
		/>
	</svg>
	<span>{label}</span>
</a>
