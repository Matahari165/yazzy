export type MultiplayerPollLoop = {
  start(delay?: number): void;
  request(delay?: number): void;
  visibilityChanged(isVisible: boolean): void;
  online(): void;
  stop(): void;
};

type MultiplayerPollLoopOptions = {
  poll: () => Promise<number | null | undefined>;
  getDelay: () => number;
  isOnline: () => boolean;
  isVisible: () => boolean;
  jitter?: (delay: number) => number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
};

/**
 * Keeps room sync on one timer and one in-flight request. Calls made while a
 * sync is in flight are coalesced into a single follow-up request.
 */
export function createMultiplayerPollLoop({
  poll,
  getDelay,
  isOnline,
  isVisible,
  jitter = (delay) => delay,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}: MultiplayerPollLoopOptions): MultiplayerPollLoop {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let pendingDelay: number | null = null;
  let stopped = false;
  let started = false;

  const clearScheduledTimer = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  const schedule = (delay: number, replacePending = false) => {
    if (stopped || !started) return;
    clearScheduledTimer();

    if (!isOnline()) {
      pendingDelay = null;
      return;
    }

    if (inFlight) {
      if (replacePending || pendingDelay === null) pendingDelay = delay;
      else pendingDelay = Math.min(pendingDelay, delay);
      return;
    }

    timer = setTimer(() => {
      timer = null;
      void runPoll();
    }, Math.max(0, jitter(delay)));
  };

  const runPoll = async () => {
    if (stopped || !started || !isOnline()) return;
    if (inFlight) {
      pendingDelay = pendingDelay === null ? 0 : Math.min(pendingDelay, 0);
      return;
    }

    inFlight = true;
    let nextDelay: number | null | undefined;
    try {
      nextDelay = await poll();
    } catch {
      // A transport failure is handled by the caller's normal retry cadence.
    } finally {
      inFlight = false;
    }

    if (stopped) return;
    if (nextDelay === null) {
      stopped = true;
      pendingDelay = null;
      clearScheduledTimer();
      return;
    }

    const requestedDelay = pendingDelay;
    pendingDelay = null;
    const baseDelay = nextDelay ?? getDelay();
    const nextPollDelay = isVisible() && requestedDelay !== null
      ? Math.min(baseDelay, requestedDelay)
      : isVisible()
        ? baseDelay
        : getDelay();
    schedule(nextPollDelay);
  };

  return {
    start(delay) {
      if (stopped) return;
      started = true;
      schedule(delay ?? getDelay());
    },
    request(delay) {
      if (!started) return;
      schedule(delay ?? getDelay());
    },
    visibilityChanged(isVisible) {
      if (!started) return;
      if (isVisible) schedule(0);
      else schedule(getDelay(), true);
    },
    online() {
      if (!started) return;
      schedule(0);
    },
    stop() {
      stopped = true;
      pendingDelay = null;
      clearScheduledTimer();
    },
  };
}
