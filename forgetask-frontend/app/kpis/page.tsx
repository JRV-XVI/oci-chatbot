import TotalTasksKpi from "../components/kpis/totalTasksKpi";

export default function KPIsPage() {
  return (
    <main className="p-8">
      {/* ── Sección KPIs ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 items-start">
        <TotalTasksKpi total={142} done={92} inProgress={28} todo={22} />
      </section>
    </main>
  );
}