import type * as Party from "partykit/server";
import {
  createMultiplayerGame,
  holdActiveDie,
  requestRematch,
  rollActivePlayer,
  scoreActiveCategory,
  startRematch,
  freshPlayerState,
  type MultiplayerGameState,
} from "../domain/multiplayer";
import {
  parseClientAction,
  serializeServerMessage,
  type ServerMessage,
} from "../domain/protocol";
import { rollFairDie } from "../lib/random";

export default class YazzyServer implements Party.Server {
  static options = { hibernate: true };
  private game!: MultiplayerGameState;

  constructor(public room: Party.Room) {}

  async onStart() {
    const saved = await this.room.storage.get<MultiplayerGameState>("game");
    if (saved) {
      this.game = { ...saved, rematchReady: saved.rematchReady ?? [] };
    } else {
      this.game = createMultiplayerGame(this.room.id);
    }
  }

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const playerId = new URL(ctx.request.url).searchParams.get("playerId");
    if (!playerId || !/^[a-f0-9-]{16,64}$/i.test(playerId)) {
      conn.send(serializeServerMessage({ type: "ERROR", message: "Identité de joueur invalide." }));
      conn.close(4001, "Invalid player id");
      return;
    }
    let role: "player1" | "player2" | null = null;

    if (this.game.player1?.playerId === playerId) {
      role = "player1";
      if (this.game.player1.connectionId && this.room.getConnection(this.game.player1.connectionId)) {
        conn.send(serializeServerMessage({ type: "ERROR", message: "Cette place est déjà utilisée dans un autre onglet." }));
        conn.close(4002, "Player already connected");
        return;
      }
      this.game.player1.connectionId = conn.id;
    } else if (this.game.player2?.playerId === playerId) {
      role = "player2";
      if (this.game.player2.connectionId && this.room.getConnection(this.game.player2.connectionId)) {
        conn.send(serializeServerMessage({ type: "ERROR", message: "Cette place est déjà utilisée dans un autre onglet." }));
        conn.close(4002, "Player already connected");
        return;
      }
      this.game.player2.connectionId = conn.id;
    } else if (!this.game.player1) {
      role = "player1";
      this.game.player1 = {
        playerId,
        connectionId: conn.id,
        state: freshPlayerState(),
      };
    } else if (!this.game.player2) {
      role = "player2";
      this.game.player2 = {
        playerId,
        connectionId: conn.id,
        state: freshPlayerState(),
      };
    }

    if (!role) {
      conn.send(serializeServerMessage({ type: "ROOM_FULL" }));
      conn.close();
      return;
    }

    if (this.game.player1 && this.game.player2 && this.game.status === "waiting") {
      this.game.status = "playing";
    }

    await this.persist();

  }

  async onClose(conn: Party.Connection) {
    let disconnectedRole: "player1" | "player2" | null = null;

    if (this.game.player1?.connectionId === conn.id) {
      this.game.player1.connectionId = null;
      disconnectedRole = "player1";
    } else if (this.game.player2?.connectionId === conn.id) {
      this.game.player2.connectionId = null;
      disconnectedRole = "player2";
    }

    if (disconnectedRole) {
      await this.persist();
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    const action = parseClientAction(message);
    if (!action) return;

    let role: "player1" | "player2" | null = null;
    if (this.game.player1?.connectionId === sender.id) {
      role = "player1";
    } else if (this.game.player2?.connectionId === sender.id) {
      role = "player2";
    }

    if (!role) return;

    if (action.type === "REMATCH") {
      const requested = requestRematch(this.game, role);
      if (requested !== this.game) {
        this.game = startRematch(requested);
        await this.persist();
      }
      return;
    }

    const previous = this.game;

    if (action.type === "ROLL") {
      this.game = rollActivePlayer(this.game, role, rollFairDie);
    } else if (action.type === "HOLD") {
      this.game = holdActiveDie(this.game, role, action.index);
    } else if (action.type === "SCORE") {
      this.game = scoreActiveCategory(this.game, role, action.category);
    }

    if (this.game === previous) return;

    await this.persist();
  }

  private async persist() {
    await this.room.storage.put("game", this.game);
    this.broadcastState();
  }

  private broadcastState() {
    if (this.game.player1?.connectionId) {
      this.sendToPlayer("player1", {
        type: "GAME_STATE",
        state: this.game,
        yourRole: "player1",
      });
    }
    if (this.game.player2?.connectionId) {
      this.sendToPlayer("player2", {
        type: "GAME_STATE",
        state: this.game,
        yourRole: "player2",
      });
    }
  }

  private sendToPlayer(role: "player1" | "player2", message: ServerMessage) {
    const connectionId = this.game[role]?.connectionId;
    if (connectionId) {
      const conn = this.room.getConnection(connectionId);
      if (conn) {
        conn.send(serializeServerMessage(message));
      }
    }
  }
}
