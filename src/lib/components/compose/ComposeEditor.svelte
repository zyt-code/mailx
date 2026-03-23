<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Bold, Italic, Underline, Link2, List, Paperclip, X } from 'lucide-svelte';
	import type { Attachment } from '$lib/types.js';
	import RichEditor from './RichEditor.svelte';
	import { htmlToPlainText, normalizeEditorHtml, plainTextToHtml } from '$lib/utils/mailContent.js';
	import type { Editor } from '@tiptap/core';

	interface Props {
		value: string;
		htmlValue?: string;
		attachments?: Attachment[];
		onAttach?: () => void;
		onRemoveAttachment?: (id: string) => void;
	}

	let {
		value = $bindable(),
		htmlValue = $bindable(''),
		attachments = [],
		onAttach,
		onRemoveAttachment
	}: Props = $props();

	let editor = $state<Editor | null>(null);

	const editorContent = $derived.by(() => {
		if (htmlValue?.trim()) {
			return htmlValue;
		}

		return value.trim() ? plainTextToHtml(value) : '';
	});

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function handleEditorChange(instance: Editor | null): void {
		editor = instance;
	}

	function handleContentChange(nextHtml: string): void {
		const normalized = normalizeEditorHtml(nextHtml);
		htmlValue = normalized;
		value = normalized ? htmlToPlainText(normalized) : '';
	}

	function toggleBold(): void {
		editor?.chain().focus().toggleBold().run();
	}

	function toggleItalic(): void {
		editor?.chain().focus().toggleItalic().run();
	}

	function toggleUnderline(): void {
		editor?.chain().focus().toggleUnderline().run();
	}

	function toggleBulletList(): void {
		editor?.chain().focus().toggleBulletList().run();
	}

	function insertLink(): void {
		if (!editor) return;

		const currentHref = editor.getAttributes('link').href as string | undefined;
		const nextHref = window.prompt($_('compose.link'), currentHref ?? 'https://');
		if (nextHref === null) return;

		const href = nextHref.trim();
		if (!href) {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}

		editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
	}
</script>

<div class="compose-editor-shell">
	<div class="editor-toolbar" role="toolbar" aria-label={$_('compose.formattingToolbar')}>
		<button
			type="button"
			onclick={toggleBold}
			aria-label={$_('compose.bold')}
			class:active={editor?.isActive('bold')}
		>
			<Bold class="size-3.5" strokeWidth={1.8} />
		</button>
		<button
			type="button"
			onclick={toggleItalic}
			aria-label={$_('compose.italic')}
			class:active={editor?.isActive('italic')}
		>
			<Italic class="size-3.5" strokeWidth={1.8} />
		</button>
		<button
			type="button"
			onclick={toggleUnderline}
			aria-label={$_('compose.underline')}
			class:active={editor?.isActive('underline')}
		>
			<Underline class="size-3.5" strokeWidth={1.8} />
		</button>
		<div class="toolbar-divider"></div>
		<button
			type="button"
			onclick={toggleBulletList}
			aria-label={$_('compose.list')}
			class:active={editor?.isActive('bulletList')}
		>
			<List class="size-3.5" strokeWidth={1.8} />
		</button>
		<button
			type="button"
			onclick={insertLink}
			aria-label={$_('compose.link')}
			class:active={editor?.isActive('link')}
		>
			<Link2 class="size-3.5" strokeWidth={1.8} />
		</button>
		<div class="toolbar-divider"></div>
		<button type="button" onclick={() => onAttach?.()} aria-label={$_('compose.attachFiles')}>
			<Paperclip class="size-3.5" strokeWidth={1.8} />
			<span>{$_('compose.attach')}</span>
		</button>
	</div>

	<div class="compose-editor">
		<RichEditor
			content={editorContent}
			placeholder={$_('compose.placeholder')}
			onEditorChange={handleEditorChange}
			onContentChange={handleContentChange}
		/>
	</div>

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
		gap: 0.25rem;
		padding: 0.45rem 1.25rem;
		border-bottom: 1px solid var(--border-tertiary);
		background: var(--bg-primary);
	}

	.editor-toolbar button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		height: 28px;
		padding: 0 0.55rem;
		border: none;
		border-radius: 6px;
		background: transparent;
		font-size: 12px;
		font-weight: 500;
		color: var(--text-tertiary);
		cursor: pointer;
	}

	.editor-toolbar button:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.editor-toolbar button.active {
		background: var(--bg-hover);
		color: var(--accent-primary);
	}

	.editor-toolbar button:active {
		background: var(--bg-active);
	}

	.toolbar-divider {
		width: 1px;
		height: 14px;
		background: var(--border-tertiary);
		margin: 0 0.2rem;
	}

	.compose-editor {
		flex: 1;
		min-height: 340px;
		border: none;
		outline: none;
		background: var(--bg-primary);
		overflow: hidden;
	}

	.attachment-zone {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem 0.85rem;
		border-top: 1px solid var(--border-tertiary);
		background: var(--bg-secondary);
	}

	.attachment-chip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.55rem;
		min-width: 180px;
		max-width: 300px;
		padding: 0.45rem 0.55rem 0.45rem 0.75rem;
		border: 1px solid var(--border-secondary);
		border-radius: 8px;
		background: var(--bg-primary);
	}

	.attachment-chip:hover {
		border-color: var(--border-primary);
	}

	.attachment-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.attachment-name {
		font-size: 13px;
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
		color: var(--text-quaternary);
		cursor: pointer;
		padding: 2px;
		border-radius: 4px;
	}

	.attachment-chip button:hover {
		color: var(--text-primary);
		background: var(--bg-hover);
	}
</style>
