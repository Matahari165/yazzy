import type * as Party from "partykit/server";
import {
  createMultiplayerGame,
  rollPlayerDice,
  toggleHeldDie,
  scoreCategory,
  isGameFinished,
  switchTurn,
  freshPlayerState,
  type MultiplayerGameState,
} from "../domain/multiplayer";
import {
  parseClientAction,
  serializeServerMessage,
  type ServerMessage,
} from "../domain/protocol";
import type { DieValue } from "../domain/yatzy";

export default class YazzyServer implements Party.Server {
  static options = { hibernate: true };
  private game!: MultiplayerGameState;

  constructor(public room: Party.Room) {}

  async onStart() {
    const saved = await this.room.storage.get<MultiplayerGameState>("game");
    if (saved) {
      this.game = saved;
    } else {
      this.game = createMultiplayerGame(this.room.id);
    }
  }

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const playerId = conn.id;
    let role: "player1" | "player2" | null = null;

    if (this.game.player1?.playerId === playerId) {
      role = "player1";
      this.game.player1.connectionId = conn.id;
    } else if (this.game.player2?.playerId === playerId) {
      role = "player2";
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

    const otherRole = role === "player1" ? "player2" : "player1";
    this.sendToPlayer(otherRole, { type: "OPPONENT_CONNECTED" });
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
      const otherRole = disconnectedRole === "player1" ? "player2" : "player1";
      this.sendToPlayer(otherRole, { type: "OPPONENT_DISCONNECTED" });
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
      if (this.game.status === "finished") {
        const player1Id = this.game.player1!.playerId;
        const player1Conn = this.game.player1!.connectionId;
        const player2Id = this.game.player2!.playerId;
        const player2Conn = this.game.player2!.connectionId;

        this.game = createMultiplayerGame(this.room.id);
        this.game.status = "playing";
        this.game.player1 = {
          playerId: player1Id,
          connectionId: player1Conn,
          state: freshPlayerState(),
        };
        this.game.player2 = {
          playerId: player2Id,
          connectionId: player2Conn,
          state: freshPlayerState(),
        };
        await this.persist();
      }
      return;
    }

    if (this.game.activePlayer !== role || this.game.status !== "playing") {
      return;
    }

    const player = this.game[role]!;

    if (action.type === "ROLL") {
      player.state = rollPlayerDice(
        player.state,
        () => (Math.floor(Math.random() * 6) + 1) as DieValue
      );
    } else if (action.type === "HOLD") {
      player.state = toggleHeldDie(player.state, action.index);
    } else if (action.type === "SCORE") {
      player.state = scoreCategory(player.state, action.category);
      this.game = switchTurn(this.game);
      const nextRole = this.game.activePlayer;
      const nextPlayer = this.game[nextRole]!;
      nextPlayer.state = freshPlayerState(nextPlayer.state.scores);

      if (isGameFinished(this.game)) {
        this.game.status = "finished";
      }
    }

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
