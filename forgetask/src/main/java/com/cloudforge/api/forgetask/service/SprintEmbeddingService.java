// forgetask/src/main/java/com/cloudforge/api/forgetask/service/SprintEmbeddingService.java
package com.cloudforge.api.forgetask.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class SprintEmbeddingService {

    private static final Logger logger = LoggerFactory.getLogger(SprintEmbeddingService.class);

    private final JdbcTemplate jdbcTemplate;
    private final SprintChunkBuilder chunkBuilder;

    public SprintEmbeddingService(JdbcTemplate jdbcTemplate, SprintChunkBuilder chunkBuilder) {
        this.jdbcTemplate = jdbcTemplate;
        this.chunkBuilder = chunkBuilder;
    }

    /**
     * Vectoriza y persiste el chunk del sprint en SPRINT_EMBEDDINGS.
     * Usa MERGE para que sea idempotente: si ya existe lo actualiza.
     * 
     * IMPORTANTE: No relanza excepciones. El cierre del sprint no debe
     * fallar por un error de indexación.
     */
    public void indexSprint(int idSprint, int idProject, String sprintTitle) {
        try {
            String chunkText = chunkBuilder.buildSprintChunk(idSprint);

            // VECTOR_EMBEDDING con prefijo ADMIN porque el modelo fue importado
            // en el schema ADMIN y APP_USER lo accede con ese prefijo.
            String sql = """
                MERGE INTO SPRINT_EMBEDDINGS tgt
                USING (
                    SELECT
                        ?                AS id_sprint,
                        ?                AS id_project,
                        ?                AS sprint_title,
                        ?                AS chunk_text,
                        VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING ? AS DATA) AS emb
                    FROM DUAL
                ) src ON (tgt.ID_SPRINT = src.id_sprint)
                WHEN MATCHED THEN
                    UPDATE SET
                        tgt.CHUNK_TEXT  = src.chunk_text,
                        tgt.EMBEDDING   = src.emb,
                        tgt.CLOSED_AT   = SYSTIMESTAMP
                WHEN NOT MATCHED THEN
                    INSERT (ID_SPRINT, ID_PROJECT, SPRINT_TITLE, CHUNK_TEXT, EMBEDDING)
                    VALUES (src.id_sprint, src.id_project, src.sprint_title,
                            src.chunk_text, src.emb)
                """;

            jdbcTemplate.update(sql,
                idSprint, idProject, sprintTitle, chunkText, chunkText
            );

            logger.info("Sprint {} indexado correctamente en SPRINT_EMBEDDINGS.", idSprint);

        } catch (Exception e) {
            logger.error("Error al indexar sprint {} en vector DB: {}", idSprint, e.getMessage(), e);
            // No relanzar — el sprint ya quedó CLOSED en la DB. La indexación
            // puede reintentarse manualmente si es necesario.
        }
    }
}