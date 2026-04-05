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
	<div class="compose-button-shell compose-button-shell-expanded px-2.5 mt-2.5">
		<button
			type="button"
			onclick={onOpenCompose}
			aria-disabled={!isAccountConfigured}
			class={cn(
				"flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl transition-all duration-200 font-semibold text-[13px] will-change-transform",
				isAccountConfigured
					? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-secondary)] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
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
	<div class="compose-button-shell compose-button-shell-collapsed flex flex-col items-center gap-1 px-2 mt-2">
		<button
			type="button"
			onclick={onOpenCompose}
			aria-disabled={!isAccountConfigured}
			class={cn(
				"flex size-9 items-center justify-center rounded-xl relative z-10 transition-all duration-200 will-change-transform",
				isAccountConfigured
					? "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] hover:-translate-y-0.5 cursor-pointer"
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

<style>
	.compose-button-shell {
		animation: compose-button-enter 280ms cubic-bezier(0.22, 1, 0.36, 1);
		transform-origin: top left;
	}

	.compose-button-shell-expanded {
		animation-duration: 320ms;
	}

	.compose-button-shell-collapsed {
		animation-duration: 240ms;
	}

	@keyframes compose-button-enter {
		from {
			opacity: 0;
			transform: translate3d(-6px, 0, 0) scale(0.98);
		}

		to {
			opacity: 1;
			transform: translate3d(0, 0, 0) scale(1);
		}
	}
</style>
