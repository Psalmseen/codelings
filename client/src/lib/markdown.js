import DOMPurify from 'dompurify';
import { marked } from 'marked';

export function renderMarkdown(text) {
  return DOMPurify.sanitize(marked.parse(text ?? '', { breaks: true }));
}
