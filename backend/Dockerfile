#
# Build stage
#
# Use an official Maven image that includes the JDK for building
FROM maven:3.9.9-amazoncorretto-21-debian AS build
WORKDIR /app

# Copy the project definition and source code
COPY pom.xml .
COPY src ./src

# Build the application, creating the JAR file
RUN mvn clean package -DskipTests

#
# Final stage

# Use a clean Java runtime image
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copy only the built JAR file from the 'build' stage
# The wildcard (*) makes it robust to version number changes.
COPY --from=build /app/target/ILP-coursework-1*.jar app.jar

# Expose the port the application runs on
EXPOSE 8080


# The command to run the application when the container starts
CMD ["java", "-jar", "app.jar"]