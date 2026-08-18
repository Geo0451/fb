# Stage 1: Build the JAR using Java 25
FROM openjdk:25-ea-jdk-slim AS builder
WORKDIR /app

# Copy Maven wrapper and configuration
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw

# Download dependencies first (caching layer)
RUN ./mvnw dependency:go-offline

# Copy source code and frontend assets
COPY src ./src
COPY frontend ./src/main/resources/static

# Build executable JAR without running tests
RUN ./mvnw clean package -DskipTests

# Stage 2: Create runtime container using Java 25
FROM openjdk:25-ea-slim
WORKDIR /app

# Copy built JAR from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose port (Render sets $PORT dynamically)
EXPOSE 8080

# Start app
ENTRYPOINT ["java", "-jar", "app.jar"]