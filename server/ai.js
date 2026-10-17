// اقتراح تصنيف ووسوم ووصف للملف باستخدام Claude، من اسمه ونصه وصورته المصغرة

const fs = require('node:fs');
const config = require('./config');

let client = null;
function getClient() {
  if (!client) {
    const Anthropic = require('@anthropic-ai/sdk');
    client = new Anthropic();
  }
  return client;
}

const SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', description: 'تصنيف قصير من كلمة أو كلمتين' },
    tags: { type: 'array', items: { type: 'string' }, description: 'من 3 إلى 8 وسوم قصيرة' },
    description: { type: 'string', description: 'وصف في جملة أو جملتين' },
  },
  required: ['category', 'tags', 'description'],
  additionalProperties: false,
};

const SYSTEM = `You help employees organize a shared company archive. Given one archived item, suggest how to file it.
Write every value in Arabic (keep brand names, product names and technical terms in their original language).
- category: one short category, 1-2 words. Reuse one of the existing categories when it fits; invent a new one only if none fits.
- tags: 3 to 8 short, specific, searchable keywords (people, places, topics, event, year). No "#" signs, no duplicates of the category.
- description: one or two plain sentences saying what the item is and what it is useful for.
Base everything on the provided content. If the content is thin, rely on the file name and type and keep the description modest.`;

/**
 * @param {object} input
 * @param {string} input.name
 * @param {string} input.typeLabel
 * @param {string[]} input.folderPath
 * @param {string[]} input.categories existing categories in the archive
 * @param {string} input.text extracted text / OCR / transcript
 * @param {string|null} input.thumbPath WebP thumbnail on disk
 */
async function suggest({ name, typeLabel, folderPath, categories, text, thumbPath }) {
  const content = [];
  if (thumbPath && fs.existsSync(thumbPath)) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/webp', data: (await fs.promises.readFile(thumbPath)).toString('base64') },
    });
  }
  const excerpt = String(text || '').slice(0, 30_000);
  content.push({
    type: 'text',
    text: [
      `File name: ${name}`,
      `File type: ${typeLabel}`,
      folderPath.length ? `Folder: ${folderPath.join(' / ')}` : null,
      `Existing categories: ${categories.length ? categories.join('، ') : '(none yet)'}`,
      excerpt ? `Content excerpt:\n<content>\n${excerpt}\n</content>` : 'No text content is available for this file.',
    ].filter(Boolean).join('\n\n'),
  });

  const response = await getClient().beta.messages.create({
    model: config.ai.model,
    max_tokens: 2000,
    // عند رفض النموذج للطلب لأسباب أمان، يعيد الخادم المحاولة تلقائياً على نموذج بديل مناسب
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content }],
  });

  if (response.stop_reason === 'refusal') throw new Error('تعذر اقتراح بيانات لهذا الملف');
  const block = response.content.find((b) => b.type === 'text');
  if (!block) throw new Error('لم يصل رد من خدمة الذكاء الاصطناعي');
  const out = JSON.parse(block.text);
  return {
    category: String(out.category || '').trim(),
    tags: [...new Set((out.tags || []).map((t) => String(t).replace(/^#/, '').trim()).filter(Boolean))].slice(0, 8),
    description: String(out.description || '').trim(),
  };
}

module.exports = { suggest, enabled: () => config.ai.enabled };
