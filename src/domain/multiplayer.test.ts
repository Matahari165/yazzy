import { describe, expect, it } from "vitest";
import {
  createMultiplayerGame,
  freshPlayerState,
  requestRematch,
  rollPlayerDice,
  scoreActiveCategory,
  scoreCategory,
  startRematch,
  toggleHeldDie,
} from "./multiplayer";
import { parseClientAction } from "./protocol";
import { CATEGORY_IDS } from "./yatzy";

describe("règles multijoueur", () => {
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
    const game = createMultiplayerGame("AMIS12");
    game.status = "playing";
    const player = freshPlayerState({ ones: 2 });
    player.dice = [1, 1, 2, 3, 4];
    player.rollNumber = 1;
    game.player1 = { playerId: "a", connectionId: "a", state: player };
    game.player2 = { playerId: "b", connectionId: "b", state: freshPlayerState() };

    expect(scoreCategory(player, "ones")).toBe(player);
    expect(scoreActiveCategory(game, "player1", "ones")).toBe(game);
    expect(game.activePlayer).toBe("player1");
  });

  it("attend l'accord des deux joueurs avant une revanche", () => {
    const game = createMultiplayerGame("AMIS12");
    game.status = "finished";
    game.player1 = { playerId: "a", connectionId: "a", state: freshPlayerState({ ones: 5 }) };
    game.player2 = { playerId: "b", connectionId: "b", state: freshPlayerState({ ones: 4 }) };

    const oneReady = requestRematch(game, "player1");
    expect(startRematch(oneReady)).toBe(oneReady);

    const bothReady = requestRematch(oneReady, "player2");
    const rematch = startRematch(bothReady);
    expect(rematch.status).toBe("playing");
    expect(rematch.player1?.state.scores).toEqual({});
    expect(rematch.player2?.state.scores).toEqual({});
  });

  it("termine après les 14 cases de chaque joueur, sans tour supplémentaire", () => {
    const game = createMultiplayerGame("AMIS12");
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
    game.player1 = { playerId: "a", connectionId: "a", state: player1 };
    game.player2 = { playerId: "b", connectionId: "b", state: player2 };
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
    expect(parseClientAction('{"type":"SCORE","category":"chance"}')).toBeNull();
    expect(parseClientAction('{"type":"HOLD","index":5}')).toBeNull();
    expect(parseClientAction('{"type":"HOLD","index":1.5}')).toBeNull();
  });
});
