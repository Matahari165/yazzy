import { isRoomCode, normalizeRoomCode } from "@/domain/roomCode";
import { parseRoomCommand } from "@/domain/multiplayerRoomProtocol";
import { rollFairDie } from "@/lib/random";
import { handleRoomCommand } from "@/server/multiplayerRoomService";
import { multiplayerRoomStore } from "@/server/multiplayerRoomStore";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId: rawRoomId } = await params;
  const roomId = normalizeRoomCode(rawRoomId);

  if (!isRoomCode(roomId)) {
    return Response.json(
      { ok: false, code: "INVALID_REQUEST", message: "Code de partie invalide." },
      { status: 400, headers: responseHeaders },
    );
  }

  let command;
  try {
    command = parseRoomCommand(await request.json());
  } catch {
    command = null;
  }

  if (!command) {
    return Response.json(
      { ok: false, code: "INVALID_REQUEST", message: "Requête de partie invalide." },
      { status: 400, headers: responseHeaders },
    );
  }

  try {
    const result = await handleRoomCommand({
      roomId,
      command,
      store: multiplayerRoomStore,
      now: Date.now(),
      rollDie: rollFairDie,
    });
    return Response.json(result.body, {
      status: result.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[yazzy-room] temporary room failure", {
      roomId,
      command: command.type,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      {
        ok: false,
        code: "SERVICE_UNAVAILABLE",
        message: "La partie est temporairement indisponible. Réessaie dans un instant.",
      },
      { status: 503, headers: responseHeaders },
    );
  }
}
