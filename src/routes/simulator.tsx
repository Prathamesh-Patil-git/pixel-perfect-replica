import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Cpu, SlidersHorizontal, MonitorPlay, Table2, AlertTriangle, CheckCircle2, Target, Percent, ListOrdered, Timer, Check } from "lucide-react";
import { PageHeader, Panel, Stat, Btn, pct, inputCls } from "@/components/ui-kit";
import { useSim } from "@/lib/sim/store";
import { POLICIES, POLICY_LABEL, type Policy, type SimResult } from "@/lib/sim/algorithms";
import { simulate } from "@/lib/sim/workload";
import { parseRefs, validateFrames } from "@/lib/sim/validation";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Simulator — Page Replacement Simulator" },
      { name: "description", content: "Step through FIFO, LRU, Optimal and adaptive page replacement frame by frame." },
      { property: "og:title", content: "Simulator — Page Replacement Simulator" },
      { property: "og:description", content: "Step through FIFO, LRU, Optimal and adaptive page replacement frame by frame." },
    ],
  }),
  component: SimulatorPage,
});

const PAGE = 50;

function SimulatorPage() {
  const s = useSim();
  const [policy, setPolicy] = useState<Policy>("LRU");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [tablePage, setTablePage] = useState(0);

  const result: SimResult | undefined = s.last[view] ?? s.last[0];
  const steps = result?.steps ?? [];
  const cur = steps[step];

  useEffect(() => {
    if (!playing) return;
    if (step >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((x) => x + 1), speed);
    return () => clearTimeout(t);
  }, [playing, step, steps.length, speed]);

  const run = (all: boolean) => {
    const p = parseRefs(s.refText);
    const fe = validateFrames(s.frames);
    if (!p.ok) return setError(p.error);
    if (fe) return setError(fe);
    setError(null);
    const list = all ? POLICIES : [policy];
    s.setLast(list.map((x) => simulate(x, p.refs, s.frames)));
    setView(0);
    setStep(0);
    setTablePage(0);
    setPlaying(false);
  };

  const reset = () => {
    s.setLast([]);
    setStep(0);
    setPlaying(false);
    setError(null);
  };

  const rows = useMemo(() => steps.slice(tablePage * PAGE, tablePage * PAGE + PAGE), [steps, tablePage]);
  const pages = Math.ceil(steps.length / PAGE);

  return (
    <>
      <PageHeader eyebrow="Step-by-step" icon={Cpu} title="Simulator" description="Enter a reference string, choose frames and a policy, then replay every decision." />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Panel title="Input" subtitle="Configure your run" icon={SlidersHorizontal} className="h-fit lg:sticky lg:top-6">
          <label className="mb-1 block text-sm font-medium">Reference string</label>
          <textarea rows={4} className={`${inputCls} font-mono`} value={s.refText} onChange={(e) => { s.setRefText(e.target.value); s.setWorkloadName("Manual"); }} placeholder="e.g. 7 0 1 2 0 3" />
          <p className="mb-4 mt-1 text-xs text-muted-foreground">Separate pages with spaces, commas or tabs.</p>
          <label className="mb-1 block text-sm font-medium">Frames</label>
          <input type="number" min={1} max={20} className={`${inputCls} mb-4 font-mono`} value={s.frames} onChange={(e) => s.setFrames(Number(e.target.value))} />
          <label className="mb-1 block text-sm font-medium">Algorithm</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {POLICIES.map((p) => (
              <button key={p} onClick={() => setPolicy(p)} className={`relative rounded-xl border-2 p-3 text-left transition-colors ${policy === p ? "border-primary bg-secondary" : "border-border bg-card hover:bg-muted"}`}>
                {policy === p && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
                <div className="text-sm font-semibold">{POLICY_LABEL[p]}</div>
                <div className="text-[11px] text-muted-foreground">{{ FIFO: "Oldest out", LRU: "Least recent out", OPT: "Future-aware", ADAPTIVE: "Auto-select" }[p]}</div>
              </button>
            ))}
          </div>
          {error && <div role="alert" className="mb-4 rounded-lg bg-fault-soft p-3 text-sm text-destructive">{error}</div>}
          <div className="flex flex-col gap-2">
            <Btn variant="primary" onClick={() => run(false)}>Run selected</Btn>
            <Btn onClick={() => run(true)}>Run comparison</Btn>
            <Btn variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" />Reset</Btn>
          </div>
        </Panel>

        <div className="min-w-0 space-y-6">
          {!result ? (
            <Panel title="Playback" icon={MonitorPlay}><p className="py-10 text-center text-muted-foreground">Run a simulation to see frames, decisions and metrics.</p></Panel>
          ) : (
            <>
              {s.last.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {s.last.map((r, i) => (
                    <button key={r.policy} onClick={() => { setView(i); setStep(0); setPlaying(false); }} className={`${view === i ? "clay-btn-primary" : "clay-btn"} px-3 py-1.5 text-sm`}>
                      {POLICY_LABEL[r.policy]} · {r.faults} faults
                    </button>
                  ))}
                </div>
              )}
              <Panel icon={MonitorPlay} title={POLICY_LABEL[result.policy]} subtitle={`Step ${step + 1} of ${steps.length}`} action={<div className="flex gap-3 text-xs"><span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-success bg-success-soft" />Hit</span><span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-destructive bg-fault-soft" />Fault</span></div>}>
                {result.adaptiveNote && <p className="mb-3 rounded-lg bg-accent p-3 text-sm text-accent-foreground">{result.adaptiveNote}</p>}
                {cur && (
                  <>
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Page</span>
                      <span className="font-mono text-3xl font-bold">{cur.page}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cur.hit ? "bg-success-soft text-success" : "bg-fault-soft text-destructive"}`}>{cur.hit ? "HIT" : "FAULT"}</span>
                    </div>
                    <div className="mb-4 flex flex-wrap gap-3">
                      {cur.frames.map((f, i) => {
                        const active = i === cur.slot;
                        const tone = active ? (cur.hit ? "border-success bg-success-soft" : "border-destructive bg-fault-soft") : "border-border bg-muted";
                        return (
                          <div key={i} className={`flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 ${tone} transition-colors`}>
                            <span className="text-[10px] uppercase text-muted-foreground">F{i + 1}</span>
                            <span className="font-mono text-2xl font-semibold">{f ?? "–"}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mb-4 rounded-xl border border-border bg-muted/50 p-3 text-sm">{cur.decision}</p>
                  </>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Btn aria-label="Step back" onClick={() => setStep((x) => Math.max(0, x - 1))}><SkipBack className="h-4 w-4" /></Btn>
                  <Btn variant="primary" aria-label={playing ? "Pause" : "Play"} onClick={() => { if (step >= steps.length - 1) setStep(0); setPlaying(!playing); }}>
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Btn>
                  <Btn aria-label="Step forward" onClick={() => setStep((x) => Math.min(steps.length - 1, x + 1))}><SkipForward className="h-4 w-4" /></Btn>
                  <select className="clay-btn px-2 py-2 text-sm" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Speed">
                    <option value={1200}>0.5×</option>
                    <option value={600}>1×</option>
                    <option value={250}>2×</option>
                    <option value={80}>4×</option>
                  </select>
                  <input type="range" className="flex-1 accent-primary" min={0} max={Math.max(0, steps.length - 1)} value={step} onChange={(e) => setStep(Number(e.target.value))} aria-label="Scrub" />
                </div>
              </Panel>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <Stat icon={AlertTriangle} tone="danger" label="Page faults" value={result.faults} />
                <Stat icon={CheckCircle2} tone="success" label="Hits" value={result.hits} />
                <Stat icon={Target} tone="accent" label="Hit ratio" value={pct(result.hitRatio)} />
                <Stat icon={Percent} tone="warning" label="Fault rate" value={pct(result.faultRate)} />
                <Stat icon={ListOrdered} label="References" value={result.refs.length} />
                <Stat icon={Timer} label="Execution time" value={`${result.timeMs.toFixed(2)} ms`} />
              </div>

              <Panel title="Step-by-step table" subtitle="Click a row to jump to it" icon={Table2}>
                {steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Step details were not saved for this large run. Run it again to view them.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full font-mono text-sm">
                        <thead className="text-left text-xs uppercase text-muted-foreground">
                          <tr><th className="p-2">#</th><th className="p-2">Page</th><th className="p-2">Frames</th><th className="p-2">Result</th><th className="p-2">Replaced</th></tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.index} onClick={() => setStep(r.index)} className={`cursor-pointer border-t border-border ${r.index === step ? "bg-secondary" : "hover:bg-muted"}`}>
                              <td className="p-2">{r.index + 1}</td>
                              <td className="p-2">{r.page}</td>
                              <td className="p-2">[{r.frames.map((f) => f ?? "-").join(", ")}]</td>
                              <td className={`p-2 font-semibold ${r.hit ? "text-success" : "text-destructive"}`}>{r.hit ? "Hit" : "Fault"}</td>
                              <td className="p-2">{r.replaced ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {pages > 1 && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <Btn disabled={tablePage === 0} onClick={() => setTablePage(tablePage - 1)}>Prev</Btn>
                        <span>Page {tablePage + 1} / {pages}</span>
                        <Btn disabled={tablePage >= pages - 1} onClick={() => setTablePage(tablePage + 1)}>Next</Btn>
                      </div>
                    )}
                  </>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </>
  );
}
