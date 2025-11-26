package ILP.coursework.ILP.coursework1.Controllers;

import ILP.coursework.ILP.coursework1.Exception.RestExceptionHandler;
import ILP.coursework.ILP.coursework1.Service.GeometryService;
import ILP.coursework.ILP.coursework1.dto.JsonDtos;
import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ServiceControllerTest {
    private MockMvc mockMvc;

    @Mock
    private GeometryService geometryService;

    @InjectMocks
    private ServiceController serviceController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        // Manually build the MockMvc instance
        mockMvc = MockMvcBuilders.standaloneSetup(serviceController)
                .setControllerAdvice(new RestExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /uid should return student ID with status 200")
    void uidShouldReturnOk() throws Exception {
        mockMvc.perform(get("/api/v1/uid"))
                .andExpect(status().isOk())
                .andExpect(content().string("s2479386"));
    }

    @Test
    @DisplayName("POST /distanceTo with valid JSON should return a calculated value with status 200")
    void distanceToWithValidJson() throws Exception {
        JsonDtos.TwoPositionRequest request = new JsonDtos.TwoPositionRequest(
                new Position(-3.0, 55.0), new Position(-4.0, 56.0)
        );
        double expectedDistance = 1.414;
        when(geometryService.calculateDistance(any(Position.class), any(Position.class))).thenReturn(expectedDistance);

        mockMvc.perform(post("/api/v1/distanceTo").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string(String.valueOf(expectedDistance)));
    }

    @Test
    @DisplayName("POST /isCloseTo should call service and return true with 200 OK")
    void isCloseToShouldReturnTrue() throws Exception {
        JsonDtos.TwoPositionRequest request = new JsonDtos.TwoPositionRequest(
                new Position(-3.0, 55.0), new Position(-3.0, 55.0001)
        );
        when(geometryService.checkPointsClose(any(), any())).thenReturn(true);

        mockMvc.perform(post("/api/v1/isCloseTo")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }


    @Test
    @DisplayName("POST /nextPosition when service throws exception should return status 400")
    void nextPositionWithSemanticError() throws Exception {
        JsonDtos.NextPositionRequest request = new JsonDtos.NextPositionRequest(
                new Position(-3.0, 55.0), 46.0 // Invalid angle
        );
        when(geometryService.calculateNextPosition(any(Position.class), any(Double.class)))
                .thenThrow(new IllegalArgumentException("Invalid angle."));

        mockMvc.perform(post("/api/v1/nextPosition")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /isInRegion with a valid request should call service and return result with 200 OK")
    void isInRegionShouldReturnTrue() throws Exception {
        //Create a request with valid region (non-empty and closed list of vertices)
        JsonDtos.IsInRegionRequest request = new JsonDtos.IsInRegionRequest(
                new Position(0.0, 0.0),
                new JsonDtos.Region("test square", List.of(
                        new Position(-1.0, -1.0),
                        new Position(1.0, -1.0),
                        new Position(1.0, 1.0),
                        new Position(-1.0, 1.0),
                        new Position(-1.0, -1.0)
                ))
        );

        when(geometryService.isPointInRegion(any(), any())).thenReturn(true);

        mockMvc.perform(post("/api/v1/isInRegion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk()) // Now it should be 200 OK
                .andExpect(content().string("true"));
    }
}