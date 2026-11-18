"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const PLAYER_GIFS = [
  "Champions League Love GIF by Paris Saint-Germain.gif",
  "Champions League Win GIF by Manchester United.gif",
  "Happy Spanish GIF by TRT.gif",
  "Lionel Messi Football GIF by FC Barcelona.gif",
  "Manchester City Sport GIF by UEFA.gif",
  "World Cup Football GIF.gif",
];

function selectTwoGifs(): [string, string] {
  const shuffled = [...PLAYER_GIFS].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

export default function PlayerGifBackground() {
  const pathname = usePathname();
  const [pair, setPair] = useState<[string, string]>([PLAYER_GIFS[0], PLAYER_GIFS[1]]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setPair(selectTwoGifs());
    setActiveIndex(0);
  }, [pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current === 0 ? 1 : 0));
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="player-background pointer-events-none fixed inset-0 z-0 overflow-hidden bg-zinc-950" aria-hidden="true">
      {pair.map((fileName, index) => (
        <img
          key={`${pathname}-${fileName}`}
          src={`/${encodeURI(fileName)}`}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${activeIndex === index ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-zinc-50/72 dark:bg-zinc-950/82" />
    </div>
  );
}
