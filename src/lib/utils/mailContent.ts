import type { Mail } from '$lib/types.js';

type ReplyLabels = {
	rePrefix: string;
	originalMessage: string;
	fromField: string;
	dateField: string;
	subjectField: string;
};

type ForwardLabels = {
	fwdPrefix: string;
	forwardedMessage: string;
	fromField: string;
	dateField: string;
	subjectField: string;
	toField?: string;
	ccField?: string;
	replyToField?: string;
};

type DraftContent = {
	subject: string;
	body: string;
	html_body: string;
};

const EMPTY_HTML_REGEX = /^<(p|div)>(\s|&nbsp;|<br\s*\/?>)*<\/\1>$/i;
const BLOCK_TAGS = new Set([
	'ADDRESS',
	'ARTICLE',
	'ASIDE',
	'BLOCKQUOTE',
	'CAPTION',
	'DIV',
	'DL',
	'DT',
	'DD',
	'FIGCAPTION',
	'FIGURE',
	'FOOTER',
	'FORM',
	'H1',
	'H2',
	'H3',
	'H4',
	'H5',
	'H6',
	'HEADER',
	'HR',
	'LI',
	'MAIN',
	'NAV',
	'OL',
	'P',
	'PRE',
	'SECTION',
	'TABLE',
	'TBODY',
	'TD',
	'TFOOT',
	'TH',
	'THEAD',
	'TR',
	'UL'
]);

