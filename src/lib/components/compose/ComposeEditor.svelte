<script lang="ts">
	import { Bold, Italic, Underline, Link2, List, Paperclip, X, ListOrdered, Strikethrough, Code } from 'lucide-svelte';
	import type { Attachment } from '$lib/types.js';
	import RichEditor from './RichEditor.svelte';
	import type { Editor } from '@tiptap/core';

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

	let tipTapEditor = $state<Editor | null>(null);
	let isEditorFocused = $state(false);

	function textToHtml(text: string): string {
		if (!text) return '';
		if (/<[^>]+>/.test(text)) return text;
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\n\n/g, '</p><p>')
			.replace(/\n/g, '<br>');
	}

	let htmlContent = $derived(textToHtml(value));

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function toggleBold() {
		tipTapEditor?.chain().focus().toggleBold().run();
	}

	function toggleItalic() {
		tipTapEditor?.chain().focus().toggleItalic().run();
	}

	function toggleUnderline() {
		tipTapEditor?.chain().focus().toggleUnderline().run();
	}

	function toggleStrike() {
		tipTapEditor?.chain().focus().toggleStrike().run();
	}

	function toggleCode() {
		tipTapEditor?.chain().focus().toggleCode().run();
	}

	function toggleBulletList() {
		tipTapEditor?.chain().focus().toggleBulletList().run();
	}

	function toggleOrderedList() {
		tipTapEditor?.chain().focus().toggleOrderedList().run();
	}

	function insertLink() {
		tipTapEditor?.chain().focus().run();
		const url = prompt('Enter URL:');
		if (url) {
			tipTapEditor?.chain().focus().setLink({ href: url }).run();
		}
	}

	function isButtonActive(command: string): boolean {
		return tipTapEditor?.isActive(command) ?? false;
	}

	function handleEditorChange(editor: Editor | null) {
		tipTapEditor = editor;
	}

	function handleFocusChange(focused: boolean) {
		isEditorFocused = focused;
	}

	function handleContentUpdate(html: string) {
		// Only update if content actually changed to prevent loops
		if (value !== html) {
			value = html;
		}
	}
</script>

