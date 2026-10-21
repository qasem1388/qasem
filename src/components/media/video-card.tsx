"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

/**
 * Click-to-load video: no third-party iframe (or cookies) until the visitor
 * presses play. Items without a YouTube id link to the company channel.
 */
export function VideoCard({
  title,
  poster,
  youtubeId,
  duration,
  channelUrl,
  labels,
}: {
  title: string;
  poster: string;
  youtubeId?: string;
  duration: string;
  channelUrl?: string;
  labels: { play: string; watchOnChannel: string };
}) {
  const [playing, setPlaying] = useState(false);

  const media =
    playing && youtubeId ? (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full"
      />
    ) : (
      <>
        <Image
          src={poster}
          alt=""
          width={800}
          height={450}
          className="aspect-video h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="bg-primary/40 group-hover:bg-primary/25 absolute inset-0 transition-colors" aria-hidden />
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="text-primary inline-flex size-16 items-center justify-center rounded-full bg-white/95 shadow-xl transition-transform group-hover:scale-110">
            <Play className="size-7 fill-current ltr:translate-x-0.5" />
          </span>
        </span>
        <span className="absolute bottom-3 rounded bg-black/70 px-2 py-0.5 text-xs text-white ltr:right-3 rtl:left-3" dir="ltr">
          {duration}
        </span>
      </>
    );

  return (
    <article className="rounded-brand-lg border-primary/8 overflow-hidden border bg-white">
      {youtubeId && !playing ? (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group relative block w-full overflow-hidden"
          aria-label={`${labels.play}: ${title}`}
        >
          {media}
        </button>
      ) : youtubeId ? (
        <div className="relative">{media}</div>
      ) : (
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block overflow-hidden"
          aria-label={`${labels.watchOnChannel}: ${title}`}
        >
          {media}
        </a>
      )}
      <h3 className="text-primary p-5 font-bold">{title}</h3>
    </article>
  );
}
