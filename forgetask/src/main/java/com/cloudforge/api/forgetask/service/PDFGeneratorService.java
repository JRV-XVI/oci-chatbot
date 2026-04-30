package com.cloudforge.api.forgetask.service;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.ZonedDateTime;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Generates sprint assessment PDF documents using OpenHTMLToPDF and strict XHTML.
 */
@Service
public class PDFGeneratorService {

    private static final Logger logger = LoggerFactory.getLogger(PDFGeneratorService.class);
    private static final DateTimeFormatter FILE_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");
    private static final DateTimeFormatter DISPLAY_DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm", Locale.ENGLISH);

    private static final String[] KNOWN_SECTION_HEADINGS = {
        "Executive Summary",
        "Key Performance Insights",
        "Improvement Actions",
        "Risk Assessment"
    };

    private static final Pattern BOLD_PATTERN = Pattern.compile("\\*\\*(.+?)\\*\\*");
    private static final Pattern ITALIC_PATTERN = Pattern.compile("_(.+?)_");
    private static final Pattern METADATA_PATTERN = Pattern.compile(
        "(?i)^(Sprint ID|Report Generated|Total Tasks|Project ID|KPI Metrics|Tasks Summary|" +
            "In Progress Tasks|Review Tasks|Ready Tasks|Backlog Tasks|Efficiency Rate|Progress Percentage|" +
            "Estimated Hours|Real Hours|Time Variance|Done Tasks)\\s*:.*$"
    );

    /**
     * Main entry point with KPI and team details.
     */
    public byte[] generatePDF(
            String reportContent,
            Integer projectId,
            Integer sprintId,
            Map<String, Object> metrics,
            List<Map<String, Object>> userHours
    ) throws Exception {
        String html = buildHtml(reportContent, projectId, sprintId, metrics, userHours);
        return renderHtmlToPdf(html);
    }

    /**
     * Overload used when KPI and team data are not provided.
     */
    public byte[] generatePDF(String reportContent, Integer projectId, Integer sprintId) throws Exception {
        return generatePDF(reportContent, projectId, sprintId, Map.of(), List.of());
    }

    public String generateFilename(Integer projectId, Integer sprintId) {
        String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
        String sprintPart = sprintId != null ? "Sprint_" + sprintId : "AllSprints";
        return String.format("Report_%s_%s.pdf", sprintPart, timestamp);
    }

