import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, Panel, Btn, pct } from "@/components/ui-kit";
import { SimpleBar } from "@/components/Charts";
import { useSim } from "@/lib/sim/store";
import { POLICIES, POLICY_LABEL } from "@/lib/sim/algorithms";
import { simulate, analyze, classify } from "@/lib/sim/workload";
import { parseRefs } from "@/lib/sim/validation";

export const Route = createFileRoute("/comparison")({
  head: () => ({
    meta: [
      { title: "Algorithm Comparison — Page Replacement Simulator" },
      { name: "description", content: "Compare page faults, hit ratio and speed of FIFO, LRU, Optimal and adaptive policies." },
      { property: "og:title", content: "Algorithm Comparison — Page Replacement Simulator" },
      { property: "og:description", content: "Compare page faults, hit ratio and speed of FIFO, LRU, Optimal and adaptive policies." },
    ],
  }),
  component: Comparison,
});

function Comparison() {
  const s = useSim();
  const parsed = parseRefs(s.refText);
  const results = useMemo(() => (parsed.ok ? POLICIES.map((p) => simulate(p, parsed.refs, s.frames)) : []), [s.refText, s.frames]);
  if (!parsed.ok || !results.length)
    return (
      <>
        <PageHeader title="Algorithm Comparison" description="All four policies on the current reference string." />
        <Panel><p className="mb-3 text-muted-foreground">The current reference string is invalid: {!parsed.ok && parsed.error}</p><Link to="/simulator"><Btn>Fix in Simulator</Btn></Link></Panel>
      </>
    );
  const practical = results.filter((r) => r.policy !== "OPT");
  const best = practical.reduce((a, b) => (b.faults < a.faults ? b : a));
  const opt = results.find((r) => r.policy === "OPT")!;
  const c = classify(analyze(parsed.refs, s.frames));
  const data = results.map((r) => ({ name: POLICY_LABEL[r.policy], faults: r.faults, hit: +(r.hitRatio * 100).toFixed(1), fault: +(r.faultRate * 100).toFixed(1), time: +r.timeMs.toFixed(3) }));

  return (
    <>
      <PageHeader title="Algorithm Comparison" description={`${parsed.refs.length} references · ${s.frames} frames · workload: ${s.workloadName}`}>
        <Btn variant="primary" onClick={() => s.setLast(results)}>Open in Simulator view</Btn>
      </PageHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {results.map((r) => (
          <div key={r.policy} className={`clay-card p-4 ${r === best ? "ring-2 ring-success" : ""}`}>
            <div className="flex items-center justify-between"><span className="font-semibold">{POLICY_LABEL[r.policy]}</span>{r.policy === "OPT" && <span className="text-xs text-muted-foreground">benchmark</span>}{r === best && <span className="text-xs font-semibold text-success">best practical</span>}</div>
            <div className="mt-2 font-mono text-2xl">{r.faults} <span className="text-sm text-muted-foreground">faults</span></div>
            <div className="text-sm text-muted-foreground">Hit ratio {pct(r.hitRatio)}</div>
            {r.chosen && <div className="mt-1 text-xs text-muted-foreground">used {r.chosen}</div>}
          </div>
        ))}
      </div>
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Panel title="Page faults"><SimpleBar data={data} dataKey="faults" color="var(--chart-5)" /></Panel>
        <Panel title="Hit ratio (%)"><SimpleBar data={data} dataKey="hit" color="var(--chart-3)" /></Panel>
        <Panel title="Fault rate (%)"><SimpleBar data={data} dataKey="fault" color="var(--chart-4)" /></Panel>
        <Panel title="Execution time (ms)"><SimpleBar data={data} dataKey="time" color="var(--chart-1)" /></Panel>
      </div>
      <Panel title="Performance table" className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Policy</th><th className="p-2">Faults</th><th className="p-2">Hits</th><th className="p-2">Hit ratio</th><th className="p-2">Fault rate</th><th className="p-2">Time</th></tr></thead>
            <tbody className="font-mono">
              {results.map((r) => (
                <tr key={r.policy} className="border-t border-border"><td className="p-2 font-sans font-medium">{POLICY_LABEL[r.policy]}</td><td className="p-2">{r.faults}</td><td className="p-2">{r.hits}</td><td className="p-2">{pct(r.hitRatio)}</td><td className="p-2">{pct(r.faultRate)}</td><td className="p-2">{r.timeMs.toFixed(3)} ms</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Verdict">
        <p className="mb-2"><strong>Best practical policy:</strong> {POLICY_LABEL[best.policy]} with {best.faults} faults ({best.faults - opt.faults} more than Optimal).</p>
        <p className="mb-2 text-sm text-muted-foreground">Optimal needs to know future references, so it can't be built in a real OS. It's shown only as the lowest possible fault count.</p>
        <p><strong>Adaptive recommendation:</strong> {c.label} workload → {c.recommended === "Trial" ? "trial FIFO and LRU" : c.recommended}. {c.reason}</p>
      </Panel>
    </>
  );
}
