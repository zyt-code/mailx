<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { SquarePen, Lock } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	interface Props {
		isAccountConfigured: boolean;
		collapsed: boolean;
		isMobile: boolean;
		onOpenCompose: () => void;
	}

	let { isAccountConfigured, collapsed, isMobile, onOpenCompose }: Props = $props();
</script>

{#if !collapsed || isMobile}
	<!-- Expanded compose button -->
	<div class="px-2.5 mt-2.5">
		<button
			onclick={onOpenCompose}
			disabled={!isAccountConfigured}
			class={cn(
				"flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg transition-all duration-150 font-semibold text-[13px]",
				isAccountConfigured
					? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-secondary)] shadow-sm hover:shadow-md active:scale-[0.97]"
					: "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed"
			)}
			aria-label={$_('nav.newMessage')}
		>
			{#if isAccountConfigured}
				<SquarePen class="size-[15px]" strokeWidth={1.8} />
				<span>{$_('nav.newMessage')}</span>
			{:else}
				<Lock class="size-[15px]" strokeWidth={1.8} />
				<span>{$_('account.add')}</span>
			{/if}
		</button>
	</div>
{:else}
	<!-- Collapsed compose button -->
	<div class="flex flex-col items-center gap-1 px-2 mt-2">
		<button
			onclick={onOpenCompose}
			disabled={!isAccountConfigured}
			class={cn(
				"flex size-8 items-center justify-center rounded-md relative z-10 transition-all duration-120",
				isAccountConfigured
					? "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
					: "text-[var(--text-quaternary)] cursor-not-allowed"
			)}
			aria-label={$_('mail.compose')}
		>
			{#if isAccountConfigured}
				<SquarePen class="size-[16px]" strokeWidth={1.8} />
			{:else}
				<Lock class="size-[16px]" strokeWidth={1.8} />
			{/if}
		</button>
	</div>
{/if}