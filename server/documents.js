// قراءة محتوى الملفات للبحث، وتحويلها من وإلى صيغة قابلة للتعديل داخل التطبيق

const path = require('node:path');
const mammoth = require('mammoth');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const htmlToDocx = require('html-to-docx');

const MAX_TEXT = 300_000;
const MAX_SHEET_ROWS = 2000;
const MAX_SHEET_COLS = 60;
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

const TEXT_EXT = new Set(['.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm', '.log', '.ini', '.yaml', '.yml']);
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function ext(name) {
  return path.extname(name || '').toLowerCase();
}

// نوع المحرر المناسب للملف، أو null إذا لم يكن قابلاً للتعديل داخل التطبيق
function editKind(name) {
  const e = ext(name);
  if (TEXT_EXT.has(e)) return 'text';
  if (e === '.docx') return 'docx';
  if (e === '.xlsx') return 'sheet';
  return null;
}

function cellText(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('result' in value) return cellText(value.result);
    if ('richText' in value) return value.richText.map((t) => t.text).join('');
    if ('text' in value) return String(value.text);
    if ('error' in value) return String(value.error);
    return '';
  }
  return String(value);
}

async function loadWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

// هل نستطيع قراءة نص هذا النوع لفهرسته في البحث؟ (الفيديو والصور والتصاميم تُبحث بالاسم والوسوم فقط)
function canExtract(name) {
  const e = ext(name);
  return TEXT_EXT.has(e) || e === '.docx' || e === '.xlsx' || e === '.pdf';
}

async function extractText(buffer, name) {
  const e = ext(name);
  try {
    if (TEXT_EXT.has(e)) return buffer.toString('utf8').slice(0, MAX_TEXT);
    if (e === '.docx') return (await mammoth.extractRawText({ buffer })).value.slice(0, MAX_TEXT);
    if (e === '.xlsx') {
      const wb = await loadWorkbook(buffer);
      const parts = [];
      wb.eachSheet((ws) => {
        parts.push(ws.name);
        ws.eachRow((row) => row.eachCell((c) => parts.push(cellText(c.value))));
      });
      return parts.join(' ').slice(0, MAX_TEXT);
    }
    if (e === '.pdf') {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        return (await parser.getText()).text.slice(0, MAX_TEXT);
      } finally {
        await parser.destroy();
      }
    }
  } catch (err) {
    console.warn(`تعذر استخراج النص من ${name}: ${err.message}`);
  }
  return '';
}

async function toEditable(buffer, name) {
  const kind = editKind(name);
  if (kind === 'text') return { kind, content: buffer.toString('utf8') };
  if (kind === 'docx') {
    const { value } = await mammoth.convertToHtml({ buffer });
    return { kind, html: value };
  }
  if (kind === 'sheet') {
    const wb = await loadWorkbook(buffer);
    const sheets = [];
    wb.eachSheet((ws) => {
      const rows = Math.min(Math.max(ws.rowCount, 20), MAX_SHEET_ROWS);
      const cols = Math.min(Math.max(ws.columnCount, 8), MAX_SHEET_COLS);
      const grid = [];
      for (let r = 1; r <= rows; r++) {
        const row = ws.getRow(r);
        const line = [];
        for (let c = 1; c <= cols; c++) {
          const v = row.getCell(c).value;
          line.push(v && typeof v === 'object' && v.formula ? { t: cellText(v), f: '=' + v.formula } : cellText(v));
        }
        grid.push(line);
      }
      const rtl = ws.views?.[0]?.rightToLeft ?? grid.slice(0, 5).some((row) => row.some((v) => ARABIC.test(typeof v === 'string' ? v : '')));
      sheets.push({ name: ws.name, rows: grid, rtl, truncated: ws.rowCount > MAX_SHEET_ROWS });
    });
    return { kind, sheets };
  }
  throw Object.assign(new Error('هذا النوع من الملفات لا يمكن تعديله داخل التطبيق'), { status: 400 });
}

function parseCellInput(raw) {
  const s = String(raw ?? '');
  if (s === '') return null;
  if (s.startsWith('=') && s.length > 1) return { formula: s.slice(1) };
  if (/^-?\d+(\.\d+)?$/.test(s.trim())) return Number(s);
  return s;
}

// يطبّق التعديلات على نسخة من الملف الأصلي، فتبقى التنسيقات والمعادلات التي لم تُلمس كما هي
async function applySheetEdits(buffer, changes) {
  const wb = await loadWorkbook(buffer);
  for (const ch of changes || []) {
    const ws = wb.getWorksheet(ch.sheet);
    if (!ws || !Number.isInteger(ch.r) || !Number.isInteger(ch.c)) continue;
    if (ch.r < 0 || ch.c < 0 || ch.r >= MAX_SHEET_ROWS || ch.c >= MAX_SHEET_COLS) continue;
    ws.getRow(ch.r + 1).getCell(ch.c + 1).value = parseCellInput(ch.v);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// html-to-docx لا يدعم الكتابة من اليمين لليسار، فنضيف خصائص الاتجاه للفقرات والنصوص العربية
function addRtl(xml) {
  return xml.replace(/<w:p>[\s\S]*?<\/w:p>/g, (p) => {
    if (!ARABIC.test(p)) return p;
    p = p.replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/, (m, inner) => {
      if (inner.includes('<w:bidi/>')) return m;
      const at = inner.search(/<w:(spacing|ind|jc|rPr)\b/);
      return `<w:pPr>${at < 0 ? inner + '<w:bidi/>' : inner.slice(0, at) + '<w:bidi/>' + inner.slice(at)}</w:pPr>`;
    });
    return p.replace(/<w:r>([\s\S]*?)<\/w:r>/g, (r, inner) => {
      if (!ARABIC.test(inner)) return r;
      inner = inner.replace('<w:rPr/>', '<w:rPr></w:rPr>');
      inner = inner.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/, (m, props) => {
        props = props.replace('<w:b/>', '<w:b/><w:bCs/>').replace('<w:i/>', '<w:i/><w:iCs/>');
        const at = props.search(/<w:(lang|cs)\b/);
        props = at < 0 ? props + '<w:rtl/>' : props.slice(0, at) + '<w:rtl/>' + props.slice(at);
        return `<w:rPr>${props}</w:rPr>`;
      });
      return `<w:r>${inner}</w:r>`;
    });
  });
}

async function htmlToDocxBuffer(html) {
  const raw = await htmlToDocx(`<!DOCTYPE html><html><body>${html}</body></html>`, null, {
    lang: 'ar-SA',
    font: 'Arial',
    table: { row: { cantSplit: true } },
  });
  const zip = await JSZip.loadAsync(raw);
  const docPath = 'word/document.xml';
  zip.file(docPath, addRtl(await zip.file(docPath).async('string')));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

async function fromEditable(kind, original, body) {
  if (kind === 'text') return Buffer.from(String(body.content ?? ''), 'utf8');
  if (kind === 'docx') return htmlToDocxBuffer(String(body.html ?? ''));
  if (kind === 'sheet') return applySheetEdits(original, body.changes);
  throw Object.assign(new Error('نوع تعديل غير معروف'), { status: 400 });
}

module.exports = { editKind, canExtract, extractText, toEditable, fromEditable, addRtl, DOCX_MIME, XLSX_MIME };
