"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import kpiService, {
  type RealHoursBySprintUser,
  type RealHoursByUser,
  type RealHoursTaskDetail,
} from "@/app/services/kpiService";
import sprintService from "@/app/services/sprintService";
import { BarChart, type BarChartValueChange } from "@/components/BarChart";
import { ProgressCircle } from "@/components/ProgressCircle";
import type { SprintOption } from "@/app/types/sprint";
import styles from "./RealTotalHoursByUserKpi.module.css";

interface UserHoursPoint {
  user: string;
  realTotalHours: number;
  doneTasks: number;
  sharePercentage: number;
}

type CircleVariant = "default" | "warning" | "success" | "error";

const SPRINT_ALL_VALUE = "all";
const CIRCLE_VARIANTS: CircleVariant[] = ["default", "warning", "success", "error"];
const CHART_COLORS = ["cyan", "emerald", "violet", "amber", "fuchsia", "blue", "pink", "orange", "red"];

function formatHours(value: number): string {
  if (Number.isInteger(value)) {
    return `${value}h`;
  }

  return `${value.toFixed(2)}h`;
}

function getSprintLabel(sprint: SprintOption): string {
  return `Sprint ${sprint.sprintNumber}: ${sprint.title}`;
}

function normalizeUserLabel(username?: string): string {
  const trimmed = username?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Sin asignar";
}

function mapApiRows(rows: RealHoursByUser[]): UserHoursPoint[] {
  const points = rows.map((row) => {
    const hours = Number(row.realTotalHours ?? 0);
    const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 0;
    const doneTasks = Number(row.doneTasks ?? 0);
    const safeDoneTasks = Number.isFinite(doneTasks) && doneTasks > 0 ? doneTasks : 0;

    return {
      user: normalizeUserLabel(row.username),
      realTotalHours: safeHours,
      doneTasks: safeDoneTasks,
      sharePercentage: 0,
    };
  });

  const totalHours = points.reduce((sum, row) => sum + row.realTotalHours, 0);

  return points
    .map((point) => ({
      ...point,
      sharePercentage: totalHours > 0 ? (point.realTotalHours / totalHours) * 100 : 0,
    }))
    .sort((a, b) => b.realTotalHours - a.realTotalHours || a.user.localeCompare(b.user));
}

