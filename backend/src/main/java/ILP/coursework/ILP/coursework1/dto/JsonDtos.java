package ILP.coursework.ILP.coursework1.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.hibernate.validator.constraints.Range;

import java.util.List;

public class JsonDtos {

    /**
     * Represent geographical positions with longitude/latitude
     */
    public record Position(
            @NotNull
            @Min(value = -180)
            @Max(value = 180)
            Double lng,

            @NotNull()
            @Min(value = -90)
            @Max(value = 90)
            Double lat
    ) {}

    /**
     * Represents a polygon region defined by a name and a list of vertices.
     */
    public record Region(
            @NotNull String name,
            @NotEmpty List<@Valid Position> vertices
    ) {}


    // Request bodies

    /**
     * Request for /distanceTo and  /isCloseTo endpoint
     */
    public record TwoPositionRequest(
            @NotNull @Valid Position position1,
            @NotNull @Valid Position position2
    ) {}

    /**
     * Request for /nextPosition endpoint.
     */
    public record NextPositionRequest(
            @NotNull @Valid Position start,
            @NotNull @Range(min = 0, max = 360) Double angle
    ) {}

    /**
     * Request for /isInRegion endpoint.
     */
    public record IsInRegionRequest(
            @NotNull @Valid Position position,
            @NotNull @Valid Region region
    ) {}


    /**
     * Represents a medication dispatch record for delivery requests
     */
    public record MedDispatchRec(
            Long id,
            String date,
            String time,
            Requirements requirements,
            Position delivery // The delivery destination, added from the clarification
    ) {
        public record Requirements(
                double capacity,
                Boolean cooling,
                Boolean heating,
                Double maxCost
        ) {}
    }

    public record Query(
            String attribute,
            String operator,
            String value
    ) {}


}
