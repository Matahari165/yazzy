import { describe, expect, it } from "vitest";
import {
  createMultiplayerGame,
  freshPlayerState,
  requestRematch,
  rollPlayerDice,
  scoreActiveCategory,
  scoreCategory,
  setDuoSeries,
  startRematch,
  toggleHeldDie,
} from "./multiplayer";
import {
  applyPlayerAction,
  connectGuest,
  createHostedGame,
} from "./multiplayerHost";
import { parseClientActionValue } from "./protocol";
import { CATEGORY_IDS } from "./yatzy";

describe("règles multijoueur", () => {
  it("peut faire commencer l’un ou l’autre joueur", () => {
    expect(createMultiplayerGame("AMIS12", "player1").activePlayer).toBe("player1");
    expect(createMultiplayerGame("AMIS12", "player2").activePlayer).toBe("player2");
  });

  it("conserve exactement trois lancers et cinq dés", () => {
    let player = freshPlayerState();
    const values = [1, 2, 3, 4, 5, 6] as const;
    let cursor = 0;
    const rollDie = () => values[cursor++ % values.length];

    player = rollPlayerDice(player, rollDie);
    player = toggleHeldDie(player, 0);
    player = rollPlayerDice(player, rollDie);
    player = rollPlayerDice(player, rollDie);
    const afterThirdRoll = player;

    expect(player.dice).toHaveLength(5);
    expect(player.rollNumber).toBe(3);
    expect(player.dice[0]).toBe(1);
    expect(rollPlayerDice(player, rollDie)).toBe(afterThirdRoll);
  });

  it("ne passe pas le tour quand la case est déjà remplie", () => {
    const game = createMultiplayerGame("AMIS12", "player1");
    game.status = "playing";
    const player = freshPlayerState({ ones: 2 });
    player.dice = [1, 1, 2, 3, 4];
    player.rollNumber = 1;
    game.player1 = { playerId: "a", name: "Alice", connectionId: "a", state: player };
    game.player2 = { playerId: "b", name: "Bob", connectionId: "b", state: freshPlayerState() };

    expect(scoreCategory(player, "ones")).toBe(player);
    expect(scoreActiveCategory(game, "player1", "ones")).toBe(game);
    expect(game.activePlayer).toBe("player1");
  });

  it("attend l'accord des deux joueurs avant une revanche", () => {
    const game = createMultiplayerGame("AMIS12", "player1");
    game.status = "finished";
    game.player1 = { playerId: "a", name: "Alice", connectionId: "a", state: freshPlayerState({ ones: 5 }) };
    game.player2 = { playerId: "b", name: "Bob", connectionId: "b", state: freshPlayerState({ ones: 4 }) };

    const oneReady = requestRematch(game, "player1");
    expect(startRematch(oneReady)).toBe(oneReady);

    const bothReady = requestRematch(oneReady, "player2");
    const rematch = startRematch(bothReady, "player2");
    expect(rematch.status).toBe("playing");
    expect(rematch.activePlayer).toBe("player2");
    expect(rematch.player1?.state.scores).toEqual({});
    expect(rematch.player2?.state.scores).toEqual({});
    expect(rematch.rematchCount).toBe(1);
    expect(rematch.duelWins).toEqual({ player1: 0, player2: 0 });
  });

  it("démarre une série après une manche finie sans compter cette manche", () => {
    const game = createMultiplayerGame("AMIS12", "player1");
    game.status = "finished";
    game.player1 = { playerId: "a", name: "Alice", connectionId: "a", state: freshPlayerState({ ones: 5 }) };
    game.player2 = { playerId: "b", name: "Bob", connectionId: "b", state: freshPlayerState({ ones: 4 }) };
    const series = setDuoSeries(game, true);
    expect(series.series).toMatchObject({ enabled: true, wins: { player1: 0, player2: 0 }, winner: null });
    const rematch = startRematch(requestRematch(requestRematch(series, "player1"), "player2"), "player2");
    expect(rematch.rematchCount).toBe(1);
    expect(rematch.series.wins).toEqual({ player1: 0, player2: 0 });
  });

  it("ne permet de modifier le mode série que dans l'attente ou entre deux manches", () => {
    const game = createMultiplayerGame("AMIS12");
    const enabled = setDuoSeries(game, true);
    expect(enabled.series.enabled).toBe(true);
    expect(setDuoSeries({ ...enabled, status: "playing" }, false)).toEqual({ ...enabled, status: "playing" });
    expect(parseClientActionValue({ type: "SET_SERIES", enabled: true })).toEqual({ type: "SET_SERIES", enabled: true });
    expect(parseClientActionValue({ type: "SET_SERIES", enabled: "true" })).toBeNull();
  });

  it("attribue une victoire par manche complète et arrête la série à trois", () => {
    let series = setDuoSeries(createMultiplayerGame("AMIS12", "player1"), true).series;
    let duelWins = { player1: 0, player2: 0 };
    for (let win = 1; win <= 3; win += 1) {
      const game = createMultiplayerGame("AMIS12", "player1");
      game.status = "playing";
      game.series = series;
      game.duelWins = duelWins;
      game.turn = CATEGORY_IDS.length;
      const scores = Object.fromEntries(CATEGORY_IDS.slice(0, -1).map((category) => [category, 0]));
      game.player1 = { playerId: "a", name: "Alice", connectionId: "a", state: freshPlayerState({ ...scores }) };
      game.player2 = { playerId: "b", name: "Bob", connectionId: "b", state: freshPlayerState({ ...scores }) };
      game.player2.state.dice = [1, 1, 1, 1, 1];
      game.player2.state.rollNumber = 1;
      game.player2.state.scores.yatzy = 0;
      game.player1.state.dice = [6, 6, 6, 6, 6];
      game.player1.state.rollNumber = 1;
      const finished = scoreActiveCategory(game, "player1", "yatzy");
      expect(finished.status).toBe("finished");
      expect(finished.series.wins.player1).toBe(win);
      expect(finished.duelWins.player1).toBe(win);
      expect(finished.series.winner).toBe(win === 3 ? "player1" : null);
      expect(finished.series.bestMove).toEqual({ role: "player1", playerName: "Alice", category: "yatzy", points: 50 });
      if (win === 3) {
        expect(requestRematch(finished, "player1")).toBe(finished);
        expect(setDuoSeries(finished, true).series).toEqual({
          enabled: true, targetWins: 3, wins: { player1: 0, player2: 0 }, winner: null, bestMove: null,
        });
        expect(setDuoSeries(finished, true).duelWins).toEqual(finished.duelWins);
      }
      series = finished.series;
      duelWins = finished.duelWins;
    }
  });

  it("compte les victoires du duel hors série et les conserve aux revanches", () => {
    const game = createMultiplayerGame("AMIS12", "player1");
    game.status = "playing";
    const scores = Object.fromEntries(CATEGORY_IDS.slice(0, -1).map((category) => [category, 0]));
    game.player1 = { playerId: "a", name: "Alice", connectionId: "a", state: freshPlayerState({ ...scores }) };
    game.player2 = { playerId: "b", name: "Bob", connectionId: "b", state: freshPlayerState({ ...scores, yatzy: 0 }) };
    game.player1.state.dice = [6, 6, 6, 6, 6];
    game.player1.state.rollNumber = 1;
    const finished = scoreActiveCategory(game, "player1", "yatzy");
    expect(finished.duelWins).toEqual({ player1: 1, player2: 0 });
    expect(finished.series.enabled).toBe(false);
    const next = startRematch(requestRematch(requestRematch(finished, "player1"), "player2"));
    expect(next.duelWins).toEqual({ player1: 1, player2: 0 });
  });

  it("termine après les 14 cases de chaque joueur, sans tour supplémentaire", () => {
    const game = createMultiplayerGame("AMIS12", "player1");
    game.status = "playing";
    const completedScores = Object.fromEntries(
      CATEGORY_IDS.slice(0, -1).map((category) => [category, 0]),
    );
    const player1 = freshPlayerState(completedScores);
    const player2 = freshPlayerState(completedScores);
    player1.dice = [6, 6, 6, 6, 6];
    player1.rollNumber = 1;
    player2.dice = [5, 5, 5, 5, 5];
    player2.rollNumber = 1;
    game.player1 = { playerId: "a", name: "Alice", connectionId: "a", state: player1 };
    game.player2 = { playerId: "b", name: "Bob", connectionId: "b", state: player2 };
    game.turn = CATEGORY_IDS.length;

    const afterPlayer1 = scoreActiveCategory(game, "player1", "yatzy");
    afterPlayer1.player2!.state.dice = [5, 5, 5, 5, 5];
    afterPlayer1.player2!.state.rollNumber = 1;
    const finished = scoreActiveCategory(afterPlayer1, "player2", "yatzy");

    expect(finished.status).toBe("finished");
    expect(finished.turn).toBe(CATEGORY_IDS.length + 1);
    expect(Object.keys(finished.player1!.state.scores)).toHaveLength(CATEGORY_IDS.length);
    expect(Object.keys(finished.player2!.state.scores)).toHaveLength(CATEGORY_IDS.length);
  });
});

