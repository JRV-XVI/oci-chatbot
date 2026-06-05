package com.cloudforge.api.forgetask.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VectorContextRetriever {

    private static final Logger logger = LoggerFactory.getLogger(VectorContextRetriever.class);

    private static final String RETRIEVE_CONTEXT_SQL = """
            SELECT CHUNK_TEXT
            FROM SPRINT_EMBEDDINGS
            WHERE ID_PROJECT = :idProject
              AND ID_SPRINT  != :excludeId
            ORDER BY VECTOR_DISTANCE(
                EMBEDDING,
                VECTOR_EMBEDDING(ADMIN.ALL_MINILM_L12_V2 USING :queryText AS DATA),
                COSINE
            )
            FETCH FIRST :topK ROWS ONLY
            """;

    private final NamedParameterJdbcTemplate vectorJdbcTemplate;

    @Value("${rag.vector.top-k:5}")
    private int topK;

    public VectorContextRetriever(@Qualifier("vectorJdbcTemplate") NamedParameterJdbcTemplate vectorJdbcTemplate) {
        this.vectorJdbcTemplate = vectorJdbcTemplate;
    }

    public List<String> retrieveSprintContext(String queryText, Long excludeSprintId, Long idProject) {
        if (queryText == null) {
            queryText = "";
        }
        if (excludeSprintId == null || idProject == null) {
            return List.of();
        }

        try {
            MapSqlParameterSource params = new MapSqlParameterSource()
                    .addValue("idProject", idProject)
                    .addValue("excludeId", excludeSprintId)
                    .addValue("queryText", queryText)
                    .addValue("topK", topK);

            List<String> rows = vectorJdbcTemplate.query(
                    RETRIEVE_CONTEXT_SQL,
                    params,
                    (rs, rowNum) -> rs.getString("CHUNK_TEXT")
            );

            return rows != null ? rows : List.of();
        } catch (Exception e) {
            logger.error(
                    "Failed to retrieve sprint context idProject={} excludeSprintId={}: {}",
                    idProject,
                    excludeSprintId,
                    e.getMessage(),
                    e
            );
            return List.of();
        }
    }
}
