# oci-chatbot

A Spring Boot–based Telegram chatbot backed by an Oracle Autonomous Database, deployed on Oracle Cloud Infrastructure (OCI).

## Tech Stack

| Component        | Version      |
|-----------------|--------------|
| **Spring Boot** | **3.5.6**    |
| Java            | 11           |
| Oracle JDBC     | ojdbc11-production 23.9.0.25.07 |
| Telegram Bots   | 9.1.0        |
| Lombok          | 1.18.30      |

## Spring Boot Version

This project uses **Spring Boot 3.5.6** (`spring-boot-starter-parent` version `3.5.6`).
You can verify this in [`MtdrSpring/backend/pom.xml`](MtdrSpring/backend/pom.xml):

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.5.6</version>
</parent>
```

## Project Structure

```
MtdrSpring/
  backend/       # Spring Boot application (Maven)
  terraform/     # OCI infrastructure as code
  utils/         # Helper utilities
```