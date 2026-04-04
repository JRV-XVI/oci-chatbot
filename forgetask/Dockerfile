# Multi-stage build for the Spring Boot backend (forgetask)
# Builds the JAR with Maven and runs it on a slim JRE image.

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Leverage Docker layer caching for dependencies.
COPY pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline

# Copy sources and build.
COPY src ./src
RUN mvn -B -DskipTests package


FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup --system --gid 1001 appgroup \
 && adduser  --system --uid 1001 --ingroup appgroup appuser

COPY --from=build --chown=appuser:appgroup /app/target/*.jar ./app.jar

USER appuser

# Spring Boot default port (matches the legacy project).
EXPOSE 8080

ENV JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -XX:+UseG1GC \
               -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]