import { isRoomCode, normalizeRoomCode } from "@/domain/roomCode";
import { parseRoomCommand } from "@/domain/multiplayerRoomProtocol";
import { rollFairDie } from "@/lib/random";
import { handleRoomCommand } from "@/server/multiplayerRoomService";
import { multiplayerRoomStore } from "@/server/multiplayerRoomStore";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
};
const MAX_REQUEST_BODY_BYTES = 16 * 1024;

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

  const contentLength = request.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_REQUEST_BODY_BYTES)) {
    return Response.json(
      { ok: false, code: "INVALID_REQUEST", message: "Requête de partie trop volumineuse." },
      { status: 413, headers: responseHeaders },
    );
  }

  let command;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BODY_BYTES) {
      return Response.json(
        { ok: false, code: "INVALID_REQUEST", message: "Requête de partie trop volumineuse." },
        { status: 413, headers: responseHeaders },
      );
    }
    command = parseRoomCommand(JSON.parse(body));
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
