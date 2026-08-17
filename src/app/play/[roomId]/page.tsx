import { notFound } from "next/navigation";
import { isRoomCode, normalizeRoomCode } from "@/domain/roomCode";
import { MultiplayerClient } from "./MultiplayerClient";

export default async function PlayRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId: rawRoomId } = await params;
  const roomId = normalizeRoomCode(rawRoomId);

  if (!isRoomCode(roomId)) {
    notFound();
  }

  return <MultiplayerClient roomId={roomId} />;
}
