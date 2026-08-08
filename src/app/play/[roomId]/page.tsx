import { MultiplayerClient } from "./MultiplayerClient";

export default function PlayRoomPage({ params, searchParams }: { params: { roomId: string }, searchParams: { host?: string } }) {
  return <MultiplayerClient roomId={params.roomId} isHost={searchParams.host === "true"} />;
}