export default function RealTotalHoursByUserKpi() {
  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [userHoursRows, setUserHoursRows] = useState<RealHoursByUser[]>([]);
  const [sprintUserRows, setSprintUserRows] = useState<RealHoursBySprintUser[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>(SPRINT_ALL_VALUE);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserTasks, setSelectedUserTasks] = useState<RealHoursTaskDetail[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeGeneralBar, setActiveGeneralBar] = useState<BarChartValueChange | null>(null);

  const userHoursData = useMemo(() => mapApiRows(userHoursRows), [userHoursRows]);
  const visibleUsers = useMemo(() => userHoursData, [userHoursData]);

  const fetchKpiData = useCallback(async (sprintValue: string): Promise<void> => {
    const sprintId = sprintValue === SPRINT_ALL_VALUE ? undefined : Number(sprintValue);
    const safeSprintId = sprintId !== undefined && Number.isFinite(sprintId) ? sprintId : undefined;
    const [usersData, sprintUserData] = await Promise.all([
      kpiService.getRealHoursByUser(safeSprintId),
      kpiService.getRealHoursBySprintUser(),
    ]);

    setUserHoursRows(usersData);
    setSprintUserRows(sprintUserData);
    setActiveGeneralBar(null);
  }, []);

  const generalChartCategories = useMemo(() => {
    const seen = new Set<string>();

    visibleUsers.forEach((item) => {
      seen.add(item.user);
    });

    sprintUserRows.forEach((row) => {
      seen.add(normalizeUserLabel(row.username));
    });

    return Array.from(seen);
  }, [visibleUsers, sprintUserRows]);

  const generalChartData = useMemo<Array<Record<string, string | number>>>(() => {
    const bySprint = new Map<
      string,
      { sprintId: number; sprintNumber: number; record: Record<string, string | number> }
    >();

    sprintUserRows.forEach((row) => {
      const sprintId = Number(row.sprintId ?? 0);
      const sprintNumber = Number(row.sprintNumber ?? sprintId);
      const key = `${sprintNumber}-${sprintId}`;
      const username = normalizeUserLabel(row.username);
      const hours = Number(row.realTotalHours ?? 0);
      const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 0;

      if (!bySprint.has(key)) {
        bySprint.set(key, {
          sprintId,
          sprintNumber,
          record: { name: `Sprint ${sprintNumber}` },
        });
      }

      bySprint.get(key)!.record[username] = safeHours;
    });

    return Array.from(bySprint.values())
      .sort((a, b) => a.sprintNumber - b.sprintNumber || a.sprintId - b.sprintId)
      .map((row) => {
        const record = { ...row.record };
        generalChartCategories.forEach((category) => {
          if (record[category] === undefined) {
            record[category] = 0;
          }
        });

        return record;
      });
  }, [generalChartCategories, sprintUserRows]);

  const handleGeneralBarChange = useCallback((value: BarChartValueChange | null) => {
    setActiveGeneralBar(value);
  }, []);

  const selectedUserDetails = useMemo<UserHoursPoint | null>(() => {
    if (!selectedUser) {
      return null;
    }

    return userHoursData.find((item) => item.user === selectedUser) ?? null;
  }, [selectedUser, userHoursData]);

  const handleUserCardClick = useCallback((username: string) => {
    setSelectedUser((previous) => (previous === username ? null : username));
  }, []);

  const handleSprintChange = useCallback(async (value: string) => {
    setSelectedSprint(value);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await fetchKpiData(value);
    } catch (error) {
      console.error("Error loading KPI data by sprint:", error);
      setErrorMessage("No se pudo cargar el KPI para el sprint seleccionado.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchKpiData]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const fallbackSprint = SPRINT_ALL_VALUE;
        setSelectedSprint(fallbackSprint);
        await fetchKpiData(fallbackSprint);

        try {
          const fetchedSprints = await sprintService.listSprints();
          const sortedSprints = [...fetchedSprints].sort(
            (a, b) => a.sprintNumber - b.sprintNumber
          );
          setSprints(sortedSprints);
        } catch (sprintError) {
          console.warn("Sprint list is unavailable, KPI loaded with all-sprints mode:", sprintError);
          setSprints([]);
        }
      } catch (error) {
        console.error("Error loading KPI data:", error);
        setErrorMessage(
          "No se pudieron cargar los KPIs. Verifica que el backend este levantado en el puerto 8080."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [fetchKpiData]);

  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserTasks([]);
      return;
    }

    const exists = userHoursData.some((item) => item.user === selectedUser);
    if (!exists) {
      setSelectedUser(null);
      setSelectedUserTasks([]);
    }
  }, [selectedUser, userHoursData]);

  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    let isActive = true;
    const loadDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const sprintId =
          selectedSprint === SPRINT_ALL_VALUE ? undefined : Number(selectedSprint);
        const rows = await kpiService.getRealHoursTasksByUser(
          selectedUser,
          sprintId !== undefined && Number.isFinite(sprintId) ? sprintId : undefined
        );

        if (isActive) {
          setSelectedUserTasks(rows);
        }
      } catch (error) {
        console.error("Error loading selected user tasks:", error);
        if (isActive) {
          setSelectedUserTasks([]);
        }
      } finally {
        if (isActive) {
          setIsLoadingDetails(false);
        }
      }
    };

    void loadDetails();

    return () => {
      isActive = false;
    };
  }, [selectedUser, selectedSprint]);

  return (
    <main className="h-full overflow-auto px-4 py-5 md:px-10 md:py-8 app-background">
      <section className="mx-auto max-w-6xl space-y-6">

        <section className="rounded-2xl border border-orange-300/20 bg-black/25 p-4 shadow-[0_0_35px_rgba(231,107,54,0.14)] md:p-5">
          <div className="grid gap-4 md:grid-cols-1">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-200/75">
                Sprint
              </span>
              <select
                value={selectedSprint}
                onChange={(event) => {
                  void handleSprintChange(event.target.value);
                }}
                className="w-full rounded-lg border border-orange-400/35 bg-[#1a1210] px-3 py-2 text-sm text-orange-50 focus-visible:outline-none"
              >
                {sprints.length > 0 ? null : (
                  <option value={SPRINT_ALL_VALUE}>Sin sprints</option>
                )}
                <option value={SPRINT_ALL_VALUE}>Todos los sprints</option>
                {sprints.map((sprint) => (
                  <option key={sprint.idSprint} value={String(sprint.idSprint)}>
                    {getSprintLabel(sprint)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-orange-300/20 bg-black/25 p-4 md:p-6">
          {isLoading ? (
            <p className="text-sm text-orange-100/80">Cargando datos KPI...</p>
          ) : errorMessage ? (
            <div className="space-y-3">
              <p className="text-sm text-red-300">{errorMessage}</p>
              <button
                type="button"
                className="rounded-md border border-orange-300/35 bg-orange-500/20 px-3 py-2 text-sm text-orange-100 hover:bg-orange-500/30"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </button>
            </div>
          ) : visibleUsers.length === 0 ? (
            <p className="text-sm text-orange-100/80">
              No hay tareas con estado done en el sprint seleccionado.
            </p>
          ) : (
            <div className={styles.circleGrid}>
              {visibleUsers.map((item, index) => {
                const isSelected = selectedUser === item.user;
                const variant = CIRCLE_VARIANTS[index % CIRCLE_VARIANTS.length];

                return (
                  <button
                    key={item.user}
                    type="button"
                    onClick={() => handleUserCardClick(item.user)}
                    className={`${styles.circleCard} ${isSelected ? styles.circleCardActive : ""}`}
                  >
                    <ProgressCircle
                      variant={variant}
                      value={item.sharePercentage}
                      radius={46}
                    />

                    <span className={styles.userName} title={item.user}>
                      {item.user}
                    </span>

                    <span className={styles.hours}>
                      {formatHours(item.realTotalHours)}
                    </span>

                    <span className={styles.share}>
                      {item.doneTasks} tareas done
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedUserDetails ? (
          <section className="rounded-2xl border border-orange-300/20 bg-[#1a1210]/90 p-4 md:p-6">
            <h2 className="text-xl font-semibold text-orange-50">
              Detalle de {selectedUserDetails.user}
            </h2>
            <p className="mt-1 text-sm text-orange-100/80">
              {formatHours(selectedUserDetails.realTotalHours)} en {selectedUserDetails.doneTasks} tareas
              done ({selectedUserDetails.sharePercentage.toFixed(1)}% del total del sprint).
            </p>

            {isLoadingDetails ? (
              <p className="mt-3 text-sm text-orange-100/80">Cargando tareas del usuario...</p>
            ) : selectedUserTasks.length === 0 ? (
              <p className="mt-3 text-sm text-orange-100/80">No hay tareas done para este usuario.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {selectedUserTasks.map((task) => (
                  <li
                    key={task.taskId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-orange-300/15 bg-black/20 px-3 py-2"
                  >
                    <span className="truncate text-sm text-orange-50">{task.title}</span>
                    <span className="shrink-0 text-sm font-medium text-orange-100">
                      {formatHours(Number(task.realTime ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className="rounded-2xl border border-orange-300/20 bg-[#1a1210]/90 p-4 md:p-6">
          <h2 className="text-xl font-semibold text-orange-50">Grafica general por sprint y usuario</h2>
          <p className="mt-1 text-sm text-orange-100/80">
            Topic = Sprint, Groups = Usuario (horas reales done). Esta grafica es general y no cambia con el filtro.
          </p>

          {isLoading ? (
            <p className="mt-3 text-sm text-orange-100/80">Cargando grafica general...</p>
          ) : generalChartData.length === 0 || generalChartCategories.length === 0 ? (
            <p className="mt-3 text-sm text-orange-100/80">No hay datos para la grafica general.</p>
          ) : (
            <>
              <div className="mt-4">
                <BarChart
                  data={generalChartData}
                  className="h-auto"
                  index="name"
                  colors={CHART_COLORS}
                  categories={generalChartCategories}
                  valueFormatter={formatHours}
                  onValueChange={handleGeneralBarChange}
                  yAxisWidth={72}
                />
              </div>

              {activeGeneralBar ? (
                <p className="mt-2 text-xs text-orange-200/80">
                  Listener: {activeGeneralBar.index}{" -> "}{activeGeneralBar.category} = {formatHours(activeGeneralBar.value)}
                </p>
              ) : null}
            </>
          )}
        </section>
      </section>
    </main>
  );
}
