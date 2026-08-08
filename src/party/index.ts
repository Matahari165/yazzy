import type * as Party from "partykit/server";

export default class YazzyParty implements Party.Server {
  gameState: any = null;

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    if (this.gameState) {
      conn.send(JSON.stringify(this.gameState));
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      this.gameState = JSON.parse(message);
    } catch (e) {}

    this.room.broadcast(message, [sender.id]);
  }
}
