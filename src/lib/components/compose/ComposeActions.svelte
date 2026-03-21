<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { LoaderCircle, Send, Trash2 } from 'lucide-svelte';

	interface Props {
		lastSaved: Date | null;
		isSending: boolean;
		sendWithModEnter: boolean;
		onSend: () => void;
		onDiscard: () => void;
	}

	let { lastSaved, isSending, sendWithModEnter, onSend, onDiscard }: Props = $props();

	function formatLastSaved(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - date.getTime();

		if (diff < 60000) return $_('compose.draftSavedJustNow');
		if (diff < 3600000) return $_('compose.draftSavedMinutes', { values: { n: Math.floor(diff / 60000) } });

		if (date.toDateString() === now.toDateString()) {
			return $_('compose.draftSavedAt', { values: { time: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) } });
		}

		return $_('compose.draftSavedDate', { values: { date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } });
	}
</script>

<div class="compose-footer border-t border-[var(--border-primary)] px-5 py-3">
	<div class="footer-status">
		{#if lastSaved}
			<span>{formatLastSaved(lastSaved)}</span>
		{:else}
			<span>{$_('compose.autosaveEnabled')}</span>
		{/if}
	</div>

	<div class="footer-actions">
		<button
			type="button"
			onclick={onDiscard}
			disabled={isSending}
			class="discard-btn"
		>
			<Trash2 class="size-3.5" strokeWidth={1.8} />
			<span>{$_('compose.discard')}</span>
		</button>

		<button
			type="button"
			onclick={onSend}
			disabled={isSending}
			class="send-btn"
		>
			{#if isSending}
				<LoaderCircle class="size-3.5 animate-spin" strokeWidth={1.8} />
				<span>{$_('compose.sending')}</span>
			{:else}
				<Send class="size-3.5" strokeWidth={1.8} />
				<span>{$_('compose.send')}</span>
				{#if sendWithModEnter}
					<span class="send-hint">Cmd/Ctrl+Enter</span>
				{/if}
			{/if}
		</button>
	</div>
</div>

<style>
	.compose-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: color-mix(in srgb, var(--bg-secondary) 60%, white);
	}

	.footer-status {
		font-size: 11px;
		color: var(--text-tertiary);
	}

	.footer-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.discard-btn,
	.send-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		height: 34px;
		padding: 0 0.95rem;
		border-radius: 9px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 120ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.discard-btn {
		border: 1px solid var(--border-primary);
		background: var(--bg-primary);
		color: var(--text-secondary);
	}

	.discard-btn:hover:not(:disabled) {
		background: var(--bg-hover);
		color: var(--error);
		border-color: color-mix(in srgb, var(--error) 25%, var(--border-primary));
	}

	.send-btn {
		border: 1px solid transparent;
		background: var(--accent-primary);
		color: #fff;
		box-shadow: var(--shadow-sm);
	}

	.send-btn:hover:not(:disabled) {
		background: var(--accent-secondary);
		box-shadow: var(--shadow-md);
		transform: translateY(-1px);
	}

	.send-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.discard-btn:disabled,
	.send-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
		transform: none;
	}

	.send-hint {
		padding: 0.2rem 0.45rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.18);
		font-size: 10px;
		font-weight: 700;
		line-height: 1;
		letter-spacing: 0.01em;
	}
</style>
