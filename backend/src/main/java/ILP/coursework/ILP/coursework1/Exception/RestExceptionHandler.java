package ILP.coursework.ILP.coursework1.Exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;

// using the annotation below to avoid using try-catches everywhere
@ControllerAdvice
public class RestExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(RestExceptionHandler.class);



    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Void> handleValidationExceptions(MethodArgumentNotValidException ex) {

        logger.warn("Syntactic validation failed for request.", ex);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();

    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Void> handleIllegalArgumentException(IllegalArgumentException ex) {

        logger.warn("Semantic validation failed for request.", ex);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();

    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Void> handleGenericException(Exception ex) {

        logger.error("An unexpected error occurred processing a request.", ex);

        // The spec requires a 400 for any error
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }
}
