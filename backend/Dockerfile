FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd -r -u 10001 crm
COPY --from=build /app/target/*.jar app.jar
USER crm
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
