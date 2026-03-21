<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Bold, Italic, Underline, Link2, List, Paperclip, X } from 'lucide-svelte';
	import type { Attachment } from '$lib/types.js';

	interface Props {
		value: string;
		attachments?: Attachment[];
		onAttach?: () => void;
		onRemoveAttachment?: (id: string) => void;
	}

	let {
		value = $bindable(),
		attachments = [],
		onAttach,
		onRemoveAttachment
	}: Props = $props();

	let editorRef = $state<HTMLTextAreaElement | null>(null);

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function withSelection(transform: (selected: string) => { text: string; cursorOffset?: number }): void {
		const element = editorRef;
		if (!element) return;

		const start = element.selectionStart;
		const end = element.selectionEnd;
		const selected = value.slice(start, end);
		const { text, cursorOffset } = transform(selected);
		value = `${value.slice(0, start)}${text}${value.slice(end)}`;

		const next = start + (cursorOffset ?? text.length);
		requestAnimationFrame(() => {
			element.focus();
			element.setSelectionRange(next, next);
		});
	}

	function wrapSelection(prefix: string, suffix = prefix, placeholder = 'text'): void {
		withSelection((selected) => {
			const content = selected || placeholder;
			const text = `${prefix}${content}${suffix}`;
			return {
				text,
				cursorOffset: selected ? text.length : prefix.length + content.length
			};
		});
	}

	function addBulletList(): void {
		withSelection((selected) => {
			const content = selected || 'list item';
			const text = content
				.split('\n')
				.map((line) => (line.startsWith('- ') ? line : `- ${line}`))
				.join('\n');
			return { text, cursorOffset: text.length };
		});
	}

	function insertLink(): void {
		withSelection((selected) => {
			const label = selected || 'link text';
			const url = 'https://';
			const text = `[${label}](${url})`;
			return { text, cursorOffset: text.length - 1 };
		});
	}
</script>

<div class="compose-editor-shell">
	<div class="editor-toolbar" role="toolbar" aria-label={$_('compose.formattingToolbar')}>
		<button type="button" onclick={() => wrapSelection('**')} aria-label={$_('compose.bold')}>
			<Bold class="size-3.5" strokeWidth={1.8} />
		</button>
		<button type="button" onclick={() => wrapSelection('*')} aria-label={$_('compose.italic')}>
			<Italic class="size-3.5" strokeWidth={1.8} />
		</button>
		<button type="button" onclick={() => wrapSelection('__')} aria-label={$_('compose.underline')}>
			<Underline class="size-3.5" strokeWidth={1.8} />
		</button>
		<div class="toolbar-divider"></div>
		<button type="button" onclick={addBulletList} aria-label={$_('compose.list')}>
			<List class="size-3.5" strokeWidth={1.8} />
		</button>
		<button type="button" onclick={insertLink} aria-label={$_('compose.link')}>
			<Link2 class="size-3.5" strokeWidth={1.8} />
		</button>
		<div class="toolbar-divider"></div>
		<button type="button" onclick={() => onAttach?.()} aria-label={$_('compose.attachFiles')}>
			<Paperclip class="size-3.5" strokeWidth={1.8} />
			<span>{$_('compose.attach')}</span>
		</button>
	</div>

	<textarea
		bind:value
		bind:this={editorRef}
		placeholder={$_('compose.placeholder')}
		class="compose-editor"
	></textarea>

	{#if attachments.length > 0}
		<div class="attachment-zone" aria-label={$_('compose.attachments')}>
			{#each attachments as attachment}
				<div class="attachment-chip">
						<div class="attachment-meta">
							<span class="attachment-name" title={attachment.file_name}>{attachment.file_name}</span>
							<span class="attachment-size">{formatSize(attachment.size)}</span>
						</div>
						<button
							type="button"
							onclick={() => onRemoveAttachment?.(attachment.id)}
							aria-label={$_('compose.removeFile', { values: { filename: attachment.file_name } })}
						>
						<X class="size-3.5" strokeWidth={1.8} />
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.compose-editor-shell {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		background: var(--bg-primary);
	}

	.editor-toolbar {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.55rem 1.2rem;
		border-bottom: 1px solid var(--border-tertiary);
		background: color-mix(in srgb, var(--bg-secondary) 55%, white);
	}

	.editor-toolbar button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		height: 30px;
		padding: 0 0.65rem;
		border: 1px solid transparent;
		border-radius: 8px;
		background: transparent;
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.editor-toolbar button:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
		border-color: var(--border-secondary);
	}

	.toolbar-divider {
		width: 1px;
		height: 16px;
		background: var(--border-primary);
		margin: 0 0.15rem;
	}

	.compose-editor {
		flex: 1;
		min-height: 340px;
		padding: 1.5rem;
		border: none;
		outline: none;
		resize: none;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 14px;
		line-height: 1.75;
	}

	.compose-editor::placeholder {
		color: color-mix(in srgb, var(--text-tertiary) 70%, white);
	}

	.attachment-zone {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.9rem 1.2rem 1rem;
		border-top: 1px solid var(--border-tertiary);
		background: color-mix(in srgb, var(--bg-secondary) 50%, white);
	}

	.attachment-chip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.55rem;
		min-width: 180px;
		max-width: 300px;
		padding: 0.45rem 0.55rem 0.45rem 0.65rem;
		border: 1px solid var(--border-primary);
		border-radius: 10px;
		background: var(--bg-primary);
	}

	.attachment-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.attachment-name {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.attachment-size {
		font-size: 11px;
		color: var(--text-tertiary);
	}

	.attachment-chip button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--text-tertiary);
		cursor: pointer;
		padding: 0;
	}

	.attachment-chip button:hover {
		color: var(--text-primary);
	}
</style>
