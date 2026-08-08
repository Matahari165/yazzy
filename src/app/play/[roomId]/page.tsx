import { MultiplayerClient } from "./MultiplayerClient";

export default function PlayRoomPage({ params }: { params: { roomId: string } }) {
  return <MultiplayerClient roomId={params.roomId} />;
}
