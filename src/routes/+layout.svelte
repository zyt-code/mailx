<script lang="ts">
	import type { Snippet } from 'svelte';
	import App from '../App.svelte';
	import { ensureInitialized } from '$lib/stores/i18nStore.svelte.js';
	import { locale } from 'svelte-i18n';
	import { Notification } from '$lib/components/ui/notification/index.js';
	import { invoke } from '@tauri-apps/api/core';
	import { listen } from '@tauri-apps/api/event';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

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
			console.log('[Layout] Received notification:show event:', event.payload);
			const payload = event.payload as { title: string; body?: string };

			// Check if notification API is available
			if (!(window as any).notification?.show) {
				console.error('[Layout] window.notification.show not available!');
				return;
			}

			console.log('[Layout] Calling notification.show with:', payload);
			(window as any).notification.show({
				type: 'info',
				title: payload.title,
				message: payload.body,
				duration: 5000
			});
			console.log('[Layout] notification.show called successfully');
		}).then((unlisten) => {
			unlistenNotification = unlisten;
			console.log('[Layout] notification:show listener registered');
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
		{@render children()}
	</App>

	<!-- Global notification component (always rendered) -->
	<Notification />
{/if}