<div class="compose-editor-shell">
	<div class="editor-container" class:focused={isEditorFocused}>
		<div class="editor-toolbar" role="toolbar" aria-label="Formatting toolbar">
			<div class="toolbar-group">
				<button
					type="button"
					onclick={toggleBold}
					class:active={isButtonActive('bold')}
					class="toolbar-button"
					aria-label="Bold"
					title="Bold"
				>
					<Bold class="button-icon" strokeWidth={2} />
				</button>
				<button
					type="button"
					onclick={toggleItalic}
					class:active={isButtonActive('italic')}
					class="toolbar-button"
					aria-label="Italic"
					title="Italic"
				>
					<Italic class="button-icon" strokeWidth={2} />
				</button>
				<button
					type="button"
					onclick={toggleUnderline}
					class:active={isButtonActive('underline')}
					class="toolbar-button"
					aria-label="Underline"
					title="Underline"
				>
					<Underline class="button-icon" strokeWidth={2} />
				</button>
				<button
					type="button"
					onclick={toggleStrike}
					class:active={isButtonActive('strike')}
					class="toolbar-button"
					aria-label="Strikethrough"
					title="Strikethrough"
				>
					<Strikethrough class="button-icon" strokeWidth={2} />
				</button>
				<button
					type="button"
					onclick={toggleCode}
					class:active={isButtonActive('code')}
					class="toolbar-button"
					aria-label="Code"
					title="Code"
				>
					<Code class="button-icon" strokeWidth={2} />
				</button>
			</div>

			<div class="toolbar-divider"></div>

			<div class="toolbar-group">
				<button
					type="button"
					onclick={toggleBulletList}
					class:active={isButtonActive('bulletList')}
					class="toolbar-button"
					aria-label="Bullet List"
					title="Bullet List"
				>
					<List class="button-icon" strokeWidth={2} />
				</button>
				<button
					type="button"
					onclick={toggleOrderedList}
					class:active={isButtonActive('orderedList')}
					class="toolbar-button"
					aria-label="Ordered List"
					title="Ordered List"
				>
					<ListOrdered class="button-icon" strokeWidth={2} />
				</button>
				<button
					type="button"
					onclick={insertLink}
					class:active={isButtonActive('link')}
					class="toolbar-button"
					aria-label="Link"
					title="Insert Link"
				>
					<Link2 class="button-icon" strokeWidth={2} />
				</button>
			</div>

			<div class="toolbar-spacer"></div>

			<div class="toolbar-group">
				<button
					type="button"
					onclick={() => onAttach?.()}
					class="toolbar-button attach-button"
					aria-label="Attach files"
					title="Attach files"
				>
					<Paperclip class="button-icon" strokeWidth={2} />
					<span class="attach-text">Attach</span>
				</button>
			</div>
		</div>

		<div class="editor-body-wrapper">
			<RichEditor
				content={htmlContent}
				editable={true}
				placeholder="Hi team,&#10;&#10;Write your message..."
				onEditorChange={handleEditorChange}
				onContentChange={handleContentUpdate}
				onFocusChange={handleFocusChange}
			/>
		</div>
	</div>

	{#if attachments.length > 0}
		<div class="attachment-zone" aria-label="Attachments">
			{#each attachments as attachment}
				<div class="attachment-chip">
					<div class="attachment-meta">
						<span class="attachment-name" title={attachment.file_name}>{attachment.file_name}</span>
						<span class="attachment-size">{formatSize(attachment.size)}</span>
					</div>
					<button
						type="button"
						onclick={() => onRemoveAttachment?.(attachment.id)}
						class="attachment-remove"
						aria-label={`Remove ${attachment.file_name}`}
					>
						<X class="attachment-icon" strokeWidth={2} />
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
		background: #FAFAF7;
		padding: 0 1.5rem 1rem;
	}

	.editor-container {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 280px;
		background: #FFFFFF;
		border: 1px solid #E0E0DE;
		border-radius: 12px;
		overflow: hidden;
		transition: all 0.2s ease;
	}

	.editor-container.focused {
		border-color: #6366F1;
		box-shadow:
			0 0 0 3px rgba(99, 102, 241, 0.1),
			0 0 0 1px rgba(99, 102, 241, 0.2);
	}

	.editor-toolbar {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #E8E8E6;
		background: #FAFAF7;
	}

	.toolbar-group {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.toolbar-divider {
		width: 1px;
		height: 20px;
		background: linear-gradient(to bottom, transparent, #D0D0CE 20%, #D0D0CE 80%, transparent);
		margin: 0 0.25rem;
		flex-shrink: 0;
	}

	.toolbar-spacer {
		flex: 1;
		min-width: 1rem;
	}

	.toolbar-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		min-width: 32px;
		height: 32px;
		padding: 0 0.625rem;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: #6B7280;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.button-icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.toolbar-button:hover {
		background: #E5E5E3;
		color: #373737;
	}

	.toolbar-button.active {
		background: #EEEDFF;
		color: #6366F1;
	}

	.toolbar-button.active:hover {
		background: #E5E4FF;
	}

	.attach-button {
		padding: 0 0.75rem;
	}

	.attach-text {
		font-size: 13px;
		font-weight: 500;
	}

	.editor-body-wrapper {
		flex: 1;
		min-height: 200px;
		overflow: auto;
	}

	.attachment-zone {
		display: flex;
		flex-wrap: wrap;
		gap: 0.625rem;
		margin-top: 0.75rem;
	}

	.attachment-chip {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.625rem 0.5rem 0.75rem;
		background: #FFFFFF;
		border: 1px solid #E0E0DE;
		border-radius: 8px;
	}

	.attachment-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.attachment-name {
		font-size: 13px;
		font-weight: 500;
		color: #1A1A1A;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.attachment-size {
		font-size: 11px;
		color: #9CA3AF;
	}

	.attachment-remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: #9CA3AF;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		transition: all 0.12s ease;
	}

	.attachment-remove:hover {
		background: #FEE2E2;
		color: #DC2626;
	}

	.attachment-icon {
		width: 12px;
		height: 12px;
	}
</style>
