<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { AppShell } from '$lib/components/layout/index.js';

	function handleContextMenu(e: MouseEvent) {
		// Allow native context menu on elements with data-allow-context-menu or their children
		const target = e.target as HTMLElement;
		if (target.closest('[data-allow-context-menu]')) return;
		e.preventDefault();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div oncontextmenu={handleContextMenu} class="contents">
	{#if $page.url.pathname.startsWith('/settings')}
		<slot />
	{:else}
		<AppShell>
			<slot />
		</AppShell>
	{/if}
</div>
