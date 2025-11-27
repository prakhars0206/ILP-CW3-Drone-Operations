

export interface Delivery {
    id: number;
    date: string;
    time: string;
    weight: number;
    cooling?: boolean;
    heating?: boolean;
    location: {
      lat: number;
      lng: number;
      name?: string;
    };
    status: 'pending' | 'assigned' | 'in-flight' | 'completed';
    assignedDrone?: string;
    estimatedCost?: number;
  }
  
  export interface Drone {
    id: string;
    name: string;
    status: 'available' | 'in-flight' | 'maintenance';
    capability: {
      cooling: boolean;
      heating: boolean;
      capacity: number;
      maxMoves: number;
      costPerMove: number;
    };
    currentDelivery?: number;
  }
  
  export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: Array<{
      name: string;
      status: 'running' | 'completed' | 'error';
    }>;
    timestamp: Date;
  }
  
  export interface MedDispatchRec {
    id: number;
    date: string;
    time: string;
    requirements: {
      capacity: number;
      cooling?: boolean;
      heating?: boolean;
      maxCost?: number;
    };
    delivery: {
      lng: number;
      lat: number;
    };
  }