function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function normalizeWhitespace(text: string): string {
	return text
		.replace(/\r\n/g, '\n')
		.replace(/\u00a0/g, ' ')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function extractNodeText(node: Node): string {
	if (node.nodeType === Node.TEXT_NODE) {
		return node.textContent ?? '';
	}

	if (!(node instanceof HTMLElement)) {
		return '';
	}

	if (node.tagName === 'BR') {
		return '\n';
	}

	if (node.tagName === 'LI') {
		const itemText = normalizeWhitespace(Array.from(node.childNodes).map(extractNodeText).join(''));
		return itemText ? `- ${itemText}\n` : '';
	}

	if (node.tagName === 'TD' || node.tagName === 'TH') {
		return `${Array.from(node.childNodes).map(extractNodeText).join('')}\t`;
	}

	const content = Array.from(node.childNodes).map(extractNodeText).join('');
	if (BLOCK_TAGS.has(node.tagName)) {
		return `${content}\n\n`;
	}

	return content;
}

export function plainTextToHtml(text: string): string {
	if (!text.trim()) {
		return '';
	}

	return text
		.split(/\n{2,}/)
		.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
		.join('');
}

export function htmlToPlainText(html: string): string {
	if (!html.trim()) {
		return '';
	}

	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	const text = Array.from(doc.body.childNodes).map(extractNodeText).join('');
	return normalizeWhitespace(text);
}

export function normalizeEditorHtml(html: string): string {
	const trimmed = html.trim();
	if (!trimmed || EMPTY_HTML_REGEX.test(trimmed) || !htmlToPlainText(trimmed)) {
		return '';
	}
	return trimmed;
}

export function extractPreviewText(body: string, maxLength = 100): string {
	const firstLine = body
		.split('\n')
		.map((line) => line.trim())
		.find(Boolean) ?? '';

	if (firstLine.length <= maxLength) {
		return firstLine;
	}

	return `${firstLine.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function buildComposerPayload(html: string, fallbackPlainText = ''): {
	body: string;
	html_body?: string;
	preview: string;
} {
	const normalizedHtml = normalizeEditorHtml(html);
	const body = normalizedHtml ? htmlToPlainText(normalizedHtml) : normalizeWhitespace(fallbackPlainText);

	return {
		body,
		html_body: normalizedHtml || undefined,
		preview: extractPreviewText(body)
	};
}

export function mergeComposerPayload(
	content: { body: string; html_body?: string; preview: string },
	reference?: { body?: string; html_body?: string }
): {
	body: string;
	html_body?: string;
	preview: string;
} {
	if (!reference?.body && !reference?.html_body) {
		return content;
	}

	const mergedBody = normalizeWhitespace(
		[content.body, reference.body ?? ''].filter(Boolean).join('\n\n')
	);
	const mergedHtml = normalizeEditorHtml(
		[
			content.html_body ?? plainTextToHtml(content.body),
			reference.html_body ?? plainTextToHtml(reference.body ?? '')
		]
			.filter(Boolean)
			.join('')
	);

	return {
		body: mergedBody,
		html_body: mergedHtml || undefined,
		preview: extractPreviewText(mergedBody)
	};
}

function ensureSubjectPrefix(subject: string, prefix: string): string {
	return subject.startsWith(prefix) ? subject : `${prefix}${subject}`;
}

function formatEnvelopeLine(mail: Mail): string {
	return `${mail.from_name} <${mail.from_email}>`;
}

function formatAddressList(addresses?: Mail['to']): string {
	if (!addresses?.length) {
		return '';
	}

	return addresses
		.map((address) => {
			const name = address.name?.trim();
			return name ? `${name} <${address.email}>` : address.email;
		})
		.join(', ');
}

function buildQuotedHtml(mail: Mail): string {
	const quoted = normalizeEditorHtml(mail.html_body ?? '');
	return quoted || plainTextToHtml(mail.body);
}

function buildReplyLikeDraft(
	mail: Mail,
	subjectPrefix: string,
	sectionTitle: string,
	fromField: string,
	dateField: string,
	subjectField: string
): DraftContent {
	const formattedDate = new Date(mail.timestamp).toLocaleString();
	const quotedHtml = buildQuotedHtml(mail);
	const plainSource = normalizeWhitespace(mail.body || htmlToPlainText(quotedHtml));
	const headerLine = `${fromField}${formatEnvelopeLine(mail)}`;
	const dateLine = `${dateField}${formattedDate}`;
	const subjectLine = `${subjectField}${mail.subject}`;

	return {
		subject: ensureSubjectPrefix(mail.subject, subjectPrefix),
		body: `\n\n${sectionTitle}\n${headerLine}\n${dateLine}\n${subjectLine}\n\n${plainSource}`,
		html_body: `<p></p><p></p><p>${escapeHtml(sectionTitle)}</p><p><strong>${escapeHtml(fromField)}</strong>${escapeHtml(formatEnvelopeLine(mail))}<br><strong>${escapeHtml(dateField)}</strong>${escapeHtml(formattedDate)}<br><strong>${escapeHtml(subjectField)}</strong>${escapeHtml(mail.subject)}</p><blockquote>${quotedHtml}</blockquote>`
	};
}

export function buildReplyDraft(mail: Mail, labels: ReplyLabels): DraftContent {
	return buildReplyLikeDraft(
		mail,
		labels.rePrefix,
		labels.originalMessage,
		labels.fromField,
		labels.dateField,
		labels.subjectField
	);
}

export function buildForwardDraft(mail: Mail, labels: ForwardLabels): DraftContent {
	const formattedDate = new Date(mail.timestamp).toLocaleString();
	const plainSource = normalizeWhitespace(mail.body || htmlToPlainText(buildQuotedHtml(mail)));
	const toLine = formatAddressList(mail.to);
	const ccLine = formatAddressList(mail.cc);
	const replyToLine = formatAddressList(mail.reply_to);
	const bodyLines = [
		labels.forwardedMessage,
		`${labels.fromField}${formatEnvelopeLine(mail)}`,
		`${labels.dateField}${formattedDate}`,
		`${labels.subjectField}${mail.subject}`,
		toLine && labels.toField ? `${labels.toField}${toLine}` : '',
		ccLine && labels.ccField ? `${labels.ccField}${ccLine}` : '',
		replyToLine && labels.replyToField ? `${labels.replyToField}${replyToLine}` : '',
		'',
		plainSource
	].filter(Boolean);

	const htmlLines = [
		`<p><strong>${escapeHtml(labels.forwardedMessage)}</strong></p>`,
		`<p><strong>${escapeHtml(labels.fromField)}</strong>${escapeHtml(formatEnvelopeLine(mail))}<br><strong>${escapeHtml(labels.dateField)}</strong>${escapeHtml(formattedDate)}<br><strong>${escapeHtml(labels.subjectField)}</strong>${escapeHtml(mail.subject)}${toLine && labels.toField ? `<br><strong>${escapeHtml(labels.toField)}</strong>${escapeHtml(toLine)}` : ''}${ccLine && labels.ccField ? `<br><strong>${escapeHtml(labels.ccField)}</strong>${escapeHtml(ccLine)}` : ''}${replyToLine && labels.replyToField ? `<br><strong>${escapeHtml(labels.replyToField)}</strong>${escapeHtml(replyToLine)}` : ''}</p>`,
		buildQuotedHtml(mail)
	];

	return {
		subject: ensureSubjectPrefix(mail.subject, labels.fwdPrefix),
		body: bodyLines.join('\n'),
		html_body: htmlLines.join('')
	};
}
