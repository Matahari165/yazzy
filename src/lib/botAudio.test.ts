import { describe, expect, it } from "vitest";
import { botAudio, readSoundEnabled, writeSoundEnabled } from "./botAudio";

describe("botAudio", () => {
  it("reste optionnel lorsque les API du navigateur sont absentes", () => {
    expect(readSoundEnabled()).toBe(false);
    expect(() => writeSoundEnabled(false)).not.toThrow();
    expect(() => botAudio.startGame()).not.toThrow();
    expect(() => botAudio.startGame(true)).not.toThrow();
    expect(() => botAudio.playEffect("dice")).not.toThrow();
    expect(() => botAudio.playBotRollSequence(3)).not.toThrow();
    expect(() => botAudio.playDemonResult("win")).not.toThrow();
    expect(() => botAudio.stopMusic()).not.toThrow();
  });
});
