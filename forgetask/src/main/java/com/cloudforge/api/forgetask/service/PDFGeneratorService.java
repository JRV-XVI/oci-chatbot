package com.cloudforge.api.forgetask.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Service to generate PDF files from report content using Apache PDFBox
 */
@Service
public class PDFGeneratorService {
    private static final Logger logger = LoggerFactory.getLogger(PDFGeneratorService.class);
    private static final float MARGIN = 40;
    private static final float LINE_SPACING = 12;
    private static final PDRectangle PAGE_SIZE = PDRectangle.A4;

    /**
     * Generate PDF from report content
     * @param reportContent The text content of the report
     * @param projectId Project identifier
     * @param sprintId Sprint identifier
     * @return PDF file as byte array
     */
    public byte[] generatePDF(String reportContent, Integer projectId, Integer sprintId) throws Exception {
        try {
            PDDocument document = new PDDocument();
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            
            addContentToDocument(document, reportContent, projectId, sprintId);
            
            document.save(output);
            document.close();

            byte[] pdfBytes = output.toByteArray();
            logger.info("PDF generated successfully using PDFBox. Size: {} bytes", pdfBytes.length);
            return pdfBytes;

        } catch (IOException e) {
            logger.error("Error generating PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate PDF: " + e.getMessage(), e);
        }
    }

    /**
     * Add content to PDF document
     */
    private void addContentToDocument(PDDocument document, String reportContent, Integer projectId, Integer sprintId) throws IOException {
        PDPage page = new PDPage(PAGE_SIZE);
        document.addPage(page);

        float yPosition = PAGE_SIZE.getHeight() - MARGIN;

        PDFont titleFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        PDFont regularFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            // Title
            contentStream.beginText();
            contentStream.setFont(titleFont, 16);
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText("AI-Generated Management Report");
            contentStream.endText();
            yPosition -= LINE_SPACING * 2;

            // Metadata
            String metadata = String.format("Project: %d | Sprint: %d | Generated: %s",
                projectId != null ? projectId : 0,
                sprintId != null ? sprintId : 0,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            
            contentStream.beginText();
            contentStream.setFont(regularFont, 9);
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText(metadata);
            contentStream.endText();
            yPosition -= LINE_SPACING * 2;

            // Content lines
            String[] lines = reportContent.split("\n");
            for (String line : lines) {
                // Check if we need a new page
                if (yPosition < MARGIN + LINE_SPACING) {
                    page = new PDPage(PAGE_SIZE);
                    document.addPage(page);
                    yPosition = PAGE_SIZE.getHeight() - MARGIN;
                    // Note: new page, new stream needed
                    continue;
                }

                // Truncate long lines
                String displayLine = line.length() > 90 ? line.substring(0, 90) + "..." : line;

                contentStream.beginText();
                contentStream.setFont(regularFont, 10);
                contentStream.newLineAtOffset(MARGIN, yPosition);
                contentStream.showText(displayLine);
                contentStream.endText();

                yPosition -= LINE_SPACING;
            }

            // Footer
            yPosition -= LINE_SPACING;
            String footer = "This is an AI-generated report. Please review for accuracy before distribution.";
            contentStream.beginText();
            contentStream.setFont(regularFont, 8);
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText(footer);
            contentStream.endText();
        }
    }

    /**
     * Generate filename for the report
     * @param projectId Project identifier
     * @param sprintId Sprint identifier
     * @return Filename with naming convention
     */
    public String generateFilename(Integer projectId, Integer sprintId) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String sprintPart = sprintId != null ? "Sprint_" + sprintId : "AllSprints";
        return String.format("Report_%s_%s.pdf", sprintPart, timestamp);
    }
}
