# ==========================================
# Stage 1: Build & Extract Layers
# ==========================================
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests package

WORKDIR /app/extracted
RUN java -Djarmode=layertools -jar /app/target/*.jar extract

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup --system --gid 1001 appgroup \
 && adduser --system --uid 1001 --ingroup appgroup appuser

COPY --from=build --chown=appuser:appgroup /app/extracted/dependencies/ ./
COPY --from=build --chown=appuser:appgroup /app/extracted/spring-boot-loader/ ./
COPY --from=build --chown=appuser:appgroup /app/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=appuser:appgroup /app/extracted/application/ ./

USER appuser

EXPOSE 8080

ENV JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -XX:+UseG1GC \
               -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]