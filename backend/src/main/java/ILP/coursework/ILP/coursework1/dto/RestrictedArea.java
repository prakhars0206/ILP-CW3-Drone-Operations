package ILP.coursework.ILP.coursework1.dto;

import ILP.coursework.ILP.coursework1.dto.JsonDtos.Position;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RestrictedArea(
        String name,
        Long id,
        List<Position> vertices
) {}