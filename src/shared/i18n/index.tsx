import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ar, type Dictionary } from "./ar";
import { en } from "./en";

export type Lang = "ar" | "en";

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
/** All dot-separated leaf paths of the dictionary, e.g. `nav.dashboard`. */
export type TKey<T = Dictionary> = {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, TKey<T[K]>>;
}[keyof T & string];

export type Params = Record<string, string | number>;
export type TFunction = (key: TKey, params?: Params) => string;

const dictionaries: Record<Lang, unknown> = { ar, en };
const STORAGE_KEY = "hesabati.lang";

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/** Translate with Arabic fallback; unknown keys return the key itself. */
export function translate(lang: Lang, key: string, params?: Params): string {
  const text = lookup(dictionaries[lang], key) ?? lookup(ar, key) ?? key;
  return interpolate(text, params);
}

interface I18nValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: TFunction;
  /** Untyped variant for dynamic keys (error codes, enum values). */
  tx: (key: string, params?: Params) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function initialLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "ar" || v === "en") return v;
  } catch {
    /* storage unavailable */
  }
  return "ar";
}

export function I18nProvider({ children, lang: forced }: { children: ReactNode; lang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(forced ?? initialLang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      dir,
      setLang,
      t: (key, params) => translate(lang, key, params),
      tx: (key, params) => translate(lang, key, params),
    }),
    [lang, dir, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
