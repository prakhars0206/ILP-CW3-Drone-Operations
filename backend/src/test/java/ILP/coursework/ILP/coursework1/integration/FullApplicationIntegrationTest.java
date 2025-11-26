package ILP.coursework.ILP.coursework1.integration;

import ILP.coursework.ILP.coursework1.dto.JsonDtos;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.closeTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
class FullApplicationIntegrationTest {

    // Spring will inject the fully configured MockMvc bean for us.
    @Autowired
    private MockMvc mockMvc;

    // We also get the application's real ObjectMapper for creating JSON.
    @Autowired
    private ObjectMapper objectMapper;

    @Nested
    @DisplayName("Application Health and Info Endpoints")
    class HealthAndInfoTests {
        @Test
        @DisplayName("GET /actuator/health should prove the application is running and healthy")
        void healthCheckShouldReturnUp() throws Exception {
            mockMvc.perform(get("/actuator/health")).andExpect(status().isOk())
                    // jsonPath allows us to inspect specific fields in the JSON response
                    .andExpect(jsonPath("$.status").value("UP"));
        }

        @Test
        @DisplayName("GET /api/v1/uid should return the correct student ID")
        void getUid() throws Exception {
            mockMvc.perform(get("/api/v1/uid")).andExpect(status().isOk())
                    .andExpect(content().string("s2479386"));
        }
    }

    @Nested
    @DisplayName("POST /api/v1/distanceTo")
    class DistanceToIntegrationTests {
        @Test
        @DisplayName("should return the correct distance for a valid request")
        void distanceTo_ValidRequest() throws Exception {
            // create valid DTO request
            JsonDtos.TwoPositionRequest request = new JsonDtos.TwoPositionRequest(
                    new Position(-3.0, 55.0), new Position(-4.0, 56.0)
            );

            // This request then goes through the real controller and service
            mockMvc.perform(post("/api/v1/distanceTo")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    // Verify the response body has the correct values calculated by the real service
                    .andExpect(jsonPath("$", closeTo(Math.sqrt(2), 1e-9)));
        }

        @Test
        @DisplayName("should return 400 for a syntactically invalid request (missing field)")
        void distanceTo_InvalidJson_MissingField() throws Exception {
            // missing lat field
            String invalidJson = """
            {
                "position1": { "lng": -3.0 },
                "position2": { "lng": -4.0, "lat": 56.0 }
            }
            """;

            mockMvc.perform(post("/api/v1/distanceTo")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(invalidJson))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 for a request where a Position object is null")
        void distanceTo_InvalidJson_NullPositionObject() throws Exception {
            String invalidJson = "{\"position1\": {\"lng\":-3.0, \"lat\":55.0}, \"position2\": null}";
            mockMvc.perform(post("/api/v1/distanceTo")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(invalidJson))
                    .andExpect(status().isBadRequest());
        }

    }

    @Nested
    @DisplayName("POST /api/v1/isCloseTo")
    class IsCloseToIntegrationTests {
        @Test
        @DisplayName("should return true for a valid request with close points")
        void isCloseToValidAndTrue() throws Exception {
            // create valid DTO request
            JsonDtos.TwoPositionRequest request = new JsonDtos.TwoPositionRequest(
                    new Position(-3.0, 55.0), new Position(-3.0, 55.0001)
            );

            // This request then goes through the real controller and service
            mockMvc.perform(post("/api/v1/isCloseTo").contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))).andExpect(status().isOk())
                    .andExpect(content().string("true"));
        }

        @Test
        @DisplayName("should return 400 for a syntactically invalid JSON body (null field)")
        void isCloseToInvalidJson() throws Exception {
            String invalidJson = "{\"position1\":null,\"position2\":{\"lng\":-4.0,\"lat\":56.0}}";

            // @Valid annotation will fail, triggering the exception handler
            mockMvc.perform(post("/api/v1/isCloseTo").contentType(MediaType.APPLICATION_JSON)
                            .content(invalidJson)).andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST /api/v1/nextPosition")
    class NextPositionIntegrationTests {
        @Test
        @DisplayName("should return a new position for a valid request")
        void nextPositionValid() throws Exception {
            // create valid DTO request
            JsonDtos.NextPositionRequest request = new JsonDtos.NextPositionRequest(
                    new Position(-3.0, 55.0), 90.0
            );

            // This request then goes through the real controller and service
            mockMvc.perform(post("/api/v1/nextPosition").contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))).andExpect(status().isOk())
                    // Verify the response body has the correct values calculated by the real service
                    .andExpect(jsonPath("$.lng").value(-3.0))
                    .andExpect(jsonPath("$.lat").value(55.00015));
        }

        @Test
        @DisplayName("should return 400 for a semantically invalid angle")
        void nextPositionInvalidAngle() throws Exception {
            // request with invalid angle
            JsonDtos.NextPositionRequest request = new JsonDtos.NextPositionRequest(
                    new Position(-3.0, 55.0), 46.0
            );

            // the real service will throw an exception, and the real exception handler will catch it
            mockMvc.perform(post("/api/v1/nextPosition").contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))).andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST /api/v1/isInRegion")
    class IsInRegionIntegrationTests {
        @Test
        @DisplayName("should return true for a point inside a valid region")
        void isInRegionValidAndTrue() throws Exception {
            // create valid DTO request
            JsonDtos.IsInRegionRequest request = new JsonDtos.IsInRegionRequest(
                    new Position(0.0, 0.0),
                    new JsonDtos.Region("square", List.of(
                            new Position(-1.0, -1.0), new Position(1.0, -1.0),
                            new Position(1.0, 1.0), new Position(-1.0, 1.0),
                            new Position(-1.0, -1.0)
                    ))
            );

            // This request then goes through the real controller and service
            mockMvc.perform(post("/api/v1/isInRegion").contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))).andExpect(status().isOk())
                    .andExpect(content().string("true"));
        }

        @Test
        @DisplayName("should return 400 for a semantically invalid (unclosed) region")
        void isInRegionInvalidRegion() throws Exception {
            // request with invalid (unclosed) region
            JsonDtos.IsInRegionRequest request = new JsonDtos.IsInRegionRequest(
                    new Position(0.0, 0.0),
                    new JsonDtos.Region("unclosed", List.of(
                            new Position(-1.0, -1.0), new Position(1.0, -1.0)
                    ))
            );

            // the real service will throw an exception, and the real exception handler will catch it
            mockMvc.perform(post("/api/v1/isInRegion").contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))).andExpect(status().isBadRequest());
        }
    }
}