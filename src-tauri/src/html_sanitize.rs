use ammonia::{Builder, UrlRelative};

/// Sanitize HTML content to prevent XSS attacks
/// Uses a conservative allowlist for safe HTML elements and attributes
pub fn sanitize_html(html: &str) -> String {
	Builder::default()
		// Add common safe tags (removed link tag as it can be unsafe)
		.add_tags(&[
			"a", "abbr", "acronym", "address", "area", "article", "aside", "audio",
			"b", "bdi", "bdo", "blockquote", "br", "button",
			"caption", "cite", "code", "col", "colgroup",
			"data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt",
			"em", "embed",
			"fieldset", "figcaption", "figure", "footer", "form",
			"h1", "h2", "h3", "h4", "h5", "h6", "header", "hr",
			"i", "iframe", "img", "input", "ins",
			"kbd",
			"label", "legend", "li",
			"main", "map", "mark", "menu", "menuitem", "meter",
			"nav", "noscript",
			"object", "ol", "optgroup", "option", "output",
			"p", "param", "picture", "pre", "progress",
			"q",
			"rp", "rt", "ruby",
			"s", "samp", "section", "select", "small", "source", "span", "strong", "sub", "summary", "sup",
			"table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "tr", "track",
			"u", "ul", "use",
			"var", "video",
			"wbr"
		])
		// Add safe attributes (generic) - removed style as it can contain unsafe CSS
		.add_generic_attributes(&[
			"accesskey", "autocapitalize", "class", "contenteditable",
			"dir", "draggable", "enterkeyhint", "hidden", "id", "inputmode", "is",
			"itemid", "itemprop", "itemref", "itemscope", "itemtype", "lang",
			"part", "role", "slot", "tabindex",
			"title", "translate"
		])
		// Add safe attributes for specific tags
		// NOTE: Do NOT add "rel" to anchor tags - ammonia manages this internally
		.add_tag_attributes("a", &["href", "hreflang", "target", "type", "download"])
		.add_tag_attributes("img", &["src", "alt", "width", "height", "loading", "srcset", "sizes"])
		.add_tag_attributes("source", &["src", "type", "media", "srcset"])
		.add_tag_attributes("video", &["src", "poster", "width", "height", "controls", "loop", "muted", "autoplay"])
		.add_tag_attributes("audio", &["src", "controls", "loop", "muted", "autoplay"])
		.add_tag_attributes("iframe", &["src", "width", "height", "loading", "title"])
		.add_tag_attributes("td", &["colspan", "rowspan", "headers"])
		.add_tag_attributes("th", &["colspan", "rowspan", "headers", "scope"])
		.add_tag_attributes("col", &["span"])
		.add_tag_attributes("colgroup", &["span"])
		// Add safe URL schemes
		.url_relative(UrlRelative::Deny)
		// Remove script tags and event handlers
		.clean(html)
		.to_string()
}

/// Convert plain text to safe HTML (preserving line breaks)
pub fn text_to_html(text: &str) -> String {
	let escaped = html_escape::encode_text(text);
	let with_breaks = escaped.replace("\n\n", "</p><p>").replace("\n", "<br>");
	format!("<p>{}</p>", with_breaks)
}
#[cfg(test)]
#[path = "../test/html_sanitize_tests.rs"]
mod html_sanitize_tests;
