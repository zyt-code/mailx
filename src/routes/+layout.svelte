<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { AppShell } from '$lib/components/layout/index.js';
</script>

{#if $page.url.pathname === '/settings'}
	<slot />
{:else}
	<AppShell>
		<slot />
	</AppShell>
{/if}
