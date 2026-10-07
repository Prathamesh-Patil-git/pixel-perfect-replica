export type Policy = "FIFO" | "LRU" | "OPT" | "ADAPTIVE";
export const POLICIES: Policy[] = ["FIFO", "LRU", "OPT", "ADAPTIVE"];
export const POLICY_LABEL: Record<Policy, string> = {
  FIFO: "FIFO",
  LRU: "LRU",
  OPT: "Optimal",
  ADAPTIVE: "Adaptive",
};

export interface Step {
  index: number;
  page: number;
  hit: boolean;
  frames: (number | null)[];
  slot: number;
  replaced: number | null;
  decision: string;
}

export interface SimResult {
  policy: Policy;
  frames: number;
  refs: number[];
  steps: Step[];
  faults: number;
  hits: number;
  hitRatio: number;
  faultRate: number;
  timeMs: number;
  chosen?: "FIFO" | "LRU";
  adaptiveNote?: string;
}

type Victim = (ctx: {
  frames: (number | null)[];
  i: number;
  refs: number[];
  loadedAt: Map<number, number>;
  lastUsed: Map<number, number>;
}) => { slot: number; why: string };

const fifoVictim: Victim = ({ frames, loadedAt }) => {
  let slot = 0;
  for (let s = 1; s < frames.length; s++)
    if (loadedAt.get(frames[s]!)! < loadedAt.get(frames[slot]!)!) slot = s;
  return { slot, why: `page ${frames[slot]} was loaded earliest` };
};

const lruVictim: Victim = ({ frames, lastUsed }) => {
  let slot = 0;
  for (let s = 1; s < frames.length; s++)
    if (lastUsed.get(frames[s]!)! < lastUsed.get(frames[slot]!)!) slot = s;
  return { slot, why: `page ${frames[slot]} was least recently used` };
};

const optVictim: Victim = ({ frames, i, refs }) => {
  let slot = 0;
  let far = -1;
  for (let s = 0; s < frames.length; s++) {
    const next = refs.indexOf(frames[s]!, i + 1);
    const d = next === -1 ? Infinity : next;
    if (d > far) {
      far = d;
      slot = s;
    }
  }
  return {
    slot,
    why:
      far === Infinity
        ? `page ${frames[slot]} is never used again`
        : `page ${frames[slot]} is used furthest in the future (at step ${far + 1})`,
  };
};

function run(refs: number[], n: number, victim: Victim, policy: Policy): SimResult {
  const t0 = performance.now();
  const frames: (number | null)[] = Array(n).fill(null);
  const loadedAt = new Map<number, number>();
  const lastUsed = new Map<number, number>();
  const steps: Step[] = [];
  let faults = 0;
  refs.forEach((page, i) => {
    const at = frames.indexOf(page);
    if (at !== -1) {
      lastUsed.set(page, i);
      steps.push({ index: i, page, hit: true, frames: [...frames], slot: at, replaced: null, decision: `Hit: page ${page} already in frame ${at + 1}` });
      return;
    }
    faults++;
    const empty = frames.indexOf(null);
    let slot: number;
    let replaced: number | null = null;
    let decision: string;
    if (empty !== -1) {
      slot = empty;
      decision = `Fault: loaded page ${page} into empty frame ${slot + 1}`;
    } else {
      const v = victim({ frames, i, refs, loadedAt, lastUsed });
      slot = v.slot;
      replaced = frames[slot] ?? null;
      loadedAt.delete(replaced!);
      lastUsed.delete(replaced!);
      decision = `Fault: replaced page ${replaced} because ${v.why}`;
    }
    frames[slot] = page;
    loadedAt.set(page, i);
    lastUsed.set(page, i);
    steps.push({ index: i, page, hit: false, frames: [...frames], slot, replaced, decision });
  });
  const hits = refs.length - faults;
  return {
    policy,
    frames: n,
    refs,
    steps,
    faults,
    hits,
    hitRatio: refs.length ? hits / refs.length : 0,
    faultRate: refs.length ? faults / refs.length : 0,
    timeMs: performance.now() - t0,
  };
}

export const fifo = (r: number[], n: number) => run(r, n, fifoVictim, "FIFO");
export const lru = (r: number[], n: number) => run(r, n, lruVictim, "LRU");
export const optimal = (r: number[], n: number) => run(r, n, optVictim, "OPT");

export function simulate(policy: Policy, refs: number[], n: number, adaptive?: (r: number[], n: number) => SimResult): SimResult {
  if (policy === "FIFO") return fifo(refs, n);
  if (policy === "LRU") return lru(refs, n);
  if (policy === "OPT") return optimal(refs, n);
  return adaptive!(refs, n);
}
