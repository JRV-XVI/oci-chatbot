"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import kpiService, {
  type RealHoursBySprintUser,
  type RealHoursByUser,
  type RealHoursTaskDetail,
} from "@/app/services/kpiService";
import { BarChart, type BarChartValueChange } from "@/components/BarChart";
import { ProgressCircle } from "@/components/ProgressCircle";
import styles from "./RealTotalHoursByUserKpi.module.css";

interface UserHoursPoint {
  user: string;
  realTotalHours: number;
  doneTasks: number;
  sharePercentage: number;
}

type CircleVariant = "default" | "warning" | "success" | "error";

const CIRCLE_VARIANTS: CircleVariant[] = ["default", "warning", "success", "error"];
const CHART_COLORS = ["orange", "orangeSoft", "orangeDeep", "slateLight", "slate", "slateDim"];

function formatHours(value: number): string {
  if (Number.isInteger(value)) {
    return `${value}h`;
  }

  return `${value.toFixed(2)}h`;
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

interface RealTotalHoursByUserKpiProps {
  selectedSprintId?: number;
}

export default function RealTotalHoursByUserKpi({ selectedSprintId }: RealTotalHoursByUserKpiProps) {
  const [userHoursRows, setUserHoursRows] = useState<RealHoursByUser[]>([]);
  const [sprintUserRows, setSprintUserRows] = useState<RealHoursBySprintUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserTasks, setSelectedUserTasks] = useState<RealHoursTaskDetail[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeGeneralBar, setActiveGeneralBar] = useState<BarChartValueChange | null>(null);

  const userHoursData = useMemo(() => mapApiRows(userHoursRows), [userHoursRows]);
  const visibleUsers = useMemo(() => userHoursData, [userHoursData]);

  const fetchKpiData = useCallback(async (sprintId?: number): Promise<void> => {
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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        await fetchKpiData(selectedSprintId);
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
  }, [fetchKpiData, selectedSprintId]);

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
        const rows = await kpiService.getRealHoursTasksByUser(
          selectedUser,
          selectedSprintId !== undefined && Number.isFinite(selectedSprintId) ? selectedSprintId : undefined
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
  }, [selectedUser, selectedSprintId]);

  return (
    <div className="px-2 py-2 md:px-4 md:py-4">
      <section className="mx-auto max-w-6xl space-y-6">

        <section className="rounded-2xl border border-[#2b3542] bg-[#0d1117]/75 p-4 md:p-6">
          {isLoading ? (
            <p className="text-sm text-[#9aa4b2]">Cargando datos KPI...</p>
          ) : errorMessage ? (
            <div className="space-y-3">
              <p className="text-sm text-[#ffb28e]">{errorMessage}</p>
              <button
                type="button"
                className="rounded-md border border-[#e76b36]/45 bg-[#e76b36]/15 px-3 py-2 text-sm text-[#e6edf3] hover:bg-[#e76b36]/25"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </button>
            </div>
          ) : visibleUsers.length === 0 ? (
            <p className="text-sm text-[#9aa4b2]">
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
          <section className="rounded-2xl border border-[#2b3542] bg-[#0d1117]/90 p-4 md:p-6">
            <h2 className="text-xl font-semibold text-[#e6edf3]">
              Detalle de {selectedUserDetails.user}
            </h2>
            <p className="mt-1 text-sm text-[#9aa4b2]">
              {formatHours(selectedUserDetails.realTotalHours)} en {selectedUserDetails.doneTasks} tareas
              done ({selectedUserDetails.sharePercentage.toFixed(1)}% del total del sprint).
            </p>

            {isLoadingDetails ? (
              <p className="mt-3 text-sm text-[#9aa4b2]">Cargando tareas del usuario...</p>
            ) : selectedUserTasks.length === 0 ? (
              <p className="mt-3 text-sm text-[#9aa4b2]">No hay tareas done para este usuario.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {selectedUserTasks.map((task) => (
                  <li
                    key={task.taskId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#2b3542] bg-[#11161f]/70 px-3 py-2"
                  >
                    <span className="truncate text-sm text-[#e6edf3]">{task.title}</span>
                    <span className="shrink-0 text-sm font-medium text-[#f19367]">
                      {formatHours(Number(task.realTime ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className="rounded-2xl border border-[#2b3542] bg-[#0d1117]/90 p-4 md:p-6">
          <h2 className="text-xl font-semibold text-[#e6edf3]">Grafica general por sprint y usuario</h2>
          <p className="mt-1 text-sm text-[#9aa4b2]">
            Topic = Sprint, Groups = Usuario (horas reales done). Esta grafica es general y no cambia con el filtro.
          </p>

          {isLoading ? (
            <p className="mt-3 text-sm text-[#9aa4b2]">Cargando grafica general...</p>
          ) : generalChartData.length === 0 || generalChartCategories.length === 0 ? (
            <p className="mt-3 text-sm text-[#9aa4b2]">No hay datos para la grafica general.</p>
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
                  orientation="vertical"
                />
              </div>

              {activeGeneralBar ? (
                <p className="mt-2 text-xs text-[#f19367]/90">
                  Listener: {activeGeneralBar.index}{" -> "}{activeGeneralBar.category} = {formatHours(activeGeneralBar.value)}
                </p>
              ) : null}
            </>
          )}
        </section>
      </section>
    </div>
  );
}
