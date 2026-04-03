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


FROM eclipse-temurin:21-jre
WORKDIR /app

# Spring Boot default port (matches the legacy project).
EXPOSE 8080

# Copy the packaged Spring Boot JAR.
COPY --from=build /app/target/*.jar ./app.jar

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
