import { browser } from '$app/environment';

let isDarkState = $state(false);

if (browser) {
	isDarkState = document.documentElement.classList.contains('dark');
}

export function getIsDark(): boolean {
	return isDarkState;
}

export function toggleTheme(): void {
	if (!browser) return;
	isDarkState = !isDarkState;
	if (isDarkState) {
		document.documentElement.classList.add('dark');
		try {
			localStorage.setItem('theme', 'dark');
		} catch {
			// localStorage might be unavailable
		}
	} else {
		document.documentElement.classList.remove('dark');
		try {
			localStorage.setItem('theme', 'light');
		} catch {
			// localStorage might be unavailable
		}
	}
}
