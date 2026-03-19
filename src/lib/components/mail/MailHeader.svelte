<script lang="ts">
	import type { Mail } from '$lib/types.js';
	import { ChevronDown, ChevronRight, Star } from 'lucide-svelte';
	import { cn } from '$lib/utils.js';

	interface Props {
		mail: Mail;
	}

	let { mail }: Props = $props();

	let showDetails = $state(false);

	function formatFullDate(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const isToday =
			date.getDate() === now.getDate() &&
			date.getMonth() === now.getMonth() &&
			date.getFullYear() === now.getFullYear();

		if (isToday) {
			return date.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		}

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
	}

	function formatEmailAddress(addr: { name: string; email: string }): string {
		if (addr.name && addr.name !== addr.email) {
			return `${addr.name} <${addr.email}>`;
		}
		return addr.email;
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n.charAt(0).toUpperCase())
			.slice(0, 2)
			.join('');
	}

	function getAvatarColor(email: string): string {
		const colors = [
			'bg-blue-100 text-blue-700',
			'bg-green-100 text-green-700',
			'bg-purple-100 text-purple-700',
			'bg-orange-100 text-orange-700',
			'bg-pink-100 text-pink-700',
			'bg-teal-100 text-teal-700'
		];
		let hash = 0;
		for (let i = 0; i < email.length; i++) {
			hash = email.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
	}

	let hasRecipients = $derived(!!mail.to && mail.to.length > 0);
	let hasCc = $derived(!!mail.cc && mail.cc.length > 0);
	let hasBcc = $derived(!!mail.bcc && mail.bcc.length > 0);
	let hasReplyTo = $derived(!!mail.reply_to && mail.reply_to.length > 0);
</script>

<div class="border-b border-[var(--border-primary)]">
	<!-- Subject -->
	<div class="px-6 pt-5 pb-2">
		<div class="flex items-start gap-2">
			<h1 class="flex-1 text-[20px] font-semibold text-[var(--text-primary)] leading-snug tracking-tight">
				{mail.subject || '(No subject)'}
			</h1>
			{#if mail.starred}
				<Star class="size-5 text-[var(--accent-primary)] fill-[var(--accent-primary)] shrink-0" strokeWidth={1.8} />
			{/if}
		</div>
	</div>

	<!-- Main header -->
	<div class="flex items-start gap-3 px-6 py-3 bg-[var(--bg-secondary)]">
		<!-- Avatar -->
		<div
			class={cn(
				'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
				getAvatarColor(mail.from_email)
			)}
		>
			{getInitials(mail.from_name)}
		</div>

		<!-- Sender info -->
		<div class="flex min-w-0 flex-1 flex-col">
			<div class="flex items-center gap-2">
				<span class="truncate text-sm font-semibold text-[var(--text-primary)]">{mail.from_name}</span>
				<span class="truncate text-xs text-[var(--text-tertiary)]">&lt;{mail.from_email}&gt;</span>
			</div>
			<div class="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
				<span>to {hasRecipients ? mail.to![0].email : 'me'}</span>
				<span class="text-[var(--border-primary)]">·</span>
				<span class="tabular-nums">{formatFullDate(mail.timestamp)}</span>
				{#if mail.attachments && mail.attachments.length > 0}
					<span class="text-[var(--border-primary)]">·</span>
					<span>{mail.attachments.length} attachment{mail.attachments.length > 1 ? 's' : ''}</span>
				{/if}
			</div>
		</div>

		<!-- Details toggle -->
		{#if hasRecipients || hasCc || hasBcc || hasReplyTo}
			<button
				onclick={() => (showDetails = !showDetails)}
				class="flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
				aria-label={showDetails ? 'Hide details' : 'Show details'}
				aria-expanded={showDetails}
			>
				<span>Details</span>
				{#if showDetails}
					<ChevronDown strokeWidth={1.8} class="size-3" />
				{:else}
					<ChevronRight strokeWidth={1.8} class="size-3" />
				{/if}
			</button>
		{/if}
	</div>

	<!-- Expanded details -->
	{#if showDetails && (hasRecipients || hasCc || hasBcc || hasReplyTo)}
		<div class="border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-6 py-2.5 text-sm">
			<div class="space-y-1.5">
				<!-- From -->
				<div class="flex gap-3">
					<span class="w-14 shrink-0 text-xs text-[var(--text-tertiary)] font-medium">From</span>
					<span class="truncate text-[var(--text-primary)] text-xs">{formatEmailAddress({ name: mail.from_name, email: mail.from_email })}</span>
				</div>

				<!-- To -->
				{#if hasRecipients}
					<div class="flex gap-3">
						<span class="w-14 shrink-0 text-xs text-[var(--text-tertiary)] font-medium">To</span>
						<span class="flex-1 text-[var(--text-primary)] text-xs">
							{#each mail.to as addr, i}
								<span class="inline-block">{formatEmailAddress(addr)}</span>
								{#if i < mail.to!.length - 1}<span class="mx-1 text-[var(--text-tertiary)]">,</span>{/if}
							{/each}
						</span>
					</div>
				{/if}

				<!-- Cc -->
				{#if hasCc}
					<div class="flex gap-3">
						<span class="w-14 shrink-0 text-xs text-[var(--text-tertiary)] font-medium">Cc</span>
						<span class="flex-1 text-[var(--text-primary)] text-xs">
							{#each mail.cc as addr, i}
								<span class="inline-block">{formatEmailAddress(addr)}</span>
								{#if i < mail.cc!.length - 1}<span class="mx-1 text-[var(--text-tertiary)]">,</span>{/if}
							{/each}
						</span>
					</div>
				{/if}

				<!-- Reply-To -->
				{#if hasReplyTo}
					<div class="flex gap-3">
						<span class="w-14 shrink-0 text-xs text-[var(--text-tertiary)] font-medium">Reply-To</span>
						<span class="flex-1 text-[var(--text-primary)] text-xs">
							{#each mail.reply_to as addr, i}
								<span class="inline-block">{formatEmailAddress(addr)}</span>
								{#if i < mail.reply_to!.length - 1}<span class="mx-1 text-[var(--text-tertiary)]">,</span>{/if}
							{/each}
						</span>
					</div>
				{/if}

				<!-- Date -->
				<div class="flex gap-3">
					<span class="w-14 shrink-0 text-xs text-[var(--text-tertiary)] font-medium">Date</span>
					<span class="text-[var(--text-primary)] tabular-nums text-xs">{new Date(mail.timestamp).toLocaleString()}</span>
				</div>
			</div>
		</div>
	{/if}
</div>
