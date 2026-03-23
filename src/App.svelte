<script lang="ts">
	import './app.css';
	import type { Snippet } from 'svelte';
	import { onDestroy, onMount } from 'svelte';
	import { getCurrentWindow, type Theme as TauriTheme } from '@tauri-apps/api/window';
	import { setSystemTheme } from '$lib/stores/preferencesStore.js';

	interface Props {
		children?: Snippet;
		onContextMenu?: (event: MouseEvent) => void;
	}

	let { children, onContextMenu }: Props = $props();

	let cleanupThemeSync: (() => void) | null = null;

	function normalizeTheme(theme: TauriTheme | null | undefined): 'light' | 'dark' | null {
		return theme === 'dark' || theme === 'light' ? theme : null;
	}

	function applySystemTheme(theme: 'light' | 'dark'): void {
		setSystemTheme(theme);
	}

	onMount(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const mediaHandler = (event: MediaQueryListEvent): void => {
			applySystemTheme(event.matches ? 'dark' : 'light');
		};

		applySystemTheme(mediaQuery.matches ? 'dark' : 'light');
		mediaQuery.addEventListener('change', mediaHandler);

		let disposed = false;
		let unlistenThemeChanged: (() => void) | null = null;

		(async () => {
			try {
				const currentWindow = getCurrentWindow();
				const tauriTheme = normalizeTheme(await currentWindow.theme());
				if (!disposed && tauriTheme) {
					applySystemTheme(tauriTheme);
				}

				unlistenThemeChanged = await currentWindow.onThemeChanged(({ payload }) => {
					const nextTheme = normalizeTheme(payload);
					applySystemTheme(nextTheme ?? (mediaQuery.matches ? 'dark' : 'light'));
				});
			} catch {
				// Fall back to matchMedia only when the Tauri window API is unavailable.
			}
		})();

		cleanupThemeSync = () => {
			disposed = true;
			mediaQuery.removeEventListener('change', mediaHandler);
			unlistenThemeChanged?.();
			setSystemTheme(null);
		};

		return cleanupThemeSync;
	});

	onDestroy(() => {
		cleanupThemeSync?.();
	});
</script>

<div class="app-root dark:bg-[var(--bg-primary)] dark:text-[var(--text-primary)]">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="app-content dark:bg-[var(--bg-primary)]"
		oncontextmenu={(event) => onContextMenu?.(event)}
	>
		{@render children?.()}
	</div>
</div>

<style>
	.app-root {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
		overflow: hidden;
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	.app-content {
		flex: 1;
		overflow: hidden;
		position: relative;
		background: var(--bg-primary);
	}
</style>