    /**
     * Converts XHTML content into PDF bytes.
     */
    private byte[] renderHtmlToPdf(String html) throws Exception {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.withHtmlContent(html, "/");
            builder.toStream(out);
            builder.run();
            byte[] bytes = out.toByteArray();
            logger.info("PDF generated successfully: {} bytes", bytes.length);
            return bytes;
        } catch (Exception e) {
            logger.error("Error generating PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate PDF: " + e.getMessage(), e);
        }
    }

    /**
     * Orchestrates all report sections into a single XHTML document.
     */
    private String buildHtml(
            String reportContent,
            Integer projectId,
            Integer sprintId,
            Map<String, Object> metrics,
            List<Map<String, Object>> userHours
    ) {
        int totalTasks = intVal(metrics, "totalTasks", 0);
        int doneTasks = intVal(metrics, "doneTasks", 0);
        int inProgress = intVal(metrics, "inProgressTasks", 0);
        int review = intVal(metrics, "reviewTasks", 0);
        int ready = intVal(metrics, "readyTasks", 0);
        int backlog = intVal(metrics, "backlogTasks", 0);
        double efficiency = doubleVal(metrics, "efficiencyRate", 0.0);
        int progress = intVal(metrics, "progressPercentage", 0);
        double estimated = doubleVal(metrics, "estimatedHours", 0.0);
        double real = doubleVal(metrics, "realHours", 0.0);
        double variance = doubleVal(metrics, "timeVariance", real - estimated);

        String generatedAt = ZonedDateTime.now(ZoneId.of("America/Mexico_City"))
                        .format(DISPLAY_DATE_FORMAT);
        List<Map<String, Object>> safeUserHours = userHours != null ? userHours : List.of();

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>")
            .append("<html xmlns=\"http://www.w3.org/1999/xhtml\" lang=\"es\">")
            .append("<head>")
            .append("<meta charset=\"UTF-8\"/>")
            .append("<title>Sprint Performance Assessment Report</title>")
            .append("<style type=\"text/css\">")
            .append(CSS)
            .append(buildPageCss(projectId, sprintId))
            .append("</style>")
            .append("</head>")
            .append("<body>")
            .append(buildCoverPage(projectId, sprintId, generatedAt))
            .append(buildExecutiveSummary(reportContent, projectId, sprintId, generatedAt, efficiency))
            .append(buildKpiDashboard(totalTasks, doneTasks, inProgress, review, ready, backlog, efficiency, progress, variance, projectId, sprintId))
            .append(buildTasksTable(safeUserHours, projectId, sprintId))
            .append(buildHoursTable(safeUserHours, real, projectId, sprintId))
            .append(buildNarrativeSection(reportContent, projectId, sprintId))
            .append(buildDocumentControl(projectId, sprintId, generatedAt))
            .append("</body>")
            .append("</html>");

        logger.debug("Generated XHTML length: {}", html.length());
        return html.toString();
    }

    /**
     * Builds page 1 (cover page).
     */
    private String buildCoverPage(Integer projectId, Integer sprintId, String generatedAt) {
        String sprintValue = sprintId != null ? String.valueOf(sprintId) : "ALL";
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"cover-page\">")
          .append("<div class=\"cover-brand\">CloudForge</div>")
          .append("<div class=\"cover-line\"></div>")
          .append("<h1 class=\"cover-title\">Sprint Performance Assessment Report</h1>")
          .append("<table class=\"cover-meta-table\"><tbody>")
          .append("<tr><td class=\"cover-meta-label\">Project ID</td><td class=\"cover-meta-value\">")
          .append(escapeHtml(String.valueOf(projectId != null ? projectId : "-"))).append("</td></tr>")
          .append("<tr><td class=\"cover-meta-label\">Sprint ID</td><td class=\"cover-meta-value\">")
          .append(escapeHtml(sprintValue)).append("</td></tr>")
          .append("<tr><td class=\"cover-meta-label\">Generation Date</td><td class=\"cover-meta-value\">")
          .append(escapeHtml(generatedAt)).append("</td></tr>")
          .append("<tr><td class=\"cover-meta-label\">Document Version</td><td class=\"cover-meta-value\">1.0</td></tr>")
          .append("<tr><td class=\"cover-meta-label\">Classification</td><td class=\"cover-meta-value\">Internal - Management Use Only</td></tr>")
          .append("</tbody></table>")
          .append("</div>");
        return sb.toString();
    }

    /**
     * Builds page 2 with sections 1 and 2 plus document index.
     */
    private String buildExecutiveSummary(String reportContent, Integer projectId, Integer sprintId, String generatedAt, double efficiencyRate) {
        String executiveBlock = extractSection(reportContent, "Executive Summary");
        if (executiveBlock.isBlank()) {
            executiveBlock = firstParagraphs(reportContent, 3);
        }

        if (executiveBlock.isBlank()) {
            executiveBlock = "No executive summary content was provided by the AI narrative.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"page page-break-before\">")
          .append(pageHeader(projectId, sprintId))
          .append("<h2 class=\"section-title\">1. EXECUTIVE SUMMARY</h2>")
          .append("<div class=\"section-divider\"></div>")
          .append(formatNarrative(executiveBlock))
                    .append("<table class=\"report-table\"><thead><tr>")
                    .append("<th>ATTRIBUTE</th><th>VALUE</th>")
                    .append("</tr></thead><tbody>")
                    .append("<tr><td>Efficiency Rate</td><td>").append(String.format(Locale.US, "%.1f%%", efficiencyRate)).append("</td></tr>")
                    .append("<tr><td>Assessment Date</td><td>").append(escapeHtml(generatedAt)).append("</td></tr>")
                    .append("</tbody></table>")
          .append("<h2 class=\"section-title\">3. DOCUMENT INDEX</h2>")
          .append("<div class=\"section-divider\"></div>")
          .append("<table class=\"report-table\"><thead><tr>")
          .append("<th>SECTION</th><th>DESCRIPTION</th><th>PAGE</th>")
          .append("</tr></thead><tbody>")
          .append("<tr><td>1</td><td>Executive Summary</td><td>2</td></tr>")
          .append("<tr><td>3</td><td>Performance Metrics Dashboard</td><td>3</td></tr>")
          .append("<tr><td>4</td><td>Team Metrics - Tasks &#38; Hours</td><td>3-4</td></tr>")
          .append("<tr><td>5</td><td>AI-Generated Process Assessment</td><td>4-6</td></tr>")
          .append("<tr><td>7</td><td>Document Control</td><td>Last</td></tr>")
          .append("</tbody></table>")
          .append("</div>");
        return sb.toString();
    }

    /**
     * Builds page 3 dashboard and section 4 title (team tables are appended separately).
     */
    private String buildKpiDashboard(
            int totalTasks,
            int doneTasks,
            int inProgress,
            int review,
            int ready,
            int backlog,
            double efficiency,
            int progress,
            double variance,
            Integer projectId,
            Integer sprintId
    ) {
        String efficiencyColor = kpiColor(efficiency, 75d, 60d);
        String progressColor = kpiColor(progress, 75d, 60d);

        String tasksColor;
        if (totalTasks > 0 && doneTasks == totalTasks) {
            tasksColor = "#16a34a";
        } else if (doneTasks > 0) {
            tasksColor = "#2563eb";
        } else {
            tasksColor = "#dc2626";
        }

        String varianceColor = variance <= 0 ? "#16a34a" : "#dc2626";

        String efficiencyState = stateText(efficiency, 75d, 60d);
        String progressState = stateText(progress, 75d, 60d);
        double completionRate = totalTasks > 0 ? (doneTasks * 100d / totalTasks) : 0d;
        String tasksState = completionRate >= 75d ? "ON TARGET" 
                        : completionRate >= 50d ? "NEAR TARGET" 
                        : "BELOW TARGET";

        String varianceNote;
        if (variance < 0) {
            varianceNote = "Completed ahead of schedule";
        } else if (variance > 0) {
            varianceNote = "Exceeded time estimate";
        } else {
            varianceNote = "Exactly on schedule";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"page page-break-before\">")
          .append(pageHeader(projectId, sprintId))
          .append("<h2 class=\"section-title\">3. PERFORMANCE METRICS DASHBOARD</h2>")
          .append("<div class=\"section-divider\"></div>")
          .append("<table class=\"kpi-grid-table\"><tbody>")
          .append("<tr>")
          .append(kpiCard("EFFICIENCY RATE", String.format(Locale.US, "%.1f%%", efficiency), efficiencyColor, efficiencyState, ""))
          .append(kpiCard("PROGRESS", progress + "%", progressColor, progressState, ""))
          .append("</tr>")
          .append("<tr>")
          .append(kpiCard("TASKS COMPLETED", doneTasks + " / " + totalTasks, tasksColor, tasksState, ""))
          .append(kpiCard("TIME VARIANCE", String.format(Locale.US, "%+.1f h", variance), varianceColor, variance <= 0 ? "ON TARGET" : "BELOW TARGET", varianceNote))
          .append("</tr>")
          .append("</tbody></table>")
          .append("<table class=\"report-table task-summary\"><thead><tr>")
          .append("<th>Backlog</th><th>Ready</th><th>In Progress</th><th>Review</th><th>Done</th><th>Total</th>")
          .append("</tr></thead><tbody><tr>")
          .append("<td>").append(backlog).append("</td>")
          .append("<td>").append(ready).append("</td>")
          .append("<td>").append(inProgress).append("</td>")
          .append("<td>").append(review).append("</td>")
          .append("<td class=\"done-cell\">").append(doneTasks).append("</td>")
          .append("<td>").append(totalTasks).append("</td>")
          .append("</tr></tbody></table>")
          .append("</div>");
        return sb.toString();
    }

    /**
     * Builds comparative table 1: tasks completed by user.
     */
    private String buildTasksTable(List<Map<String, Object>> userHours, Integer projectId, Integer sprintId) {
        List<Map<String, Object>> rows = new ArrayList<>(userHours);
        rows.sort(
            Comparator.comparingInt((Map<String, Object> row) -> intVal(row, "doneTasks", 0))
                .reversed()
                .thenComparing(row -> String.valueOf(row.getOrDefault("username", "")), String.CASE_INSENSITIVE_ORDER)
        );

        int totalDone = 0;
        for (Map<String, Object> row : rows) {
            totalDone += intVal(row, "doneTasks", 0);
        }

        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"page page-break-before\">")
          .append(pageHeader(projectId, sprintId))
          .append("<h2 class=\"section-title\">4. TEAM METRICS - TASKS &#38; HOURS</h2>")
          .append("<div class=\"section-divider\"></div>");        
        sb.append("<h3 class=\"sub-title\">Tasks Completed by User</h3>")
          .append("<table class=\"report-table\"><thead><tr>")
          .append("<th>RANK</th><th>TEAM MEMBER</th><th>TASKS DONE</th><th>% OF TOTAL TASKS</th>")
          .append("</tr></thead><tbody>");

        if (rows.isEmpty()) {
            sb.append("<tr><td colspan=\"4\">No team member records available.</td></tr>");
        } else {
            int rank = 1;
            for (Map<String, Object> row : rows) {
                int done = intVal(row, "doneTasks", 0);
                double percentage = totalDone > 0 ? (done * 100d / totalDone) : 0d;

                sb.append("<tr>")
                  .append("<td>").append(rank).append("</td>")
                  .append("<td>").append(escapeHtml(String.valueOf(row.getOrDefault("username", "-")))).append("</td>")
                  .append("<td>").append(done).append("</td>")
                  .append("<td>").append(String.format(Locale.US, "%.1f%%", percentage)).append("</td>")
                  .append("</tr>");
                rank++;
            }
        }

        sb.append("<tr class=\"total-row\"><td>&#8212;</td><td>TOTAL</td><td>")
          .append(totalDone)
          .append("</td><td>100.0%</td></tr>")
          .append("</tbody></table>");
        return sb.toString();
    }

    /**
     * Builds comparative table 2: actual worked hours by user.
     */
    private String buildHoursTable(List<Map<String, Object>> userHours, double totalRealHours, Integer projectId, Integer sprintId) {
        List<Map<String, Object>> rows = new ArrayList<>(userHours);
        rows.sort(
            Comparator.comparingDouble((Map<String, Object> row) -> doubleVal(row, "realHours", 0d))
                .reversed()
                .thenComparing(row -> String.valueOf(row.getOrDefault("username", "")), String.CASE_INSENSITIVE_ORDER)
        );

        double totalHours = 0d;
        for (Map<String, Object> row : rows) {
            totalHours += doubleVal(row, "realHours", 0d);
        }
        double totalForPercent = totalHours;
        double avgHours = rows.isEmpty() ? 0d : totalHours / rows.size();

        StringBuilder sb = new StringBuilder();
        sb.append("<h3 class=\"sub-title\">Actual Worked Hours by User</h3>")
          .append("<table class=\"report-table\"><thead><tr>")
          .append("<th>RANK</th><th>TEAM MEMBER</th><th>REAL HOURS</th><th>% CONTRIBUTION</th><th>VS AVG</th>")
          .append("</tr></thead><tbody>");

        if (rows.isEmpty()) {
            sb.append("<tr><td colspan=\"5\">No team member records available.</td></tr>");
        } else {
            int rank = 1;
            for (Map<String, Object> row : rows) {
                double hours = doubleVal(row, "realHours", 0d);
                double contribution = totalForPercent > 0d ? (hours * 100d / totalForPercent) : 0d;
                double delta = hours - avgHours;
                String deltaText = String.format(Locale.US, "%+.1fh", delta);
                String deltaCell = delta > 0d
                    ? "<span class=\"vs-positive\">" + deltaText + "</span>"
                    : escapeHtml(deltaText);

                sb.append("<tr>")
                  .append("<td>").append(rank).append("</td>")
                  .append("<td>").append(escapeHtml(String.valueOf(row.getOrDefault("username", "-")))).append("</td>")
                  .append("<td>").append(String.format(Locale.US, "%.1f h", hours)).append("</td>")
                  .append("<td>").append(String.format(Locale.US, "%.1f%%", contribution)).append("</td>")
                  .append("<td>").append(deltaCell).append("</td>")
                  .append("</tr>");
                rank++;
            }

                        double unattributed = totalForPercent - totalHours;
                        if (unattributed > 0.05d) {
                                sb.append("<tr>")
                                    .append("<td>").append(rank).append("</td>")
                                    .append("<td>Unattributed</td>")
                                    .append("<td>").append(String.format(Locale.US, "%.1f h", unattributed)).append("</td>")
                                    .append("<td>").append(String.format(Locale.US, "%.1f%%", (unattributed * 100d / totalForPercent))).append("</td>")
                                    .append("<td>&#8212;</td>")
                                    .append("</tr>");
                        }
        }

        sb.append("<tr class=\"total-row\"><td>&#8212;</td><td>TOTAL</td><td>")
                    .append(String.format(Locale.US, "%.1f h", totalForPercent))
          .append("</td><td>100.0%</td><td>&#8212;</td></tr>")
          .append("</tbody></table>")
          .append("</div>");
        return sb.toString();
    }

    /**
     * Builds section 6 with subsection extraction and markdown conversion.
     */
    private String buildNarrativeSection(String reportContent, Integer projectId, Integer sprintId) {
        String s61 = extractSection(reportContent, "Executive Summary");
        String s62 = extractSection(reportContent, "Key Performance Insights");
        String s63 = extractSection(reportContent, "Improvement Actions");
        String s64 = extractSection(reportContent, "Risk Assessment");

        boolean foundAnySection = !(s61.isBlank() && s62.isBlank() && s63.isBlank() && s64.isBlank());

        if (!foundAnySection) {
            List<String> equalParts = splitIntoFour(cleanNarrative(reportContent));
            s61 = equalParts.get(0);
            s62 = equalParts.get(1);
            s63 = equalParts.get(2);
            s64 = equalParts.get(3);
        }

        if (s61.isBlank()) s61 = "No executive summary details were provided.";
        if (s62.isBlank()) s62 = "No key performance insights were provided.";
        if (s63.isBlank()) s63 = "No improvement actions were provided.";
        if (s64.isBlank()) s64 = "No risk assessment details were provided.";

        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"page page-break-before\">")
          .append(pageHeader(projectId, sprintId))
          .append("<h2 class=\"section-title\">6. AI-GENERATED PROCESS ASSESSMENT</h2>")
          .append("<div class=\"section-divider\"></div>")
          .append("<h3 class=\"sub-title\">6.1 Executive Summary</h3>")
          .append("<div class=\"sub-divider\"></div>")
          .append("<div class=\"narrative-panel\">\n").append(formatNarrative(s61)).append("</div>")
          .append("<h3 class=\"sub-title\">6.2 Key Performance Insights</h3>")
          .append("<div class=\"sub-divider\"></div>")
          .append("<div class=\"narrative-panel\">\n").append(formatNarrative(s62)).append("</div>")
          .append("<h3 class=\"sub-title\">6.3 Improvement Actions</h3>")
          .append("<div class=\"sub-divider\"></div>")
          .append("<div class=\"narrative-panel\">\n").append(formatNarrative(s63)).append("</div>")
          .append("<h3 class=\"sub-title\">6.4 Risk Assessment</h3>")
          .append("<div class=\"sub-divider\"></div>")
          .append("<div class=\"narrative-panel\">\n").append(formatNarrative(s64)).append("</div>")
          .append("</div>");
        return sb.toString();
    }

    /**
     * Builds the final document control page.
     */
    private String buildDocumentControl(Integer projectId, Integer sprintId, String generatedAt) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"page page-break-before\">")
          .append(pageHeader(projectId, sprintId))
          .append("<h2 class=\"section-title\">7. DOCUMENT CONTROL</h2>")
          .append("<div class=\"section-divider\"></div>")
          .append("<table class=\"doc-control-table\"><thead><tr><th>FIELD</th><th>VALUE</th></tr></thead><tbody>")
          .append("<tr><td class=\"label-cell\">Prepared by</td><td>AI System (CloudForge Report Engine)</td></tr>")
          .append("<tr><td class=\"label-cell\">Reviewed by</td><td>Pending</td></tr>")
          .append("<tr><td class=\"label-cell\">Date</td><td>").append(escapeHtml(generatedAt)).append("</td></tr>")
          .append("<tr><td class=\"label-cell\">Version</td><td>1.0</td></tr>")
          .append("<tr><td class=\"label-cell\">Status</td><td>Draft - Pending Review</td></tr>")
          .append("</tbody></table>")
          .append("<table class=\"disclaimer-table\"><tr><td class=\"disclaimer-cell\">")
          .append("DISCLAIMER: This report is AI-assisted and generated automatically from sprint data. ")
          .append("All conclusions and recommendations should be validated by a qualified project manager ")
          .append("before external distribution or strategic decision-making. Generated by CloudForge Report Engine.")
          .append("</td></tr></table>")
          .append("</div>");
        return sb.toString();
    }

    /**
     * Reusable page header shown in all pages except the cover.
     */
    private String pageHeader(Integer projectId, Integer sprintId) {
        String project = projectId != null ? String.valueOf(projectId) : "-";
        String sprint = sprintId != null ? String.valueOf(sprintId) : "ALL";

        return "<table class=\"page-header\"><tr>"
            + "<td class=\"header-left\">CloudForge</td>"
            + "<td class=\"header-right\">CONFIDENTIAL</td>"
            + "</tr><tr>"
            + "<td class=\"header-meta\">Project " + escapeHtml(project) + "</td>"
            + "<td class=\"header-meta header-meta-right\">Sprint " + escapeHtml(sprint) + "</td>"
            + "</tr></table>"
            + "<div class=\"header-line\"></div>";
    }

    /**
     * Extracts a named section from narrative text until the next known heading.
     */
    private String extractSection(String reportContent, String headingName) {
        if (reportContent == null || reportContent.isBlank() || headingName == null || headingName.isBlank()) {
            return "";
        }

        String normalized = normalizeBreaks(reportContent);
        String[] lines = normalized.split("\\n", -1);

        int startLine = -1;
        for (int i = 0; i < lines.length; i++) {
            if (isHeading(lines[i], headingName)) {
                startLine = i + 1;
                break;
            }
        }

        if (startLine < 0 || startLine >= lines.length) {
            return "";
        }

        int endLine = lines.length;
        for (int i = startLine; i < lines.length; i++) {
            if (isKnownHeading(lines[i])) {
                endLine = i;
                break;
            }
        }

        StringBuilder extracted = new StringBuilder();
        for (int i = startLine; i < endLine; i++) {
            extracted.append(lines[i]).append("\n");
        }
        return extracted.toString().trim();
    }

    /**
     * Converts markdown-like content to strict XHTML.
     */
    private String formatNarrative(String text) {
        String cleaned = cleanNarrative(text);
        if (cleaned.isBlank()) {
            return "<p class=\"body-text\">No analysis available.</p>";
        }

        StringBuilder html = new StringBuilder();
        boolean inParagraph = false;
        boolean inUnorderedList = false;
        boolean inOrderedList = false;
        boolean inListItem = false;

        for (String line : normalizeNarrativeLines(cleaned)) {

            if (line.isEmpty()) {
                if (inParagraph) {
                    html.append("</p>");
                    inParagraph = false;
                }
                if (inListItem) {
                    html.append("</li>");
                    inListItem = false;
                }
                if (inUnorderedList) {
                    html.append("</ul>");
                    inUnorderedList = false;
                }
                if (inOrderedList) {
                    html.append("</ol>");
                    inOrderedList = false;
                }
                continue;
            }

            if (line.matches("^[-*]\\s+.+")) {
                if (inParagraph) {
                    html.append("</p>");
                    inParagraph = false;
                }
                if (inOrderedList) {
                    if (inListItem) {
                        html.append("</li>");
                        inListItem = false;
                    }
                    html.append("</ol>");
                    inOrderedList = false;
                }
                if (!inUnorderedList) {
                    html.append("<ul>");
                    inUnorderedList = true;
                }
                if (inListItem) {
                    html.append("</li>");
                }
                String item = line.replaceFirst("^[-*]\\s+", "");
                html.append("<li>").append(formatInline(item));
                inListItem = true;
            } else if (line.matches("^\\d+\\.\\s+.+")) {
                if (inParagraph) {
                    html.append("</p>");
                    inParagraph = false;
                }
                if (inUnorderedList) {
                    if (inListItem) {
                        html.append("</li>");
                        inListItem = false;
                    }
                    html.append("</ul>");
                    inUnorderedList = false;
                }
                if (!inOrderedList) {
                    html.append("<ol>");
                    inOrderedList = true;
                }
                if (inListItem) {
                    html.append("</li>");
                }
                String item = line.replaceFirst("^\\d+\\.\\s+", "");
                html.append("<li>").append(formatInline(item));
                inListItem = true;
            } else {
                if (inUnorderedList || inOrderedList) {
                    if (!inListItem) {
                        html.append("<li>");
                        inListItem = true;
                    } else {
                        html.append("<br/>");
                    }
                    html.append(formatInline(line));
                } else {
                    if (!inParagraph) {
                        html.append("<p class=\"body-text\">");
                        inParagraph = true;
                    } else {
                        html.append("<br/>");
                    }
                    html.append(formatInline(line));
                }
            }
        }

        if (inParagraph) {
            html.append("</p>");
        }
        if (inListItem) {
            html.append("</li>");
        }
        if (inUnorderedList) {
            html.append("</ul>");
        }
        if (inOrderedList) {
            html.append("</ol>");
        }

        if (html.length() == 0) {
            return "<p class=\"body-text\">No analysis available.</p>";
        }
        return html.toString();
    }

    private List<String> normalizeNarrativeLines(String text) {
        text = text.replaceAll("(?i)Risk:\\s*Risk:", "Risk:");
        text = text.replaceAll("(?i)(Risk:[^\n]+)\n+\\s*Mitigation:", "$1 / Mitigation:");
                
        List<String> lines = new ArrayList<>();
        boolean forceOrderedList = false;
        boolean lastWasListItem = false;
        String pendingRisk = null;

        for (String rawLine : normalizeBreaks(text).split("\\n")) {
            String line = rawLine.trim();

            if (line.isBlank()) {
                if (pendingRisk != null) {
                    lines.add(pendingRisk.trim());
                    pendingRisk = null;
                }
                lines.add("");
                forceOrderedList = false;
                lastWasListItem = false;
                continue;
            }

            if (isListPlaceholderLine(line)) {
                forceOrderedList = true;
                lastWasListItem = false;
                continue;
            }

            if (line.equalsIgnoreCase("Risk:")) {
                continue;
            }

            if (line.startsWith("Risk:")) {
                if (pendingRisk != null) {
                    lines.add(pendingRisk.trim());
                }
                pendingRisk = line;
                if (pendingRisk.contains("/ Mitigation:")) {
                    lines.add(pendingRisk.trim());
                    pendingRisk = null;
                }
                lastWasListItem = false;
                continue;
            }

            if (pendingRisk != null) {
                if (line.startsWith("Mitigation:")) {
                    pendingRisk = pendingRisk + " / " + line;
                    lines.add(pendingRisk.trim());
                    pendingRisk = null;
                } else {
                    pendingRisk = pendingRisk + " " + line;
                    if (pendingRisk.contains("/ Mitigation:")) {
                        lines.add(pendingRisk.trim());
                        pendingRisk = null;
                    }
                }
                lastWasListItem = false;
                continue;
            }

            if (forceOrderedList) {
                if (lastWasListItem && isContinuationLine(line)) {
                    lines.add(line);
                } else {
                    lines.add("1. " + line);
                    lastWasListItem = true;
                }
                continue;
            }

            lastWasListItem = line.matches("^[-*]\\s+.+") || line.matches("^\\d+\\.\\s+.+");
            lines.add(line);
        }

        if (pendingRisk != null) {
            lines.add(pendingRisk.trim());
        }
        return lines;
    }

    private boolean isListPlaceholderLine(String line) {
        return line.matches("^\\d+\\.\\s*$") || line.matches("^[-*]\\s*$");
    }

    private boolean isContinuationLine(String line) {
        if (line.isBlank()) {
            return false;
        }
        int first = line.codePointAt(0);
        return Character.isLowerCase(first);
    }

    /**
     * Returns ISO capability level string from efficiency.
     */
    private String capabilityLevel(double efficiency) {
        if (efficiency >= 90d) {
            return "Level 5: Optimizing";
        }
        if (efficiency >= 75d) {
            return "Level 4: Predictable";
        }
        if (efficiency >= 60d) {
            return "Level 3: Established";
        }
        if (efficiency >= 40d) {
            return "Level 2: Managed";
        }
        return "Level 1: Performed";
    }

    /**
     * Returns KPI color hex based on thresholds.
     */
    private String kpiColor(double value, double greenThreshold, double yellowThreshold) {
        if (value >= greenThreshold) {
            return "#16a34a";
        }
        if (value >= yellowThreshold) {
            return "#d97706";
        }
        return "#dc2626";
    }

    private String formatInline(String text) {
        String escaped = escapeHtml(text == null ? "" : text);

        Matcher prefixMatcher = Pattern.compile("(?i)^(Risk:|Mitigation:)\\s*(.*)$").matcher(escaped);
        if (prefixMatcher.find()) {
            escaped = "<strong>" + prefixMatcher.group(1) + "</strong> " + prefixMatcher.group(2);
        }

        String withBold = applyInlinePattern(escaped, BOLD_PATTERN, "strong");
        return applyInlinePattern(withBold, ITALIC_PATTERN, "em");
    }

    private String applyInlinePattern(String input, Pattern pattern, String tag) {
        Matcher matcher = pattern.matcher(input);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(sb, "<" + tag + ">" + matcher.group(1) + "</" + tag + ">");
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String stateText(double value, double greenThreshold, double yellowThreshold) {
        if (value >= greenThreshold) {
            return "ON TARGET";
        }
        if (value >= yellowThreshold) {
            return "NEAR TARGET";
        }
        return "BELOW TARGET";
    }

    private String kpiCard(String label, String value, String color, String state, String note) {
        StringBuilder sb = new StringBuilder();
        sb.append("<td class=\"kpi-cell\" style=\"border-top:4pt solid ").append(color).append(";\">")
          .append("<table class=\"kpi-inner\"><tbody>")
          .append("<tr><td class=\"kpi-value\" style=\"color:").append(color).append(";\">")
          .append(escapeHtml(value))
          .append("</td></tr>")
          .append("<tr><td class=\"kpi-label\">")
          .append(escapeHtml(label))
          .append("</td></tr>")
          .append("<tr><td class=\"kpi-state\" style=\"color:").append(color).append(";\">")
          .append(escapeHtml(state))
          .append("</td></tr>");

        if (!note.isBlank()) {
            sb.append("<tr><td class=\"kpi-note\">").append(escapeHtml(note)).append("</td></tr>");
        }

        sb.append("</tbody></table></td>");
        return sb.toString();
    }

    private int capabilityNumber(double efficiency) {
        if (efficiency >= 90d) return 5;
        if (efficiency >= 75d) return 4;
        if (efficiency >= 60d) return 3;
        if (efficiency >= 40d) return 2;
        return 1;
    }

    private String capabilityDescription(double efficiency) {
        if (efficiency >= 90d) {
            return "Process continuously improved";
        }
        if (efficiency >= 75d) {
            return "Process operates within defined limits";
        }
        if (efficiency >= 60d) {
            return "Process uses a standard process";
        }
        if (efficiency >= 40d) {
            return "Process is planned and tracked";
        }
        return "Process achieves its purpose";
    }

    private String firstParagraphs(String text, int maxParagraphs) {
        List<String> paragraphs = splitParagraphs(text);
        StringBuilder sb = new StringBuilder();
        int count = 0;
        for (String p : paragraphs) {
            if (p.isBlank()) {
                continue;
            }
            if (count >= maxParagraphs) {
                break;
            }
            if (sb.length() > 0) {
                sb.append("\n\n");
            }
            sb.append(p);
            count++;
        }
        return sb.toString().trim();
    }

    private List<String> splitParagraphs(String text) {
        List<String> paragraphs = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return paragraphs;
        }

        String normalized = normalizeBreaks(text).trim();
        if (normalized.isBlank()) {
            return paragraphs;
        }

        for (String p : normalized.split("\\n\\s*\\n")) {
            String cleaned = p.trim();
            if (!cleaned.isBlank()) {
                paragraphs.add(cleaned);
            }
        }
        return paragraphs;
    }

    private List<String> splitIntoFour(String text) {
        List<String> parts = new ArrayList<>(List.of("", "", "", ""));
        if (text == null || text.isBlank()) {
            return parts;
        }

        String source = text.trim();
        int length = source.length();
        int chunk = (int) Math.ceil(length / 4d);
        for (int i = 0; i < 4; i++) {
            int start = i * chunk;
            if (start >= length) {
                parts.set(i, "");
                continue;
            }
            int end = Math.min((i + 1) * chunk, length);
            parts.set(i, source.substring(start, end).trim());
        }
        return parts;
    }

    private String cleanNarrative(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }

        StringBuilder cleaned = new StringBuilder();
        for (String rawLine : normalizeBreaks(text).split("\\n")) {
            String line = rawLine.trim();
            if (line.isBlank()) {
                cleaned.append("\n");
                continue;
            }

            if (line.matches("^={3,}$")) {
                continue;
            }

            String upper = line.toUpperCase(Locale.ROOT);
            if (upper.equals("AI-GENERATED MANAGEMENT REPORT")
                || upper.equals("SPRINT INFORMATION")
                || upper.equals("KPI METRICS")
                || upper.equals("TASKS SUMMARY")
                || upper.equals("AI-GENERATED INSIGHTS")) {
                continue;
            }

            if (METADATA_PATTERN.matcher(line).matches()) {
                continue;
            }

            cleaned.append(line).append("\n");
        }

        return cleaned.toString().trim();
    }

    private String normalizeBreaks(String text) {
        return text.replace("\r\n", "\n").replace("\r", "\n");
    }

    private boolean isKnownHeading(String line) {
        for (String heading : KNOWN_SECTION_HEADINGS) {
            if (isHeading(line, heading)) {
                return true;
            }
        }
        return false;
    }

    private boolean isHeading(String line, String heading) {
        String normalizedLine = normalizeHeading(line);
        String normalizedHeading = normalizeHeading(heading);
        if (normalizedLine.isBlank() || normalizedHeading.isBlank()) {
            return false;
        }
        return normalizedLine.equals(normalizedHeading)
            || normalizedLine.startsWith(normalizedHeading + " ")
            || normalizedLine.contains(normalizedHeading + ":")
            || normalizedLine.contains(normalizedHeading);
    }

    private String normalizeHeading(String source) {
        if (source == null) {
            return "";
        }
        String normalized = source.trim().toLowerCase(Locale.ROOT);
        normalized = normalized.replaceAll("^[#>*\\-\\s]+", "");
        normalized = normalized.replaceAll("^\\d+(?:\\.\\d+)*[.):-]?\\s*", "");
        normalized = normalized.replaceAll("[:\\-]+$", "");
        normalized = normalized.replaceAll("\\s+", " ");
        return normalized.trim();
    }

    private String escapeHtml(String text) {
        return text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;");
    }

    private String buildPageCss(Integer projectId, Integer sprintId) {
        String projectValue = String.valueOf(projectId != null ? projectId : "-");
        String sprintValue = String.valueOf(sprintId != null ? sprintId : "ALL");
        String footerPrefix = "Project " + projectValue + " | Sprint " + sprintValue + " | Page ";
        return "@page { size: letter; margin: 1in 1in 0.8in 1in;"
            + " @bottom-center {"
            + " content: \"" + escapeCss(footerPrefix) + "\" counter(page);"
            + " font-family: Arial, Helvetica, sans-serif;"
            + " font-size: 7.5pt;"
            + " color: #6b7280;"
            + " border-top: 0.5pt solid #e5e7eb;"
            + " padding-top: 6pt;"
            + " }"
            + "}"
            + "@page:first {"
            + " @bottom-center { content: \"\"; }"
            + "}";
    }

    private String escapeCss(String text) {
        return text.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private int intVal(Map<String, Object> m, String key, int def) {
        if (m == null) {
            return def;
        }
        Object v = m.get(key);
        return v instanceof Number ? ((Number) v).intValue() : def;
    }

    private double doubleVal(Map<String, Object> m, String key, double def) {
        if (m == null) {
            return def;
        }
        Object v = m.get(key);
        if (v instanceof Number) {
            return ((Number) v).doubleValue();
        }
        if (v instanceof String s) {
            try {
                return Double.parseDouble(s.trim());
            } catch (NumberFormatException ignored) {
                return def;
            }
        }
        return def;
    }

    private static final String CSS = """
        * {
            box-sizing: border-box;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            font-size: 10pt;
            line-height: 1.6;
        }

        .cover-page {
            padding-top: 180pt;
            text-align: center;
        }

        .cover-brand {
            font-size: 14pt;
            font-weight: bold;
            color: #6b7280;
            margin-bottom: 24pt;
        }

        .cover-line {
            width: 60%;
            border-top: 1pt solid #1e3a5f;
            margin: 0 auto;
        }

        .cover-title {
            font-size: 22pt;
            color: #1e3a5f;
            margin: 24pt 0 8pt 0;
            font-weight: bold;
        }

        .cover-subtitle {
            font-size: 11pt;
            color: #6b7280;
            margin: 0 0 48pt 0;
            font-style: italic;
        }

        .cover-meta-table {
            width: 60%;
            margin: 0 auto;
            border-collapse: collapse;
        }

        .cover-meta-table td {
            border-bottom: 1pt solid #e5e7eb;
            padding: 8pt 12pt;
        }

        .cover-meta-label {
            font-weight: bold;
            color: #6b7280;
            font-size: 9pt;
            text-align: left;
        }

        .cover-meta-value {
            font-size: 10pt;
            color: #111827;
            text-align: left;
        }

        .page {
            page-break-after: auto;
        }

        .page-break-before {
            page-break-before: always;
        }

        .page-header {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
        }

        .page-header td {
            padding: 0;
        }

        .header-left {
            font-size: 9pt;
            font-weight: bold;
            color: #1e3a5f;
            text-align: left;
        }

        .header-right {
            font-size: 8pt;
            color: #6b7280;
            text-align: right;
            text-transform: uppercase;
        }

        .header-meta {
            font-size: 8pt;
            color: #6b7280;
            padding-top: 2pt;
        }

        .header-meta-right {
            text-align: right;
        }

        .header-line {
            border-top: 1pt solid #1e3a5f;
            margin-bottom: 12pt;
        }

        .section-title {
            font-size: 12pt;
            font-weight: bold;
            color: #1e3a5f;
            text-transform: uppercase;
            margin: 0 0 4pt 0;
        }

        .sub-title {
            font-size: 10pt;
            font-weight: bold;
            color: #1e3a5f;
            margin: 16pt 0 4pt 0;
        }

        .section-divider {
            border-top: 2pt solid #1e3a5f;
            border-bottom: 0.5pt solid #e5e7eb;
            height: 0;
            margin: 0 0 10pt 0;
        }

        .sub-divider {
            border-top: 0.5pt solid #e5e7eb;
            margin: 0 0 8pt 0;
        }

        .body-text {
            margin: 0 0 8pt 0;
        }

        .kpi-grid-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 12pt 0;
        }

        .kpi-cell {
            width: 50%;
            background-color: #f8fafc;
            border: 1pt solid #e5e7eb;
            padding: 20pt;
        }

        .kpi-inner {
            width: 100%;
            border-collapse: collapse;
        }

        .kpi-inner td {
            text-align: center;
            border: none;
            padding: 0;
        }

        .kpi-value {
            font-size: 26pt;
            font-weight: bold;
            line-height: 1.2;
            padding-bottom: 3pt;
        }

        .kpi-label {
            font-size: 8pt;
            font-weight: bold;
            color: #6b7280;
            text-transform: uppercase;
            padding-bottom: 3pt;
        }

        .kpi-state {
            font-size: 8pt;
            padding-bottom: 2pt;
        }

        .kpi-note {
            font-size: 8pt;
            color: #6b7280;
        }

        .task-summary {
            margin-bottom: 14pt;
        }

        .done-cell {
            background-color: #dcfce7;
            color: #16a34a;
            font-weight: bold;
        }

        .report-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 20pt 0;
        }

        .report-table th {
            border: 1pt solid #e5e7eb;
            background-color: #1e3a5f;
            color: #ffffff;
            font-size: 9pt;
            font-weight: bold;
            text-transform: uppercase;
            text-align: left;
            padding: 8pt 12pt;
        }

        .report-table td {
            border: 1pt solid #e5e7eb;
            font-size: 9pt;
            color: #111827;
            padding: 8pt 12pt;
        }

        .report-table tbody tr:nth-child(even) td {
            background-color: #f1f5f9;
        }

        .total-row td {
            font-weight: bold;
            background-color: #ffffff;
            color: #1e3a5f;
        }

        .total-row td * {
            color: #1e3a5f;
        }

        .label-cell {
            width: 180pt;
            font-weight: bold;
        }

        .narrative-panel {
            border: 1pt solid #e5e7eb;
            background-color: #ffffff;
            padding: 10pt 12pt;
            margin-bottom: 10pt;
        }

        .narrative-panel ul,
        .narrative-panel ol {
            margin: 0 0 8pt 16pt;
            padding: 0;
        }

        .narrative-panel li {
            margin: 0 0 4pt 0;
        }

        .vs-positive {
            color: #16a34a;
            font-weight: bold;
        }

        .doc-control-table {
            width: 60%;
            border-collapse: collapse;
            margin-bottom: 14pt;
        }

        .doc-control-table th,
        .doc-control-table td {
            border: 1pt solid #e5e7eb;
            padding: 8pt 12pt;
            font-size: 9pt;
        }

        .doc-control-table th {
            background-color: #1e3a5f;
            color: #ffffff;
            text-transform: uppercase;
            font-weight: bold;
            text-align: left;
        }

        .disclaimer-table {
            width: 100%;
            border-collapse: collapse;
        }

        .disclaimer-cell {
            background-color: #fef9c3;
            border: 1pt solid #d97706;
            color: #111827;
            font-size: 9pt;
            line-height: 1.5;
            padding: 12pt;
        }
    """;
}