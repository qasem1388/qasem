'use strict';
/**
 * تنقية محتوى المحرر (Rich Text) لمنع هجمات XSS.
 * يُسمح فقط بالوسوم والخصائص الآمنة، وبإطارات iframe من YouTube وخرائط Google فقط.
 */
const sanitizeHtml = require('sanitize-html');

const IFRAME_HOSTS = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com', 'www.google.com', 'maps.google.com'];
const SAFE_STYLE = {
  color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
  'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
  'text-align': [/^(left|right|center|justify|start|end)$/],
  'text-decoration': [/^(underline|line-through|none)$/],
  width: [/^\d+(\.\d+)?(px|%|em|rem)?$/],
  height: [/^\d+(\.\d+)?(px|%|em|rem)?$/],
  'border-collapse': [/^collapse$/],
  'font-size': [/^\d+(\.\d+)?(px|pt|em|rem|%)$/],
  'padding-right': [/^\d+(px|em)$/],
  'padding-left': [/^\d+(px|em)$/],
  'margin-right': [/^\d+(px|em)$/],
  'margin-left': [/^\d+(px|em)$/],
  float: [/^(left|right|none)$/],
};

const OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
    'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'iframe',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col', 'mark', 'small',
  ],
  allowedAttributes: {
    '*': ['style', 'class', 'dir', 'lang', 'title'],
    a: ['href', 'target', 'rel', 'download'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    iframe: ['src', 'width', 'height', 'allowfullscreen', 'allow', 'frameborder', 'title', 'loading', 'referrerpolicy'],
    td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan', 'scope'], col: ['span'], ol: ['start', 'type'],
  },
  allowedStyles: { '*': SAFE_STYLE },
  allowedClasses: { '*': [/^[a-z0-9_-]+$/i] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  allowedIframeHostnames: IFRAME_HOSTS,
  transformTags: {
    a: (tagName, attribs) => {
      if (attribs.target === '_blank') attribs.rel = 'noopener noreferrer';
      return { tagName, attribs };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { loading: 'lazy', ...attribs } }),
    iframe: (tagName, attribs) => ({ tagName, attribs: { loading: 'lazy', ...attribs } }),
  },
  exclusiveFilter: (frame) => (frame.tag === 'iframe' && !frame.attribs.src) || (frame.tag === 'img' && /^data:/i.test(frame.attribs.src || '') && !/^data:image\/(png|jpe?g|webp|gif);/i.test(frame.attribs.src)),
};

const sanitizeRich = (html) => sanitizeHtml(String(html || ''), OPTIONS);
const stripTags = (s) => sanitizeHtml(String(s || ''), { allowedTags: [], allowedAttributes: {} });

module.exports = { sanitizeRich, stripTags };
