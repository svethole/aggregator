// Volltext eines Artikels von der Originalseite laden (wie der Lesemodus im Browser)
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import { q } from './db.js';
import { fetchOk } from './http.js';
import { cleanHtml, htmlToText, pageMeta } from './content.js';

const pending = new Map();

export async function loadFulltext(articleId, { force = false } = {}) {
  const a = q('SELECT id, url, fulltext, fulltext_status, image_url FROM articles WHERE id = ?').get(articleId);
  if (!a) throw new Error('Artikel nicht gefunden');
  if (a.fulltext_status === 'ok') return { status: 'ok', html: a.fulltext };
  if (a.fulltext_status === 'failed' && !force) return { status: 'failed', html: null };
  if (!a.url) return { status: 'unavailable', html: null };
  if (pending.has(articleId)) return pending.get(articleId);

  const p = (async () => {
    try {
      const r = await fetchOk(a.url);
      const meta = pageMeta(r.text, r.url);
      const { document } = parseHTML(r.text);
      const parsed = new Readability(document, { charThreshold: 300, keepClasses: false }).parse();
      if (!parsed?.content || htmlToText(parsed.content).length < 200) {
        q("UPDATE articles SET fulltext_status = 'failed' WHERE id = ?").run(articleId);
        return { status: 'failed', html: null };
      }
      const html = cleanHtml(parsed.content, r.url);
      q("UPDATE articles SET fulltext = ?, fulltext_status = 'ok', image_url = COALESCE(image_url, ?) WHERE id = ?").run(
        html,
        meta.image,
        articleId,
      );
      return { status: 'ok', html };
    } catch (err) {
      q("UPDATE articles SET fulltext_status = 'failed' WHERE id = ?").run(articleId);
      return { status: 'failed', html: null, error: err.message };
    } finally {
      pending.delete(articleId);
    }
  })();
  pending.set(articleId, p);
  return p;
}
