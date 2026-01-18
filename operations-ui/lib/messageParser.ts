export interface ParsedDeliveryInfo {
  weight?: number;
  location?: string;
  date?: string;
  time?: string;
  cooling: boolean;
  heating: boolean;
  coordinates?: { lat: number; lng: number };
}

export interface ParsedCostInfo {
  cost: number;
  drone: string;
}

// Known hospital locations in Edinburgh area
const KNOWN_HOSPITALS = [
  { name: 'Western General Hospital', lng: -3.2351, lat: 55.9623 },
  { name: 'Royal Infirmary of Edinburgh', lng: -3.1365, lat: 55.9215 },
  { name: "St John's Hospital", lng: -3.5103, lat: 55.9297 },
  { name: 'Royal Edinburgh Hospital', lng: -3.2087, lat: 55.9235 },
  { name: 'Sick Kids Hospital', lng: -3.1839, lat: 55.9389 },
] as const;

const COORDINATE_TOLERANCE_DEGREES = 0.002; // ~220 meters

export function extractLocation(text: string): string {
  const coordPattern = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
  const match = text.match(coordPattern);
  
  if (!match) return 'Unknown Location';
  
  const lng = parseFloat(match[1]);
  const lat = parseFloat(match[2]);
  
  if (isNaN(lng) || isNaN(lat)) return 'Unknown Location';
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return 'Unknown Location';
  
  for (const hospital of KNOWN_HOSPITALS) {
    const distance = Math.sqrt(
      Math.pow(lng - hospital.lng, 2) + Math.pow(lat - hospital.lat, 2)
    );
    
    if (distance <= COORDINATE_TOLERANCE_DEGREES) {
      return hospital.name;
    }
  }
  
  return 'Unknown Location';
}

export function parseDeliveryRequest(content: string): ParsedDeliveryInfo | null {
  const lowerContent = content.toLowerCase();
  
  const isDeliveryRequest = /schedule|deliver|need.*delivery|send.*package|dispatch/i.test(content);
  if (!isDeliveryRequest) return null;

  const result: ParsedDeliveryInfo = {
    cooling: false,
    heating: false,
  };

  
  // Extract weight - simplified regex
  // Looks for number (int or float) followed optionally by space then 'kg'
  const weightMatch = content.match(/(\d+(\.\d+)?)\s*kg/i);
  
  if (weightMatch) {
    // weightMatch[1] contains the full number (e.g. "2.5")
    result.weight = parseFloat(weightMatch[1]);
  }

  const locationMatch = content.match(/(?:to|deliver to|delivery to)\s+([A-Z][^,\n]+?)(?:\s+at\s+\d{2}:\d{2}|,\s*coordinates|\s+on\s+\d{4})/i);
  if (locationMatch) {
    result.location = locationMatch[1].trim();
  }

  const dateMatch = content.match(/(?:date|on|for).*?(\d{4}-\d{2}-\d{2})/i);
  if (dateMatch) {
    result.date = dateMatch[1];
  }

  const timeMatch = content.match(/(?:at|time).*?(\d{1,2}:\d{2})/i);
  if (timeMatch) {
    result.time = timeMatch[1];
  }

  const coordMatch = content.match(/coordinates?\s+([-\d.]+),\s*([-\d.]+)/i);
  if (coordMatch) {
    result.coordinates = {
      lng: parseFloat(coordMatch[1]),
      lat: parseFloat(coordMatch[2]),
    };
  }

  result.cooling = /cooling|refrigerat|cold/i.test(lowerContent);
  result.heating = /heating|warm|hot/i.test(lowerContent);

  return result;
}

export function parseCostFromMessage(message: string): { cost: number; drones?: string[] } | null {
  const costMatch = message.match(/(?:Total\s+Cost|Cost)[:\s]+£?([\d.,]+)/i);
  
  if (costMatch) {
    const multiDroneMatch = message.match(/Drones?\s+Used[:\s]+#?(\d+)(?:\s+and\s+#?(\d+))?/i);
    
    if (multiDroneMatch) {
      const drones = [multiDroneMatch[1]];
      if (multiDroneMatch[2]) {
        drones.push(multiDroneMatch[2]);
      }
      return {
        cost: parseFloat(costMatch[1].replace(/,/g, '')),
        drones: drones,
      };
    }
    
    const singleDroneMatch = message.match(/Drone:?\s+(?:Drone\s+)?#?(\d+)/i);
    if (singleDroneMatch) {
      return {
        cost: parseFloat(costMatch[1].replace(/,/g, '')),
        drones: [singleDroneMatch[1]],
      };
    }
    
    return {
      cost: parseFloat(costMatch[1].replace(/,/g, '')),
    };
  }
  
  return null;
}

export function isConfirmationMessage(content: string): boolean {
  const lower = content.toLowerCase().trim();
  
  // Matches start of string ^
  // Matches the word
  // Matches optional punctuation [.!]*
  // Matches end of string $
  // OR matches word followed by space/comma and please/thanks
  
  return /^(yes|confirm|ok|proceed|go ahead|do it|sounds good|perfect|great|looks good)[.!]*$/i.test(lower) ||
         /^(yes|confirm|ok|proceed)[,.]?\s+(please|thanks)[.!]*$/i.test(lower);
}