package ILP.coursework.ILP.coursework1.dto;

import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ServicePoint(
        Long id,
        String name,
        Position location
) {}