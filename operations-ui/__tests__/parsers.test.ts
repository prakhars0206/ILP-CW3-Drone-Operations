import { extractLocation, parseCostFromMessage } from '../lib/messageParser';

describe('QA4: Location Parser Robustness (Unit Level)', () => {
  
  describe('TC-QA4-01: Coordinates match known hospitals', () => {
    test('should map Western General Hospital coordinates', () => {
      const text = 'Delivery to -3.2351, 55.9623';
      expect(extractLocation(text)).toBe('Western General Hospital');
    });

    test('should map Royal Infirmary coordinates', () => {
      const text = 'Location: -3.1365, 55.9215';
      expect(extractLocation(text)).toBe('Royal Infirmary of Edinburgh');
    });

    test('should map St Johns Hospital coordinates', () => {
      const text = 'Coordinates -3.5103, 55.9297';
      expect(extractLocation(text)).toBe("St John's Hospital");
    });
  });

  describe('TC-QA4-02: Tolerance boundary testing', () => {
    test('should match at exactly tolerance boundary', () => {
      const text = 'Coordinates: -3.2371, 55.9623'; // +0.002° from Western General
      expect(extractLocation(text)).toBe('Western General Hospital');
    });

    test('should not match beyond tolerance', () => {
      const text = 'Coordinates: -3.2372, 55.9623'; // +0.0021° (too far)
      expect(extractLocation(text)).toBe('Unknown Location');
    });
  });

  describe('TC-QA4-03: Invalid input handling', () => {
    test('should handle no coordinates in text', () => {
      expect(extractLocation('Deliver to hospital')).toBe('Unknown Location');
    });

    test('should handle empty string', () => {
      expect(extractLocation('')).toBe('Unknown Location');
    });

    test('should handle malformed coordinates', () => {
      expect(extractLocation('Location: abc, def')).toBe('Unknown Location');
    });

    test('should handle out of range coordinates', () => {
      expect(extractLocation('Coords: -200, 100')).toBe('Unknown Location');
    });
  });

  describe('TC-QA4-04: Edge cases', () => {
    test('should handle coordinates with extra whitespace', () => {
      const text = 'Location:   -3.2351  ,   55.9623  ';
      expect(extractLocation(text)).toBe('Western General Hospital');
    });

    test('should use first coordinate pair when multiple present', () => {
      const text = 'From -3.2087, 55.9235 to -3.1365, 55.9215';
      const result = extractLocation(text);
      // Should match first coords (Royal Edinburgh Hospital)
      expect(result).toBe('Royal Edinburgh Hospital');
    });
  });
});

describe('QA5: Cost Parser Robustness (Unit Level)', () => {
  
  describe('TC-QA5-01: Single drone extraction', () => {
    test('should extract single drone and cost', () => {
      const text = 'Drone: Drone #5\nTotal Cost: £12.50';
      const result = parseCostFromMessage(text);
      
      expect(result).not.toBeNull();
      expect(result?.drones).toEqual(['5']);
      expect(result?.cost).toBe(12.50);
    });

    test('should handle drone without # symbol', () => {
      const text = 'Drone: 3\nCost: £8.99';
      const result = parseCostFromMessage(text);
      
      expect(result?.drones).toContain('3');
      expect(result?.cost).toBe(8.99);
    });

    test('should extract cost without pound symbol', () => {
      const text = 'Drone #7\nTotal Cost: 15.25';
      const result = parseCostFromMessage(text);
      
      expect(result?.cost).toBe(15.25);
    });
  });

  describe('TC-QA5-02: Multiple drones extraction', () => {
    test('should extract two drones from "Used" format', () => {
      const text = 'Drones Used: #9 and #1\nTotal Cost: £25.00';
      const result = parseCostFromMessage(text);
      
      expect(result?.drones).toEqual(['9', '1']);
      expect(result?.cost).toBe(25.00);
    });

    test('should handle "Drones Used" with numbers', () => {
      const text = 'Drones Used: 2 and 5\nCost: £42.30';
      const result = parseCostFromMessage(text);
      
      expect(result?.drones).toHaveLength(2);
      expect(result?.drones).toContain('2');
      expect(result?.drones).toContain('5');
    });
  });

  describe('TC-QA5-03: Missing data handling', () => {
    test('should return null if no cost found', () => {
      const text = 'Using Drone #5 for delivery';
      const result = parseCostFromMessage(text);
      
      expect(result).toBeNull();
    });

    test('should handle cost without drone info', () => {
      const text = 'Total Cost: £15.00';
      const result = parseCostFromMessage(text);
      
      expect(result?.cost).toBe(15.00);
      expect(result?.drones).toBeUndefined();
    });

    test('should return null for empty string', () => {
      expect(parseCostFromMessage('')).toBeNull();
    });

    test('should return null for irrelevant text', () => {
      expect(parseCostFromMessage('Hello world')).toBeNull();
    });
  });

  describe('TC-QA5-04: Format variations', () => {
    test('should handle comma in large numbers', () => {
      const text = 'Total Cost: £1,234.56';
      const result = parseCostFromMessage(text);
      
      expect(result?.cost).toBe(1234.56);
    });

    test('should handle "Cost:" with colon', () => {
      const text = 'Drone #8\nCost: £0.99';
      const result = parseCostFromMessage(text);
      
      expect(result?.cost).toBe(0.99);
    });

    test('should handle cost with just pence', () => {
      const text = 'Total Cost: £0.50';
      const result = parseCostFromMessage(text);
      
      expect(result?.cost).toBe(0.50);
    });
  });

  describe('TC-QA5-05: Edge cases', () => {
    test('should handle large costs', () => {
      const text = 'Total Cost: £999.99';
      const result = parseCostFromMessage(text);
      
      expect(result?.cost).toBe(999.99);
    });

    test('should handle zero cost', () => {
      const text = 'Cost: £0.00';
      const result = parseCostFromMessage(text);
      
      expect(result?.cost).toBe(0);
    });

    test('should handle integer costs without decimals', () => {
      const text = 'Total Cost: £25';
      const result = parseCostFromMessage(text);
      
      expect(result?.cost).toBe(25);
    });
  });
});