import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, Shuffle, Beaker } from "lucide-react";
import { PageHeader, Stat, Panel, pct } from "@/components/ui-kit";
import { useSim } from "@/lib/sim/store";
import { POLICY_LABEL } from "@/lib/sim/algorithms";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Page Replacement Simulator" },
      { name: "description", content: "Overview of your latest page replacement simulations and quick actions." },
      { property: "og:title", content: "Dashboard — Page Replacement Simulator" },
      { property: "og:description", content: "Overview of your latest page replacement simulations and quick actions." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { last, workloadName } = useSim();
  const practical = last.filter((r) => r.policy !== "OPT");
  const best = practical.length ? practical.reduce((a, b) => (b.faults < a.faults ? b : a)) : null;
  const actions = [
    { to: "/simulator", label: "New Simulation", icon: Play, desc: "Enter a reference string and step through it." },
    { to: "/workload-lab", label: "Generate Workload", icon: Shuffle, desc: "Create sequential, looping, random and more." },
    { to: "/experiments", label: "Run Experiment", icon: Beaker, desc: "Compare policies across many workloads." },
  ] as const;
  return (
    <>
      <PageHeader title="Page Replacement Simulator" description="Explore how FIFO, LRU, Optimal and a workload-aware adaptive policy manage a fixed number of memory frames. Everything is simulated in your browser." />
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {actions.map(({ to, label, icon: Icon, desc }) => (
          <Link key={to} to={to} className="clay-card group p-5 transition-transform hover:-translate-y-0.5">
            <Icon className="mb-3 h-6 w-6 text-primary" />
            <div className="font-semibold">{label}</div>
            <div className="text-sm text-muted-foreground">{desc}</div>
          </Link>
        ))}
      </div>
      {last.length === 0 ? (
        <Panel title="Latest results">
          <p className="text-muted-foreground">No simulations yet. Start a new simulation to see your summary here.</p>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Last workload" value={workloadName} hint={`${last[0].refs.length} references, ${last[0].frames} frames`} />
          <Stat label="Best policy" value={best ? POLICY_LABEL[best.policy] : "—"} hint="Excluding Optimal" />
          <Stat label="Page faults" value={best?.faults ?? last[0].faults} />
          <Stat label="Hit ratio" value={pct(best?.hitRatio ?? last[0].hitRatio)} />
        </div>
      )}
    </>
  );
}
