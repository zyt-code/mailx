<script lang="ts">
	import { onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { _ } from 'svelte-i18n';
	import DOMPurify from 'dompurify';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import TextAlign from '@tiptap/extension-text-align';
	import { plainTextToHtml } from '$lib/utils/mailContent.js';

	interface Props {
		htmlBody?: string;
		plainBody: string;
	}

	let { htmlBody, plainBody }: Props = $props();

	let editorElement = $state<HTMLDivElement | null>(null);
	let editor = $state<Editor | null>(null);

	const TIPTAP_SUPPORTED_TAGS = new Set([
		'A',
		'B',
		'BLOCKQUOTE',
		'BR',
		'CODE',
		'DEL',
		'DIV',
		'EM',
		'H1',
		'H2',
		'H3',
		'H4',
		'H5',
		'H6',
		'HR',
		'I',
		'LI',
		'OL',
		'P',
		'PRE',
		'S',
		'SPAN',
		'STRONG',
		'U',
		'UL'
	]);

	function enhanceLinks(html: string): string {
		if (!browser || !html.trim()) {
			return '';
		}

		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = html;

		const links = tempDiv.querySelectorAll('a');
		links.forEach((link) => {
			link.setAttribute('target', '_blank');
			link.setAttribute('rel', 'noopener noreferrer');
		});

		return tempDiv.innerHTML;
	}

	function sanitizeHtml(html: string | undefined): string {
		if (!html?.trim()) {
			return '';
		}

		if (!browser) {
			return html.trim();
		}

		const sanitized = DOMPurify.sanitize(html, {
			WHOLE_DOCUMENT: false,
			FORBID_TAGS: ['style', 'script'],
			FORBID_ATTR: ['style', 'class', 'id']
		});

		return enhanceLinks(sanitized.trim());
	}

	function canRenderWithTiptap(html: string): boolean {
		if (!browser || !html.trim()) {
			return true;
		}

		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');

		return Array.from(doc.body.querySelectorAll('*')).every((node) => TIPTAP_SUPPORTED_TAGS.has(node.tagName));
	}

	const sanitizedHtml = $derived.by(() => sanitizeHtml(htmlBody));
	const plainHtml = $derived.by(() => plainTextToHtml(plainBody));
	const renderedHtml = $derived.by(() => sanitizedHtml || plainHtml);
	const useRawHtmlFallback = $derived.by(() => Boolean(sanitizedHtml) && !canRenderWithTiptap(sanitizedHtml));

	function ensureEditor(): void {
		if (!editorElement || editor || useRawHtmlFallback) {
			return;
		}

		editor = new Editor({
			element: editorElement,
			editable: false,
			extensions: [
				StarterKit.configure({
					link: {
						openOnClick: true,
						HTMLAttributes: {
							target: '_blank',
							rel: 'noopener noreferrer'
						}
					}
				}),
				TextAlign.configure({
					types: ['heading', 'paragraph']
				})
			],
			content: renderedHtml
		});
	}

	function destroyEditor(): void {
		editor?.destroy();
		editor = null;
	}

	$effect(() => {
		if (useRawHtmlFallback) {
			destroyEditor();
			return;
		}

		ensureEditor();
	});

	$effect(() => {
		if (!editor || useRawHtmlFallback) {
			return;
		}

		if (renderedHtml !== editor.getHTML()) {
			editor.commands.setContent(renderedHtml, { emitUpdate: false });
		}
	});

	onDestroy(() => {
		destroyEditor();
	});
</script>

{#if useRawHtmlFallback}
	<div class="mail-renderer-html" role="article" aria-label={$_('mail.emailContent')}>
		<div class="mail-renderer-html__content">{@html sanitizedHtml}</div>
	</div>
{:else}
	<div class="mail-renderer" role="article" aria-label={$_('mail.emailContent')}>
		<div class="mail-renderer__content" bind:this={editorElement}></div>
	</div>
{/if}

<style>
	.mail-renderer,
	.mail-renderer-html {
		width: 100%;
		min-height: 200px;
		background: transparent;
		color: var(--text-primary);
	}

	.mail-renderer__content :global(.ProseMirror),
	.mail-renderer-html__content {
		min-height: 200px;
		padding: 1rem 1.25rem 1.5rem;
		outline: none;
		font-size: 15px;
		line-height: 1.7;
		color: var(--text-primary);
		word-break: break-word;
		overflow-wrap: anywhere;
		background: transparent;
	}

	.mail-renderer__content :global(p),
	.mail-renderer-html__content :global(p) {
		margin: 0 0 0.9rem;
	}

	.mail-renderer__content :global(h1),
	.mail-renderer__content :global(h2),
	.mail-renderer__content :global(h3),
	.mail-renderer__content :global(h4),
	.mail-renderer__content :global(h5),
	.mail-renderer__content :global(h6),
	.mail-renderer-html__content :global(h1),
	.mail-renderer-html__content :global(h2),
	.mail-renderer-html__content :global(h3),
	.mail-renderer-html__content :global(h4),
	.mail-renderer-html__content :global(h5),
	.mail-renderer-html__content :global(h6) {
		margin: 1.25rem 0 0.75rem;
		line-height: 1.3;
		font-weight: 600;
		color: var(--text-primary);
	}

	.mail-renderer__content :global(ul),
	.mail-renderer__content :global(ol),
	.mail-renderer-html__content :global(ul),
	.mail-renderer-html__content :global(ol) {
		margin: 0 0 1rem;
		padding-left: 1.5rem;
	}

	.mail-renderer__content :global(li),
	.mail-renderer-html__content :global(li) {
		margin-bottom: 0.35rem;
	}

	.mail-renderer__content :global(blockquote),
	.mail-renderer-html__content :global(blockquote) {
		margin: 1rem 0;
		padding-left: 1rem;
		border-left: 3px solid var(--border-secondary);
		color: var(--text-secondary);
	}

	.mail-renderer__content :global(a),
	.mail-renderer-html__content :global(a) {
		color: var(--accent-primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.mail-renderer__content :global(pre),
	.mail-renderer-html__content :global(pre) {
		margin: 1rem 0;
		padding: 0.875rem 1rem;
		border-radius: 10px;
		background: var(--bg-secondary);
		overflow-x: auto;
	}

	.mail-renderer__content :global(code),
	.mail-renderer-html__content :global(code) {
		font-family: 'SF Mono', 'Menlo', monospace;
		font-size: 0.875em;
	}

	.mail-renderer-html__content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
	}

	.mail-renderer-html__content :global(th),
	.mail-renderer-html__content :global(td) {
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--border-secondary);
		text-align: left;
	}

	.mail-renderer-html__content :global(img) {
		max-width: 100%;
		height: auto;
	}
</style>
