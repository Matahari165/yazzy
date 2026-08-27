"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createGame } from "@/domain/game";
import { writeStoredGame } from "@/lib/gameStorage";

export function BotGameLauncher() {
  const router = useRouter();

  useEffect(() => {
    writeStoredGame(createGame("expert"));
    router.replace("/game");
  }, [router]);

  return null;
}
