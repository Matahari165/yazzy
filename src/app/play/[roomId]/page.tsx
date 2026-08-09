import { MultiplayerClient } from "./MultiplayerClient";

export default async function PlayRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <MultiplayerClient roomId={roomId} />;
}
