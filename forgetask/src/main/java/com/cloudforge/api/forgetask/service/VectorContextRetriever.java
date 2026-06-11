// forgetask/src/main/java/com/cloudforge/api/forgetask/service/VectorContextRetriever.java
package com.cloudforge.api.forgetask.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class VectorContextRetriever {

    private static final Logger logger = LoggerFactory.getLogger(VectorContextRetriever.class);

    private final JdbcTemplate jdbcTemplate;

    @Value("${rag.vector.top-k:5}")
    private int topK;

    public VectorContextRetriever(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Recupera los K sprints históricos más similares semánticamente al sprint actual.
     * Excluye el sprint que se está reportando para no compararlo consigo mismo.
     *
     * @param queryText      El chunk del sprint actual (texto a vectorizar para la búsqueda)
     * @param excludeSprintId ID del sprint actual (excluido de los resultados)
     * @param idProject      ID del proyecto (filtra solo sprints del mismo proyecto)
     */
    public List<String> retrieveSprintContext(String queryText, int excludeSprintId, int idProject) {
        try {
            String sql = """
                SELECT CHUNK_TEXT
                FROM SPRINT_EMBEDDINGS
                WHERE ID_PROJECT = ?
                  AND ID_SPRINT  != ?
                ORDER BY VECTOR_DISTANCE(
                    EMBEDDING,
                    VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING ? AS DATA),
                    COSINE
                )
                FETCH FIRST ? ROWS ONLY
                """;

            List<String> results = jdbcTemplate.queryForList(
                sql, String.class,
                idProject, excludeSprintId, queryText, topK
            );

            logger.info("RAG: recuperados {} chunks históricos para sprint {} / proyecto {}",
                results.size(), excludeSprintId, idProject);

            return results;

        } catch (Exception e) {
            logger.error("Error en búsqueda vectorial para sprint {}: {}", excludeSprintId, e.getMessage(), e);
            return Collections.emptyList();
        }
    }
}