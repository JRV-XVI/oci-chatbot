package com.cloudforge.api.forgetask.service;

import com.cloudforge.api.forgetask.dto.KPIMetrics;
import com.cloudforge.api.forgetask.dto.TaskDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pruebas unitarias para KPIService.
 *
 * Se prueban los métodos de cálculo en memoria (calculateKPIs, getTaskDistributionByStatus,
 * getTimeMetricsSummary) que NO requieren base de datos. El JdbcTemplate se mockea para
 * satisfacer la inyección de dependencia del constructor sin levantar contexto de Spring.
 *
 * Ejecutar con:
 *   ./mvnw test -pl forgetask -Dtest=KPIServiceTest
 */
@ExtendWith(MockitoExtension.class)
class KPIServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private KPIService kpiService;

    // ─── helpers ────────────────────────────────────────────────────────────────

    private TaskDTO task(String status, double estimated, double real) {
        TaskDTO t = new TaskDTO();
        t.setStatus(status);
        t.setEstimatedTime(estimated);
        t.setRealTime(real);
        return t;
    }

    // ─── calculateKPIs ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("Lista vacía devuelve KPIMetrics con todos los valores en cero")
    void calculateKPIs_emptyList_returnsZeroMetrics() {
        KPIMetrics result = kpiService.calculateKPIs(Collections.emptyList());

        assertEquals(0, result.getTotalTasks());
        assertEquals(0, result.getCompletedTasks());
        assertEquals(0.0, result.getTotalEstimatedHours());
        assertEquals(0.0, result.getTotalRealHours());
        assertEquals(0, result.getProgressPercentage());
    }

    @Test
    @DisplayName("Calcula correctamente totales y conteos por estado")
    void calculateKPIs_mixedStatuses_returnsCorrectCounts() {
        List<TaskDTO> tasks = Arrays.asList(
                task("backlog",     2.0, 0.0),
                task("ready",       3.0, 0.0),
                task("in-progress", 4.0, 3.5),
                task("review",      2.0, 2.0),
                task("done",        5.0, 6.0),
                task("done",        3.0, 3.0)
        );

        KPIMetrics result = kpiService.calculateKPIs(tasks);

        assertEquals(6,   result.getTotalTasks());
        assertEquals(2,   result.getCompletedTasks());
        assertEquals(1,   result.getBacklogCount());
        assertEquals(1,   result.getReadyCount());
        assertEquals(1,   result.getInProgressCount());
        assertEquals(1,   result.getReviewCount());
        assertEquals(2,   result.getDoneCount());
        assertEquals(19.0, result.getTotalEstimatedHours(), 0.001);
        assertEquals(14.5, result.getTotalRealHours(),      0.001);
        // variance = real - estimated = 14.5 - 19.0 = -4.5 (negativo = bajo estimado)
        assertEquals(-4.5, result.getTimeVariance(), 0.001);
    }

    @Test
    @DisplayName("Progreso al 100% cuando todas las tareas están en done")
    void calculateKPIs_allDone_progressIs100() {
        List<TaskDTO> tasks = Arrays.asList(
                task("done", 4.0, 4.0),
                task("done", 6.0, 5.5)
        );

        KPIMetrics result = kpiService.calculateKPIs(tasks);

        assertEquals(100, result.getProgressPercentage());
        assertEquals(2,   result.getDoneCount());
        assertEquals(2,   result.getCompletedTasks());
    }

    @Test
    @DisplayName("Detecta columna backlog sobrecargada cuando supera el límite esperado")
    void calculateKPIs_backlogOverloaded_flagIsTrue() {
        List<TaskDTO> tasks = Arrays.asList(
                task("backlog", 1.0, 0.0),
                task("backlog", 1.0, 0.0),
                task("backlog", 1.0, 0.0)  // 3 tasks en backlog
        );
        Map<String, Integer> limits = Map.of("backlog", 2);  // límite = 2

        KPIMetrics result = kpiService.calculateKPIs(tasks, limits);

        assertTrue(result.isBacklogOverloaded(),
                "Backlog con 3 tareas debe estar marcado como sobrecargado (límite=2)");
    }

    @Test
    @DisplayName("No detecta sobrecarga cuando los conteos están dentro del límite")
    void calculateKPIs_withinLimits_noOverload() {
        List<TaskDTO> tasks = Arrays.asList(
                task("in-progress", 3.0, 0.0),
                task("in-progress", 2.0, 0.0)
        );
        Map<String, Integer> limits = Map.of("in-progress", 3);  // límite = 3, hay 2

        KPIMetrics result = kpiService.calculateKPIs(tasks, limits);

        assertFalse(result.isInProgressOverloaded());
    }

    @Test
    @DisplayName("Lista con una sola tarea en null status no lanza excepción")
    void calculateKPIs_nullStatus_doesNotThrow() {
        TaskDTO t = new TaskDTO();
        t.setEstimatedTime(2.0);
        t.setRealTime(1.0);
        // status = null

        assertDoesNotThrow(() -> kpiService.calculateKPIs(List.of(t)));
    }

    // ─── getTaskDistributionByStatus ─────────────────────────────────────────────

    @Test
    @DisplayName("getTaskDistributionByStatus cuenta correctamente cada estado")
    void getTaskDistributionByStatus_countsAllStatuses() {
        List<TaskDTO> tasks = Arrays.asList(
                task("backlog",     0, 0),
                task("backlog",     0, 0),
                task("ready",       0, 0),
                task("in-progress", 0, 0),
                task("done",        0, 0)
        );

        Map<String, Integer> dist = kpiService.getTaskDistributionByStatus(tasks);

        assertEquals(2, dist.get("backlog"));
        assertEquals(1, dist.get("ready"));
        assertEquals(1, dist.get("in-progress"));
        assertEquals(0, dist.get("review"));
        assertEquals(1, dist.get("done"));
    }

    @Test
    @DisplayName("getTaskDistributionByStatus con lista vacía devuelve todos en cero")
    void getTaskDistributionByStatus_emptyList_allZero() {
        Map<String, Integer> dist = kpiService.getTaskDistributionByStatus(Collections.emptyList());

        assertEquals(0, dist.get("backlog"));
        assertEquals(0, dist.get("ready"));
        assertEquals(0, dist.get("in-progress"));
        assertEquals(0, dist.get("review"));
        assertEquals(0, dist.get("done"));
    }

    // ─── getTimeMetricsSummary ───────────────────────────────────────────────────

    @Test
    @DisplayName("getTimeMetricsSummary calcula varianza correcta (real > estimado)")
    void getTimeMetricsSummary_positiveVariance() {
        List<TaskDTO> tasks = Arrays.asList(
                task("done", 3.0, 5.0),   // +2h sobre estimado
                task("done", 4.0, 4.0)    // exacto
        );

        Map<String, Double> summary = kpiService.getTimeMetricsSummary(tasks);

        assertEquals(7.0,  summary.get("totalEstimatedHours"), 0.001);
        assertEquals(9.0,  summary.get("totalRealHours"),      0.001);
        assertEquals(2.0,  summary.get("variance"),            0.001);
    }

    @Test
    @DisplayName("getTimeMetricsSummary con lista vacía devuelve ceros sin excepción")
    void getTimeMetricsSummary_emptyList_returnsZeros() {
        Map<String, Double> summary = kpiService.getTimeMetricsSummary(Collections.emptyList());

        assertEquals(0.0, summary.get("totalEstimatedHours"), 0.001);
        assertEquals(0.0, summary.get("totalRealHours"),      0.001);
        assertEquals(0.0, summary.get("variance"),            0.001);
    }

    // ─── buildDisplayName (comportamiento indirecto via calculateKPIs) ──────────

    @Test
    @DisplayName("Progreso en 0% cuando no hay tareas done y sí hay estimado total")
    void calculateKPIs_noDone_progressIsZero() {
        List<TaskDTO> tasks = Arrays.asList(
                task("backlog",     5.0, 0.0),
                task("in-progress", 3.0, 1.0)
        );

        KPIMetrics result = kpiService.calculateKPIs(tasks);

        assertEquals(0, result.getProgressPercentage());
        assertEquals(0, result.getDoneCount());
    }
}