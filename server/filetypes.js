// أنواع الملفات: الاسم الظاهر واللون المميز والامتدادات. يُرسل للواجهة حتى تبقى الألوان موحدة
const TYPES = [
  { key: 'pdf', label: 'PDF', color: '#d93025', exts: 'pdf' },
  { key: 'word', label: 'Word', color: '#2b5fb4', exts: 'doc docx odt rtf pages dot dotx' },
  { key: 'excel', label: 'Excel', color: '#1f7a45', exts: 'xls xlsx xlsm csv ods numbers' },
  { key: 'powerpoint', label: 'PowerPoint', color: '#c55a11', exts: 'ppt pptx odp key pps ppsx' },
  { key: 'image', label: 'صور', color: '#8a4fbf', exts: 'png jpg jpeg gif webp heic heif bmp tif tiff raw cr2 nef arw dng avif' },
  { key: 'video', label: 'فيديو', color: '#d0386b', exts: 'mp4 mov m4v avi mkv webm wmv flv mts m2ts 3gp mpg mpeg' },
  { key: 'audio', label: 'صوت', color: '#c76a12', exts: 'mp3 wav m4a aac ogg flac wma opus' },
  { key: 'design', label: 'تصاميم', color: '#0097a7', exts: 'psd psb ai eps svg fig sketch xd indd idml cdr afdesign afphoto' },
  { key: 'montage', label: 'مونتاج', color: '#5b3cc4', exts: 'prproj aep aet drp drt fcpx fcpbundle veg kdenlive mlt pproj aepx mogrt' },
  { key: 'note', label: 'ملاحظات', color: '#b88a00', exts: 'txt md' },
  { key: 'link', label: 'روابط', color: '#1a73e8', exts: 'url' },
  { key: 'archive', label: 'مضغوطة', color: '#9a6b1f', exts: 'zip rar 7z tar gz' },
].map((t) => ({ ...t, exts: t.exts.split(' ') }));

const OTHER = { key: 'other', label: 'أخرى', color: '#6b7a75', exts: [] };
const BY_EXT = new Map(TYPES.flatMap((t) => t.exts.map((e) => [e, t])));

const extOf = (name) => (String(name).includes('.') ? String(name).split('.').pop().toLowerCase() : '');
const typeOf = (name) => BY_EXT.get(extOf(name)) || OTHER;

// شرط SQL يختار ملفات نوع معين حسب امتداد الاسم
function typeCondition(key, column = 'f.name') {
  if (key === 'other') {
    const all = [...BY_EXT.keys()];
    return { sql: `(${all.map(() => `lower(${column}) NOT LIKE ?`).join(' AND ')})`, params: all.map((e) => `%.${e}`) };
  }
  const t = TYPES.find((x) => x.key === key);
  if (!t) return null;
  return { sql: `(${t.exts.map(() => `lower(${column}) LIKE ?`).join(' OR ')})`, params: t.exts.map((e) => `%.${e}`) };
}

module.exports = { TYPES: [...TYPES, OTHER], typeOf, typeCondition, extOf };
