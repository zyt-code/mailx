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
	let iframeElement = $state<HTMLIFrameElement | null>(null);
	let iframeHeight = $state(320);
	let iframeResizeObserver = $state<ResizeObserver | null>(null);
	let iframeResizeFrame = $state<number | null>(null);

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
	const COMPLEX_HTML_SELECTORS =
		'style, table, thead, tbody, tfoot, tr, td, th, colgroup, col, meta';

	function enhanceDocumentLinks(root: ParentNode): void {
		root.querySelectorAll('a').forEach((link) => {
			link.setAttribute('target', '_blank');
			link.setAttribute('rel', 'noopener noreferrer');
		});
	}

	function enhanceLinks(html: string, wholeDocument = false): string {
		if (!browser || !html.trim()) {
			return html.trim();
		}

		if (wholeDocument) {
			const doc = new DOMParser().parseFromString(html, 'text/html');
			enhanceDocumentLinks(doc);
			return `<!doctype html>${doc.documentElement.outerHTML}`;
		}

		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = html;
		enhanceDocumentLinks(tempDiv);
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

	function sanitizeIsolatedHtml(html: string | undefined): string {
		if (!html?.trim()) {
			return '';
		}

		if (!browser) {
			return html.trim();
		}

		const sanitized = DOMPurify.sanitize(html, {
			WHOLE_DOCUMENT: true,
			ADD_TAGS: ['style'],
			ADD_ATTR: ['style', 'class', 'id', 'target', 'rel']
		}).trim();

		if (!sanitized) {
			return '';
		}

		const doc = new DOMParser().parseFromString(sanitized, 'text/html');
		enhanceDocumentLinks(doc);

		const bridgeStyle = doc.createElement('style');
		bridgeStyle.textContent = `
			:root { color-scheme: light dark; }
			html, body {
				margin: 0;
				padding: 0;
				background: transparent;
			}
			body {
				overflow-wrap: anywhere;
				word-break: break-word;
			}
			img, video {
				max-width: 100%;
				height: auto;
			}
			table {
				max-width: 100%;
			}
			a {
				word-break: break-word;
			}
		`;
		doc.head.appendChild(bridgeStyle);

		return `<!doctype html>${doc.documentElement.outerHTML}`;
	}

	function canRenderWithTiptap(html: string): boolean {
		if (!browser || !html.trim()) {
			return true;
		}

		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');

		return Array.from(doc.body.querySelectorAll('*')).every((node) => TIPTAP_SUPPORTED_TAGS.has(node.tagName));
	}

	function shouldUseIsolatedHtml(html: string): boolean {
		if (!browser || !html.trim()) {
			return false;
		}

		const doc = new DOMParser().parseFromString(html, 'text/html');
		return (
			/<(?:html|head|body)\b/i.test(html) ||
			doc.head.children.length > 0 ||
			Boolean(doc.body.querySelector(COMPLEX_HTML_SELECTORS))
		);
	}

	function syncIframeHeight(): void {
		if (!iframeElement?.contentDocument) {
			return;
		}

		const { body, documentElement } = iframeElement.contentDocument;
		const nextHeight = Math.max(
			body?.scrollHeight ?? 0,
			documentElement?.scrollHeight ?? 0,
			body?.offsetHeight ?? 0,
			documentElement?.offsetHeight ?? 0,
			240
		);

		iframeHeight = nextHeight;
	}

	function cleanupIframeObserver(): void {
		iframeResizeObserver?.disconnect();
		iframeResizeObserver = null;
		if (iframeResizeFrame !== null) {
			cancelAnimationFrame(iframeResizeFrame);
			iframeResizeFrame = null;
		}
		window.removeEventListener('resize', syncIframeHeight);
	}

	function setupIframeObserver(): void {
		cleanupIframeObserver();

		if (!browser || !iframeElement?.contentDocument) {
			return;
		}

		const { body, documentElement } = iframeElement.contentDocument;
		const observedNodes = [documentElement, body].filter(Boolean) as Element[];

		if ('ResizeObserver' in window && observedNodes.length > 0) {
			iframeResizeObserver = new ResizeObserver(() => {
				if (iframeResizeFrame !== null) {
					cancelAnimationFrame(iframeResizeFrame);
				}
				iframeResizeFrame = requestAnimationFrame(() => {
					iframeResizeFrame = null;
					syncIframeHeight();
				});
			});

			observedNodes.forEach((node) => iframeResizeObserver?.observe(node));
		}

		body?.querySelectorAll('img').forEach((image) => {
			if (!image.complete) {
				image.addEventListener('load', syncIframeHeight, { once: true });
			}
		});

		window.addEventListener('resize', syncIframeHeight);
		syncIframeHeight();
	}

	function handleIframeLoad(): void {
		setupIframeObserver();
	}

	const sanitizedHtml = $derived.by(() => sanitizeHtml(htmlBody));
	const plainHtml = $derived.by(() => plainTextToHtml(plainBody));
	const isolatedHtml = $derived.by(() =>
		shouldUseIsolatedHtml(htmlBody?.trim() ?? '') || !canRenderWithTiptap(sanitizedHtml)
			? sanitizeIsolatedHtml(htmlBody)
			: ''
	);
	const renderedHtml = $derived.by(() => sanitizedHtml || plainHtml);
	const useIframeFallback = $derived.by(() => Boolean(isolatedHtml));

	function ensureEditor(): void {
		if (!editorElement || editor || useIframeFallback) {
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
		if (useIframeFallback) {
			destroyEditor();
			return;
		}

		cleanupIframeObserver();
		ensureEditor();
	});

	$effect(() => {
		if (!editor || useIframeFallback) {
			return;
		}

		if (renderedHtml !== editor.getHTML()) {
			editor.commands.setContent(renderedHtml, { emitUpdate: false });
		}
	});

	$effect(() => {
		if (!useIframeFallback) {
			cleanupIframeObserver();
			return;
		}

		iframeHeight = 320;
	});

	onDestroy(() => {
		cleanupIframeObserver();
		destroyEditor();
	});
</script>

{#if useIframeFallback}
	<div class="mail-renderer-html" role="article" aria-label={$_('mail.emailContent')}>
		<iframe
			bind:this={iframeElement}
			class="mail-renderer-html__frame"
			title={$_('mail.emailContent')}
			srcdoc={isolatedHtml}
			sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
			style={`height: ${iframeHeight}px;`}
			onload={handleIframeLoad}
		></iframe>
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

	.mail-renderer__content :global(.ProseMirror) {
		min-height: 200px;
		padding: 1rem 1.25rem 1.5rem;
		font-size: 15px;
		line-height: 1.7;
		color: var(--text-primary);
		background: transparent;
	}

	.mail-renderer-html {
		padding: 1rem 1.25rem 1.5rem;
	}

	.mail-renderer-html__frame {
		display: block;
		width: 100%;
		min-height: 240px;
		border: 0;
		background: transparent;
	}

	.mail-renderer__content :global(p) {
		margin: 0 0 0.9rem;
	}

	.mail-renderer__content :global(h1),
	.mail-renderer__content :global(h2),
	.mail-renderer__content :global(h3),
	.mail-renderer__content :global(h4),
	.mail-renderer__content :global(h5),
	.mail-renderer__content :global(h6) {
		margin: 1.25rem 0 0.75rem;
		line-height: 1.3;
		font-weight: 600;
		color: var(--text-primary);
	}

	.mail-renderer__content :global(ul),
	.mail-renderer__content :global(ol) {
		margin: 0 0 1rem;
		padding-left: 1.5rem;
	}

	.mail-renderer__content :global(li) {
		margin-bottom: 0.35rem;
	}

	.mail-renderer__content :global(blockquote) {
		margin: 1rem 0;
		padding-left: 1rem;
		border-left: 3px solid var(--border-secondary);
		color: var(--text-secondary);
	}

	.mail-renderer__content :global(a) {
		color: var(--accent-primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.mail-renderer__content :global(pre) {
		margin: 1rem 0;
		padding: 0.875rem 1rem;
		border-radius: 10px;
		background: var(--bg-secondary);
		overflow-x: auto;
	}

	.mail-renderer__content :global(code) {
		font-family: 'SF Mono', 'Menlo', monospace;
		font-size: 0.875em;
	}
</style>
