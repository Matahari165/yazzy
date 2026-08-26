import { notFound } from "next/navigation";
import { isRoomCode, normalizeRoomCode } from "@/domain/roomCode";
import { MultiplayerClient } from "./MultiplayerClient";

type PlayRoomPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ host?: string | string[] }>;
};

export default async function PlayRoomPage({ params, searchParams }: PlayRoomPageProps) {
  const [{ roomId: rawRoomId }, query] = await Promise.all([params, searchParams]);
  const roomId = normalizeRoomCode(rawRoomId);

  if (!isRoomCode(roomId)) {
    notFound();
  }

  return (
    <MultiplayerClient
      roomId={roomId}
      isHost={query.host === "1"}
    />
  );
}
