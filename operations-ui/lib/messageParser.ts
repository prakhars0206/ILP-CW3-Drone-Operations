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
  
  export function parseDeliveryRequest(content: string): ParsedDeliveryInfo | null {
    const lowerContent = content.toLowerCase();
    
    // Check if this is a delivery-related message
    const isDeliveryRequest = /schedule|deliver|need.*delivery|send.*package|dispatch/i.test(content);
    if (!isDeliveryRequest) return null;
  
    const result: ParsedDeliveryInfo = {
      cooling: false,
      heating: false,
    };
  
    // Extract weight
    const weightMatch = content.match(/(\d+(?:\.\d+)?)\s*kg/i);
    if (weightMatch) {
      result.weight = parseFloat(weightMatch[1]);
    }
  
    // Extract location
    const locationMatch = content.match(/(?:to|deliver to|delivery to)\s+([A-Z][^,\n]+?)(?:\s+at\s+\d{2}:\d{2}|,\s*coordinates|\s+on\s+\d{4})/i);
    if (locationMatch) {
      result.location = locationMatch[1].trim();
    }
  
    // Extract date
    const dateMatch = content.match(/(?:date|on|for).*?(\d{4}-\d{2}-\d{2})/i);
    if (dateMatch) {
      result.date = dateMatch[1];
    }
  
    // Extract time
    const timeMatch = content.match(/(?:at|time).*?(\d{1,2}:\d{2})/i);
    if (timeMatch) {
      result.time = timeMatch[1];
    }
  
    // Extract coordinates
    const coordMatch = content.match(/coordinates?\s+([-\d.]+),\s*([-\d.]+)/i);
    if (coordMatch) {
      result.coordinates = {
        lng: parseFloat(coordMatch[1]),
        lat: parseFloat(coordMatch[2]),
      };
    }
  
    // Check for special requirements
    result.cooling = /cooling|refrigerat|cold/i.test(lowerContent);
    result.heating = /heating|warm|hot/i.test(lowerContent);
  
    return result;
  }
  
  export function parseCostFromMessage(message: string): { cost: number; drones?: string[] } | null {
    // Match cost patterns like "£71.40" or "Total Cost: £63.10"
    const costMatch = message.match(/(?:Total\s+Cost|Cost)[:\s]+£?([\d.,]+)/i);
    
    if (costMatch) {
      // Try to match multiple drones: "Drones Used: #9 and #1"
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
      
      // Try single drone: "Drone #5" or "Drone: Drone #5"
      const singleDroneMatch = message.match(/Drone:?\s+(?:Drone\s+)?#?(\d+)/i);
      if (singleDroneMatch) {
        return {
          cost: parseFloat(costMatch[1].replace(/,/g, '')),
          drones: [singleDroneMatch[1]],
        };
      }
      
      // If no drone found but cost exists, return just cost
      return {
        cost: parseFloat(costMatch[1].replace(/,/g, '')),
      };
    }
    
    return null;
  }
  
  export function isConfirmationMessage(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return /^(yes|confirm|ok|proceed|go ahead|do it|sounds good|perfect|great|looks good)$/i.test(lowerContent.trim()) ||
           /^(yes|confirm|ok|proceed),?\s+(please|thanks)/i.test(lowerContent.trim());
  }