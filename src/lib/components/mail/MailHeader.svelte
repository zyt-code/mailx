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

	const hasRecipients = mail.to && mail.to.length > 0;
	const hasCc = mail.cc && mail.cc.length > 0;
	const hasBcc = mail.bcc && mail.bcc.length > 0;
	const hasReplyTo = mail.reply_to && mail.reply_to.length > 0;
</script>

<div class="border-b border-zinc-200">
	<!-- Notion-style Subject H1 -->
	<div class="px-8 pt-6 pb-2">
		<div class="flex items-start gap-3">
			<h1 class="flex-1 text-2xl font-semibold text-zinc-900 leading-snug tracking-tight">
				{mail.subject || '(No subject)'}
			</h1>
			{#if mail.starred}
				<Star class="size-5 text-yellow-500 fill-yellow-500 shrink-0" strokeWidth={1.5} />
			{/if}
		</div>
	</div>

	<!-- Main header -->
	<div class="flex items-start gap-3 px-8 py-3">
		<!-- Avatar -->
		<div
			class={cn(
				'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium',
				getAvatarColor(mail.from_email)
			)}
		>
			{getInitials(mail.from_name)}
		</div>

		<!-- Sender info -->
		<div class="flex min-w-0 flex-1 flex-col">
			<div class="flex items-center gap-2">
				<span class="truncate text-sm font-semibold text-zinc-900">{mail.from_name}</span>
				<span class="truncate text-xs text-zinc-500">&lt;{mail.from_email}&gt;</span>
			</div>
			<div class="flex items-center gap-2 text-xs text-zinc-500">
				<span>to {hasRecipients ? mail.to![0].email : 'me'}</span>
				<span>·</span>
				<span>{formatFullDate(mail.timestamp)}</span>
				{#if mail.attachments && mail.attachments.length > 0}
					<span>·</span>
					<span>{mail.attachments.length} attachment{mail.attachments.length > 1 ? 's' : ''}</span>
				{/if}
			</div>
		</div>

		<!-- Details toggle -->
		{#if hasRecipients || hasCc || hasBcc || hasReplyTo}
			<button
				onclick={() => (showDetails = !showDetails)}
				class="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100"
				aria-label={showDetails ? 'Hide details' : 'Show details'}
				aria-expanded={showDetails}
			>
				Details
				{#if showDetails}
					<ChevronDown strokeWidth={1.5} class="size-3" />
				{:else}
					<ChevronRight strokeWidth={1.5} class="size-3" />
				{/if}
			</button>
		{/if}
	</div>

	<!-- Expanded details -->
	{#if showDetails && (hasRecipients || hasCc || hasBcc || hasReplyTo)}
		<div class="border-t border-zinc-200 bg-zinc-50 px-8 py-3 text-sm">
			<div class="space-y-2">
				<!-- From -->
				<div class="flex gap-3">
					<span class="w-16 shrink-0 text-xs text-zinc-500 font-medium">From:</span>
					<span class="truncate text-zinc-900">{formatEmailAddress({ name: mail.from_name, email: mail.from_email })}</span>
				</div>

				<!-- To -->
				{#if hasRecipients}
					<div class="flex gap-3">
						<span class="w-16 shrink-0 text-xs text-zinc-500 font-medium">To:</span>
						<span class="flex-1 text-zinc-900">
							{#each mail.to as addr, i}
								<span class="inline-block">{formatEmailAddress(addr)}</span>
								{#if i < mail.to!.length - 1}<span class="mx-1 text-zinc-400">,</span>{/if}
							{/each}
						</span>
					</div>
				{/if}

				<!-- Cc -->
				{#if hasCc}
					<div class="flex gap-3">
						<span class="w-16 shrink-0 text-xs text-zinc-500 font-medium">Cc:</span>
						<span class="flex-1 text-zinc-900">
							{#each mail.cc as addr, i}
								<span class="inline-block">{formatEmailAddress(addr)}</span>
								{#if i < mail.cc!.length - 1}<span class="mx-1 text-zinc-400">,</span>{/if}
							{/each}
						</span>
					</div>
				{/if}

				<!-- Reply-To -->
				{#if hasReplyTo}
					<div class="flex gap-3">
						<span class="w-16 shrink-0 text-xs text-zinc-500 font-medium">Reply-To:</span>
						<span class="flex-1 text-zinc-900">
							{#each mail.reply_to as addr, i}
								<span class="inline-block">{formatEmailAddress(addr)}</span>
								{#if i < mail.reply_to!.length - 1}<span class="mx-1 text-zinc-400">,</span>{/if}
							{/each}
						</span>
					</div>
				{/if}

				<!-- Date -->
				<div class="flex gap-3">
					<span class="w-16 shrink-0 text-xs text-zinc-500 font-medium">Date:</span>
					<span class="text-zinc-900">{new Date(mail.timestamp).toLocaleString()}</span>
				</div>
			</div>
		</div>
	{/if}
</div>
