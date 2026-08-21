<script lang="ts">
	const currentYear = new Date().getFullYear();
</script>

<footer
	class="mt-16 border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500 dark:border-slate-800/80 dark:bg-slate-950 dark:text-slate-500"
>
	<div
		class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8"
	>
		<p>© {currentYear} RKMVVM's Photo Gallery</p>
		<a
			href="https://rkmvvmmalda.org"
			target="_blank"
			rel="noopener noreferrer"
			class="font-medium text-amber-600 transition hover:underline dark:text-amber-400"
		>
			Visit Main Website (rkmvvmmalda.org)
		</a>
	</div>
</footer>