describe("protocole multijoueur", () => {
  it("refuse les catégories et indices inventés", () => {
    expect(parseClientActionValue({ type: "SCORE", category: "chance" })).toBeNull();
    expect(parseClientActionValue({ type: "HOLD", index: 5 })).toBeNull();
    expect(parseClientActionValue({ type: "HOLD", index: 1.5 })).toBeNull();
  });
});

describe("moteur de salon privé", () => {
  it("ouvre la partie au premier invité et conserve sa feuille de score", () => {
    const hosted = createHostedGame("AMIS12", "Alice", "player1");
    const connected = connectGuest(hosted, "Bob", "peer-a");
    const reconnected = connectGuest(connected, "Bobby", "peer-b");

    expect(connected.status).toBe("playing");
    expect(reconnected.player2?.connectionId).toBe("peer-b");
    expect(reconnected.player2?.name).toBe("Bobby");
    expect(reconnected.player2?.state).toEqual(connected.player2?.state);
  });

  it("valide les actions de l’invité dans le moteur de l’hôte", () => {
    let game = connectGuest(createHostedGame("AMIS12", "Alice", "player1"), "Bob", "peer-a");
    game = applyPlayerAction(game, "player1", { type: "ROLL" }, () => 6);
    game = applyPlayerAction(game, "player1", { type: "SCORE", category: "sixes" }, () => 1);

    expect(game.player1?.state.scores.sixes).toBe(30);
    expect(game.activePlayer).toBe("player2");

    const guestRoll = applyPlayerAction(game, "player2", { type: "ROLL" }, () => 4);
    expect(guestRoll.player2?.state.dice).toEqual([4, 4, 4, 4, 4]);
  });

});
