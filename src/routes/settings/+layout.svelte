<script lang="ts">
	import type { Snippet } from 'svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import { goto } from '$app/navigation';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let isMobile = $state(false);
	let sidebarCollapsed = $state(false);

	// Mobile detection
	$effect(() => {
		const mq = window.matchMedia('(max-width: 768px)');
		isMobile = mq.matches;

		function onMediaChange(e: MediaQueryListEvent) {
			isMobile = e.matches;
		}
		mq.addEventListener('change', onMediaChange);

		return () => mq.removeEventListener('change', onMediaChange);
	});

	function toggleSidebar() {
		if (isMobile) {
			sidebarCollapsed = !sidebarCollapsed;
		} else {
			sidebarCollapsed = !sidebarCollapsed;
		}
	}

	function handleFolderSelect() {
		// Navigate back to home
		goto('/');
	}
</script>

<div class="h-full flex flex-col bg-gray-50">
	<Sidebar
		collapsed={sidebarCollapsed}
		{isMobile}
		activeFolder={'inbox'}
		onToggle={toggleSidebar}
		onSelectFolder={handleFolderSelect}
		currentRoute="/settings"
	/>
	<div class="flex-1 overflow-auto">
		{@render children()}
	</div>
</div>
