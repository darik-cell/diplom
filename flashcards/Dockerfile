FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /
COPY pom.xml .
RUN mvn dependency:go-offline
COPY /src /src
RUN mvn -Djava.net.preferIPv4Stack=true clean package -DskipTests

FROM openjdk:17-jdk-slim
COPY --from=build /target/*.jar application.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "application.jar"]

