import TotalTasksKpi from "../components/kpis/TotalTasksKpi";
import TotalHoursKpi from "../components/kpis/TotalHoursKpi";
import AvgTasksKpi from "../components/kpis/AvgTasksKpi";
import AvgHoursDevKpi from "../components/kpis/AvgHoursDevKpi";

export default function KPIsPage() {
  return (
    <main className="p-8">
      {/* ── Sección KPIs ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 items-start">
        <TotalTasksKpi total={142} done={92} inProgress={28} todo={22} />
        <TotalHoursKpi realHours={50} estimatedHours={100} />
        <AvgTasksKpi totalTasks={142} totalDevs={14} />
        <AvgHoursDevKpi totalHours={250} totalDevs={4} expectedHours={60} />
      </section>
    </main>
  );
}