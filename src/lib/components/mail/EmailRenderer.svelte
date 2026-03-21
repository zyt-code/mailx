<script lang="ts">
	import { _ } from 'svelte-i18n';
	import DOMPurify from 'dompurify';

	interface Props {
		htmlBody?: string;
		plainBody: string;
	}

	let { htmlBody, plainBody }: Props = $props();

	let iframeEl = $state<HTMLIFrameElement | null>(null);

	// Process HTML to ensure links open in new tab
	function processHtmlLinks(html: string): string {
		// Create a temporary div to parse HTML
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = html;

		// Find all links and add target="_blank" and rel attributes
		const links = tempDiv.querySelectorAll('a');
		links.forEach((link) => {
			link.setAttribute('target', '_blank');
			link.setAttribute('rel', 'noopener noreferrer');
		});

		return tempDiv.innerHTML;
	}

	// Build the srcdoc content for the iframe
	let srcdoc = $derived.by(() => {
		if (htmlBody) {
			const sanitized = DOMPurify.sanitize(htmlBody, {
				WHOLE_DOCUMENT: false,
				ADD_TAGS: ['style'],
				ADD_ATTR: ['target', 'rel']
			});

			// Post-process to ensure all links have target="_blank"
			const processed = processHtmlLinks(sanitized);

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
  /* Ensure links are styled consistently */
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
  /* Ensure images don't overflow */
  img { max-width: 100%; height: auto; }
  /* Ensure tables don't overflow */
  table { max-width: 100%; border-collapse: collapse; }
  /* Ensure code blocks scroll horizontally */
  pre {
    overflow-x: auto;
    background: #f7f6f3;
    padding: 12px;
    border-radius: 4px;
  }
  code {
    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
    font-size: 0.9em;
  }
  /* Ensure lists have proper spacing */
  ul, ol { padding-left: 24px; margin: 8px 0; }
  li { margin: 4px 0; }
  /* Ensure headings have proper spacing */
  h1, h2, h3, h4, h5, h6 {
    margin-top: 16px;
    margin-bottom: 8px;
    font-weight: 600;
    line-height: 1.3;
  }
  h1 { font-size: 2em; }
  h2 { font-size: 1.5em; }
  h3 { font-size: 1.25em; }
  /* Ensure paragraphs have proper spacing */
  p { margin: 8px 0; }
  /* Remove default margins from common elements */
  div, p, span, a { margin: 0; padding: 0; }
  /* Reset any inline styles that might conflict */
  style:not([data-svelte-scoped]) {
    display: none !important;
  }
  /* Only allow styles with specific data attribute */
  style[data-allow-style] {
    display: block !important;
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
