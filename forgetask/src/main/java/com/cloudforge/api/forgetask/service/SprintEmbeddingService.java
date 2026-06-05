package com.cloudforge.api.forgetask.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class SprintEmbeddingService {

    private static final Logger logger = LoggerFactory.getLogger(SprintEmbeddingService.class);

    private static final String UPSERT_SPRINT_EMBEDDING_SQL = """
            MERGE INTO SPRINT_EMBEDDINGS tgt
            USING (
                SELECT
                    :idSprint   AS id_sprint,
                    :idProject  AS id_project,
                    :title      AS sprint_title,
                    :chunkText  AS chunk_text,
                    VECTOR_EMBEDDING(ADMIN.ALL_MINILM_L12_V2 USING :chunkText AS DATA) AS emb
                FROM DUAL
            ) src ON (tgt.ID_SPRINT = src.id_sprint)
            WHEN MATCHED THEN
                UPDATE SET
                    tgt.CHUNK_TEXT  = src.chunk_text,
                    tgt.EMBEDDING   = src.emb,
                    tgt.CLOSED_AT   = SYSTIMESTAMP
            WHEN NOT MATCHED THEN
                INSERT (ID_SPRINT, ID_PROJECT, SPRINT_TITLE, CHUNK_TEXT, EMBEDDING)
                VALUES (src.id_sprint, src.id_project, src.sprint_title, src.chunk_text, src.emb)
            """;

    private final NamedParameterJdbcTemplate vectorJdbcTemplate;
    private final SprintChunkBuilder sprintChunkBuilder;

    public SprintEmbeddingService(
            @Qualifier("vectorJdbcTemplate") NamedParameterJdbcTemplate vectorJdbcTemplate,
            SprintChunkBuilder sprintChunkBuilder
    ) {
        this.vectorJdbcTemplate = vectorJdbcTemplate;
        this.sprintChunkBuilder = sprintChunkBuilder;
    }

    public void indexSprint(Long idSprint, Long idProject, String sprintTitle) {
        try {
            String chunkText = sprintChunkBuilder.buildSprintChunk(idSprint);

            MapSqlParameterSource params = new MapSqlParameterSource()
                    .addValue("idSprint", idSprint)
                    .addValue("idProject", idProject)
                    .addValue("title", sprintTitle)
                    .addValue("chunkText", chunkText);

            int updated = vectorJdbcTemplate.update(UPSERT_SPRINT_EMBEDDING_SQL, params);
            logger.info("Indexed sprint embedding idSprint={} idProject={} rows={}", idSprint, idProject, updated);

        } catch (Exception e) {
            // Do not rethrow: sprint closing must not fail because of indexing.
            logger.error(
                    "Failed to index sprint embedding idSprint={} idProject={}: {}",
                    idSprint,
                    idProject,
                    e.getMessage(),
                    e
            );
        }
    }
}
