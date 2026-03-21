<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Underline from '@tiptap/extension-underline';
	import Link from '@tiptap/extension-link';
	import TextAlign from '@tiptap/extension-text-align';
	import Placeholder from '@tiptap/extension-placeholder';

	interface Props {
		content?: string;
		editable?: boolean;
		placeholder?: string;
		onEditorChange?: (editor: Editor | null) => void;
		onContentChange?: (html: string) => void;
		onFocusChange?: (focused: boolean) => void;
	}

	let {
		content = '',
		editable = true,
		placeholder = 'Write your message...',
		onEditorChange,
		onContentChange,
		onFocusChange
	}: Props = $props();

	let editor: Editor | null = null;
	let editorElement: HTMLDivElement;
	let editorWrapper: HTMLDivElement;
	let isFocused = $state(false);

	onMount(() => {
		editor = new Editor({
			element: editorElement,
			extensions: [
				StarterKit,
				Underline,
				Link.configure({
					openOnClick: false
				}),
				TextAlign.configure({
					types: ['heading', 'paragraph']
				}),
				Placeholder.configure({
					placeholder
				})
			],
			content,
			editable,
			onUpdate: () => {
				if (editor && onContentChange) {
					onContentChange(editor.getHTML());
				}
			},
			onCreate: () => {
				onEditorChange?.(editor);
			},
			onFocus: () => {
				isFocused = true;
				onFocusChange?.(true);
			},
			onBlur: () => {
				isFocused = false;
				onFocusChange?.(false);
			}
		});
	});

	onDestroy(() => {
		editor?.destroy();
	});

	// Update content when prop changes (but only if different from current content)
	$effect(() => {
		if (editor && content !== editor.getHTML()) {
			editor.commands.setContent(content);
		}
	});

	// Update editable state when prop changes
	$effect(() => {
		if (editor) {
			editor.setEditable(editable);
		}
	});

	// Focus editor when clicking on the wrapper or any child element
	function handleWrapperClick(event: MouseEvent): void {
		if (!editor) return;
		
		// Focus the editor when clicking anywhere in the wrapper
		// This includes clicks on the editor content area
		if (!isFocused) {
			editor.chain().focus().run();
		}
	}

	// Expose editor to parent component
	export { editor as editorInstance };
</script>

<div
	class="rich-editor-wrapper"
	bind:this={editorWrapper}
	onclick={handleWrapperClick}
	onkeydown={(event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			editor?.chain().focus().run();
		}
	}}
	role="textbox"
	aria-multiline="true"
	tabindex="-1"
>
	<div class="rich-editor-content" bind:this={editorElement}></div>
</div>

<style>
	/* ========================================
	   EDITOR WRAPPER
	   ======================================== */
	.rich-editor-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 400px;
		cursor: text;
	}

	/* ========================================
	   EDITOR CONTENT
	   ======================================== */
	.rich-editor-content {
		min-height: 400px;
		padding: 1.5rem;
		outline: none;
	}

	/* Ensure the entire editor area is clickable */
	.rich-editor-content :global(.ProseMirror),
	.rich-editor-content :global(.tiptap) {
		min-height: 400px;
		height: 100%;
		outline: none !important;
		padding: 0;
	}

	/* Placeholder styling */
	.rich-editor-content :global(.ProseMirror p.is-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: var(--text-tertiary);
		font-weight: 400;
		pointer-events: none;
		height: 0;
	}

	/* Remove all native focus styles from ProseMirror */
	.rich-editor-content :global(.ProseMirror-focused) {
		outline: none !important;
		box-shadow: none !important;
	}

	/* ========================================
	   TYPOGRAPHY
	   ======================================== */
	.rich-editor-content :global(p) {
		margin-bottom: 0.75em;
		line-height: 1.6;
		font-size: 14px;
		color: var(--text-primary);
	}

	.rich-editor-content :global(p:first-child) {
		margin-top: 0;
	}

	.rich-editor-content :global(p:last-child) {
		margin-bottom: 0;
	}

	/* Headings */
	.rich-editor-content :global(h1),
	.rich-editor-content :global(h2),
	.rich-editor-content :global(h3),
	.rich-editor-content :global(h4),
	.rich-editor-content :global(h5),
	.rich-editor-content :global(h6) {
		margin-top: 1.25em;
		margin-bottom: 0.625em;
		font-weight: 600;
		line-height: 1.3;
		color: var(--text-primary);
	}

	.rich-editor-content :global(h1) {
		font-size: 1.75em;
	}

	.rich-editor-content :global(h2) {
		font-size: 1.5em;
	}

	.rich-editor-content :global(h3) {
		font-size: 1.25em;
	}

	/* Lists */
	.rich-editor-content :global(ul),
	.rich-editor-content :global(ol) {
		padding-left: 1.5em;
		margin-bottom: 0.75em;
	}

	.rich-editor-content :global(li) {
		margin-bottom: 0.25em;
		line-height: 1.6;
	}

	/* Links */
	.rich-editor-content :global(a) {
		color: var(--accent-primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.rich-editor-content :global(a:hover) {
		color: var(--accent-secondary);
	}

	/* Text formatting */
	.rich-editor-content :global(strong) {
		font-weight: 600;
	}

	.rich-editor-content :global(em) {
		font-style: italic;
	}

	.rich-editor-content :global(u) {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.rich-editor-content :global(s) {
		text-decoration: line-through;
	}

	.rich-editor-content :global(code) {
		background: var(--bg-secondary);
		padding: 0.125em 0.375em;
		border-radius: 4px;
		font-family: 'SF Mono', 'Menlo', monospace;
		font-size: 0.875em;
		color: var(--error);
	}

	/* Blockquote */
	.rich-editor-content :global(blockquote) {
		border-left: 3px solid var(--border-primary);
		padding-left: 1em;
		margin-left: 0;
		margin-bottom: 1em;
		color: var(--text-secondary);
		font-style: italic;
	}

	/* Selection */
	.rich-editor-content :global(::selection) {
		background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
	}

	/* Read-only mode */
	.rich-editor-content:global(.ProseMirror[contenteditable="false"]) {
		cursor: default;
		background: transparent;
	}
</style>
