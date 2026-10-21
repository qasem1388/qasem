"use client";

import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Columns3,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Rows3,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MediaDialog } from "./image-picker";

/** WYSIWYG editor (TipTap) producing HTML; the server sanitises it again on save. */
export function RichTextEditor({
  value,
  onChange,
  dir,
  label,
}: {
  value: string;
  onChange: (html: string) => void;
  dir: "rtl" | "ltr";
  label: string;
}) {
  const [picking, setPicking] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, protocols: ["mailto", "tel"] },
      }),
      Image,
      TableKit.configure({ table: { resizable: false } }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }),
    ],
    content: value,
    editorProps: {
      attributes: {
        dir,
        class: "rich-content min-h-80 p-4 focus:outline-none",
        "aria-label": label,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  if (!editor) return <div className="rounded-brand border-primary/15 bg-surface min-h-96 border" aria-busy />;

  return (
    <div className="rounded-brand border-primary/15 focus-within:border-primary focus-within:ring-secondary/40 overflow-hidden border bg-white focus-within:ring-2">
      <Toolbar editor={editor} dir={dir} onImage={() => setPicking(true)} />
      <EditorContent editor={editor} />
      {picking && (
        <MediaDialog
          onClose={() => setPicking(false)}
          onPick={(src) => {
            editor.chain().focus().setImage({ src, alt: "" }).run();
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

function Toolbar({ editor, dir, onImage }: { editor: Editor; dir: "rtl" | "ltr"; onImage: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      table: e.isActive("table"),
      left: e.isActive({ textAlign: "left" }),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = prompt("أدخل الرابط (https://… أو /صفحة داخلية أو mailto:)", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") return c().extendMarkRange("link").unsetLink().run();
    if (!/^(https?:\/\/|\/(?!\/)|mailto:|tel:)/.test(url.trim())) return alert("رابط غير صالح.");
    const external = /^https?:\/\//.test(url.trim());
    c()
      .extendMarkRange("link")
      .setLink({ href: url.trim(), target: external ? "_blank" : null })
      .run();
  };

  return (
    <div
      role="toolbar"
      aria-label="أدوات التنسيق"
      className="border-primary/10 bg-surface flex flex-wrap items-center gap-0.5 border-b p-1.5"
      dir="rtl"
    >
      <Btn label="تراجع" onClick={() => c().undo().run()} disabled={!state.canUndo}>
        <Undo2 />
      </Btn>
      <Btn label="إعادة" onClick={() => c().redo().run()} disabled={!state.canRedo}>
        <Redo2 />
      </Btn>
      <Sep />
      <Btn label="عنوان رئيسي" active={state.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </Btn>
      <Btn label="عنوان فرعي" active={state.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        <Heading3 />
      </Btn>
      <Sep />
      <Btn label="عريض" active={state.bold} onClick={() => c().toggleBold().run()}>
        <Bold />
      </Btn>
      <Btn label="مائل" active={state.italic} onClick={() => c().toggleItalic().run()}>
        <Italic />
      </Btn>
      <Btn label="تسطير" active={state.underline} onClick={() => c().toggleUnderline().run()}>
        <Underline />
      </Btn>
      <Btn label="يتوسطه خط" active={state.strike} onClick={() => c().toggleStrike().run()}>
        <Strikethrough />
      </Btn>
      <Sep />
      <Btn label="قائمة نقطية" active={state.bullet} onClick={() => c().toggleBulletList().run()}>
        <List />
      </Btn>
      <Btn label="قائمة مرقمة" active={state.ordered} onClick={() => c().toggleOrderedList().run()}>
        <ListOrdered />
      </Btn>
      <Btn label="اقتباس" active={state.quote} onClick={() => c().toggleBlockquote().run()}>
        <Quote />
      </Btn>
      <Btn label="خط فاصل" onClick={() => c().setHorizontalRule().run()}>
        <Minus />
      </Btn>
      <Sep />
      <Btn
        label={dir === "rtl" ? "محاذاة لليمين (البداية)" : "محاذاة لليمين"}
        active={state.right}
        onClick={() => c().setTextAlign("right").run()}
      >
        <AlignRight />
      </Btn>
      <Btn label="توسيط" active={state.center} onClick={() => c().setTextAlign("center").run()}>
        <AlignCenter />
      </Btn>
      <Btn label="محاذاة لليسار" active={state.left} onClick={() => c().setTextAlign("left").run()}>
        <AlignLeft />
      </Btn>
      <Sep />
      <Btn label="إدراج رابط" active={state.link} onClick={setLink}>
        <Link2 />
      </Btn>
      {state.link && (
        <Btn label="إزالة الرابط" onClick={() => c().unsetLink().run()}>
          <Link2Off />
        </Btn>
      )}
      <Btn label="إدراج صورة من المكتبة" onClick={onImage}>
        <ImagePlus />
      </Btn>
      <Btn label="إدراج جدول" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <Table2 />
      </Btn>
      {state.table && (
        <>
          <Btn label="إضافة صف" onClick={() => c().addRowAfter().run()}>
            <Rows3 />
          </Btn>
          <Btn label="إضافة عمود" onClick={() => c().addColumnAfter().run()}>
            <Columns3 />
          </Btn>
          <Btn label="حذف الصف" onClick={() => c().deleteRow().run()}>
            <span className="text-[10px] font-bold">−صف</span>
          </Btn>
          <Btn label="حذف العمود" onClick={() => c().deleteColumn().run()}>
            <span className="text-[10px] font-bold">−عمود</span>
          </Btn>
          <Btn label="حذف الجدول" onClick={() => c().deleteTable().run()}>
            <Trash2 />
          </Btn>
        </>
      )}
    </div>
  );
}

function Btn({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "text-ink/75 hover:text-primary inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-white disabled:opacity-30 [&_svg]:size-4",
        active && "bg-primary hover:bg-primary text-white hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="bg-primary/15 mx-1 h-5 w-px" aria-hidden />;
