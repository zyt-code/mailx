<script lang="ts">
	import { _ } from 'svelte-i18n';
	import DOMPurify from 'dompurify';

	interface Props {
		htmlBody?: string;
		plainBody: string;
	}

	let { htmlBody, plainBody }: Props = $props();

	let iframeEl = $state<HTMLIFrameElement | null>(null);

	// Process HTML using TipTap-like logic for better consistency
	function processHtml(html: string): string {
		// Use DOMPurify to sanitize HTML
		const sanitized = DOMPurify.sanitize(html, {
			WHOLE_DOCUMENT: false,
			ADD_TAGS: ['style', 'iframe', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption'],
			ADD_ATTR: ['target', 'rel', 'src', 'href', 'colspan', 'rowspan', 'style', 'class', 'id', 'width', 'height', 'alt', 'title']
		});

		// Create a temporary div to parse HTML
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = sanitized;

		// Find all links and add target="_blank" and rel attributes
		const links = tempDiv.querySelectorAll('a');
		links.forEach((link) => {
			link.setAttribute('target', '_blank');
			link.setAttribute('rel', 'noopener noreferrer');
		});

		// Ensure images have max-width
		const images = tempDiv.querySelectorAll('img');
		images.forEach((img) => {
			if (!img.style.maxWidth) {
				img.style.maxWidth = '100%';
			}
			if (!img.style.height) {
				img.style.height = 'auto';
			}
		});

		return tempDiv.innerHTML;
	}

	// Build the srcdoc content for the iframe with prose styles
	let srcdoc = $derived.by(() => {
		if (htmlBody) {
			const processed = processHtml(htmlBody);

			return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  /* CSS Reset for consistent styling */
  *, *::before, *::after {
    box-sizing: border-box;
  }
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  body {
    margin: 0;
    padding: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Helvetica Neue', sans-serif;
    font-size: 15px;
    line-height: 1.7;
    color: #37352f;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  /* Prose-style typography for better readability */
  body h1, body h2, body h3, body h4, body h5, body h6 {
    margin-top: 1.5em;
    margin-bottom: 0.75em;
    font-weight: 600;
    line-height: 1.3;
  }
  body h1 { font-size: 2em; }
  body h2 { font-size: 1.5em; }
  body h3 { font-size: 1.25em; }

  body p {
    margin-bottom: 0.75em;
    line-height: 1.6;
  }

  body ul, body ol {
    padding-left: 1.5em;
    margin-bottom: 0.75em;
  }

  body li {
    margin-bottom: 0.25em;
  }

  body a {
    color: #2563eb;
    text-decoration: underline;
  }
  body a:hover {
    color: #1d4ed8;
  }

  body strong {
    font-weight: 600;
  }

  body em {
    font-style: italic;
  }

  body code {
    background: #f7f6f3;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
    font-size: 0.9em;
  }

  body pre {
    background: #f7f6f3;
    padding: 1em;
    border-radius: 8px;
    overflow-x: auto;
    margin-bottom: 1em;
  }
  body pre code {
    background: none;
    padding: 0;
  }

  body blockquote {
    border-left: 4px solid #e5e5e7;
    padding-left: 1em;
    margin-left: 0;
    margin-bottom: 1em;
    color: #6e6e73;
    font-style: italic;
  }

  body table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1em;
  }

  body th, body td {
    border: 1px solid #e5e5e7;
    padding: 0.5em;
    text-align: left;
  }

  body th {
    background: #f7f6f5;
    font-weight: 600;
  }

  /* Ensure images don't overflow */
  img { max-width: 100%; height: auto; }

  /* Ensure tables don't overflow */
  table { max-width: 100%; border-collapse: collapse; }

  /* Reset any inline styles that might conflict */
  style:not([data-svelte-scoped]) {
    display: none !important;
  }
</style>
</head>
<body>${processed}</body>
</html>`;
		}

		// Plain text fallback — escape HTML and preserve whitespace
		const escaped = plainBody
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\n/g, '<br>');

		return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  *, *::before, *::after {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    padding: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Helvetica Neue', sans-serif;
    font-size: 15px;
    line-height: 1.7;
    color: #37352f;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>
</head>
<body>${escaped}</body>
</html>`;
	});

	// Auto-resize iframe to fit content
	function handleLoad() {
		resizeIframe();
	}

	function resizeIframe() {
		if (!iframeEl?.contentDocument?.body) return;
		const height = iframeEl.contentDocument.documentElement.scrollHeight;
		iframeEl.style.height = `${height}px`;
	}

	// Re-measure on content change
	$effect(() => {
		srcdoc; // track dependency
		if (iframeEl) {
			// Wait for next frame so the iframe has loaded the new srcdoc
			requestAnimationFrame(() => {
				setTimeout(resizeIframe, 100);
			});
		}
	});
</script>

<iframe
	bind:this={iframeEl}
	title={$_('mail.emailContent')}
	{srcdoc}
	sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
	class="w-full border-none pointer-events-auto"
	style="min-height: 200px;"
	onload={handleLoad}
></iframe>
