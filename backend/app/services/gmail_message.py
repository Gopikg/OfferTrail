"""Safe, text-only helpers for Gmail message payloads."""

import base64
from html.parser import HTMLParser


class _HTMLTextExtractor(HTMLParser):
    _BLOCK_TAGS = {"br", "div", "li", "p", "tr", "h1", "h2", "h3", "h4", "h5", "h6"}
    _IGNORED_TAGS = {"script", "style", "head"}

    def __init__(self):
        super().__init__()
        self.parts = []
        self.ignored_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self._IGNORED_TAGS:
            self.ignored_depth += 1
        elif tag in self._BLOCK_TAGS:
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag in self._IGNORED_TAGS and self.ignored_depth:
            self.ignored_depth -= 1
        elif tag in self._BLOCK_TAGS:
            self.parts.append(" ")

    def handle_data(self, data):
        if not self.ignored_depth:
            self.parts.append(data)


def decode_body(data):
    if not data:
        return ""
    try:
        padding = "=" * (-len(data) % 4)
        return base64.urlsafe_b64decode((data + padding).encode("UTF-8")).decode(
            "UTF-8", errors="ignore"
        )
    except (ValueError, UnicodeDecodeError) as err:
        print("Failed to decode email body:", err)
        return ""


def html_to_text(html):
    parser = _HTMLTextExtractor()
    parser.feed(html or "")
    parser.close()
    return " ".join("".join(parser.parts).split())


def extract_body(payload):
    """Return plain text, falling back to readable HTML-only content."""
    plain_parts, html_parts = [], []

    def collect(part):
        mime_type = part.get("mimeType", "")
        body_data = part.get("body", {}).get("data")
        if body_data:
            decoded = decode_body(body_data)
            if mime_type == "text/plain":
                plain_parts.append(decoded)
            elif mime_type == "text/html":
                html_parts.append(decoded)
            elif not part.get("parts"):
                plain_parts.append(decoded)
        for child in part.get("parts", []):
            collect(child)

    collect(payload or {})
    if plain_parts:
        return "\n".join(part for part in plain_parts if part).strip()
    return "\n".join(html_to_text(part) for part in html_parts if part).strip()
