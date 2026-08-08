import { MultiplayerClient } from "./MultiplayerClient";

export default async function PlayRoomPage({ params, searchParams }: { params: Promise<{ roomId: string }>, searchParams: Promise<{ host?: string }> }) {
  const { roomId } = await params;
  const { host } = await searchParams;
  return <MultiplayerClient roomId={roomId} isHost={host === "true"} />;
}
