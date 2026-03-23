<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import App from '../App.svelte';
	import { ensureInitialized } from '$lib/stores/i18nStore.svelte.js';
	import { locale } from 'svelte-i18n';
	import { Notification } from '$lib/components/ui/notification/index.js';
	import { invoke } from '@tauri-apps/api/core';
	import { listen } from '@tauri-apps/api/event';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { showToast } from '$lib/utils/toast.js';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	function resolveRouteStage(pathname: string): 'mail' | 'settings' | 'other' {
		if (pathname === '/') return 'mail';
		if (pathname.startsWith('/settings')) return 'settings';
		return 'other';
	}
	let routeStage = $derived(resolveRouteStage($page.url.pathname));

	function handleContextMenu(e: MouseEvent) {
		// Allow native context menu on elements with data-allow-context-menu or their children
		const target = e.target as HTMLElement;
		if (target.closest('[data-allow-context-menu]')) return;
		e.preventDefault();
	}

	async function openDevTools() {
		try {
			await invoke('open_devtools');
		} catch (e) {
			console.error('Failed to open devtools:', e);
		}
	}

	// Only handle F12 and Cmd+Option+I / Ctrl+Shift+I, let everything else pass through
	function handleKeyDown(e: KeyboardEvent) {
		// Only capture these specific shortcuts
		if (e.key === 'F12') {
			e.preventDefault();
			openDevTools();
			return;
		}

		if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'I') {
			e.preventDefault();
			openDevTools();
			return;
		}

		// For ALL other keys, do nothing and let the browser handle them naturally
		// Don't call preventDefault() or stopPropagation()
	}

	let unlistenNavigate: () => void;
	let unlistenNotification: () => void;

	// Use addEventListener in capture phase to intercept before anything else
	onMount(() => {
		const handleKeyDownCapture = (e: KeyboardEvent) => {
			// ONLY capture F12 and Cmd/Ctrl+Shift+I
			if (e.key === 'F12') {
				e.preventDefault();
				e.stopPropagation();
				openDevTools();
				return;
			}

			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'I') {
				e.preventDefault();
				e.stopPropagation();
				openDevTools();
				return;
			}

			// Don't interfere with any other keyboard shortcuts
		};

		// Listen for navigate events from Tauri menu
		listen('navigate', (event) => {
			const path = event.payload as string;
			goto(path);
		}).then((unlisten) => {
			unlistenNavigate = unlisten;
		});

		// Listen for notification events from backend
		listen('notification:show', (event) => {
			const payload = event.payload as { title: string; body?: string };
			showToast({
				type: 'info',
				title: payload.title,
				message: payload.body,
				duration: 5000
			});
		}).then((unlisten) => {
			unlistenNotification = unlisten;
		});

		window.addEventListener('keydown', handleKeyDownCapture, { capture: true });
		return () => {
			window.removeEventListener('keydown', handleKeyDownCapture, { capture: true });
			unlistenNavigate?.();
			unlistenNotification?.();
		};
	});

	onDestroy(() => {
		unlistenNavigate?.();
		unlistenNotification?.();
	});
</script>

{#if $locale}
	<App onContextMenu={handleContextMenu}>
		<div class="route-stage-stack">
			{#key routeStage}
				<div
					class="route-stage"
					data-stage={routeStage}
					in:fly={{
						x: routeStage === 'settings' ? 12 : routeStage === 'mail' ? -12 : 0,
						duration: 170,
						opacity: 1,
						easing: cubicOut
					}}
				>
					{@render children()}
				</div>
			{/key}
		</div>
	</App>

	<!-- Global notification component (always rendered) -->
	<Notification />
{/if}

<style>
	.route-stage-stack {
		position: relative;
		height: 100%;
		width: 100%;
		overflow: hidden;
		background: var(--bg-primary);
	}

	.route-stage {
		height: 100%;
		width: 100%;
		will-change: transform;
		background: var(--bg-primary);
		backface-visibility: hidden;
		transform: translateZ(0);
	}
</style>
