'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface Delivery {
  id: number;
  weight: number;
  location: string;
  time: string;
  date: string;
  cooling?: boolean;
  heating?: boolean;
  status: 'pending' | 'assigned' | 'in-flight' | 'completed';
  assignedDrone?: string;
}

interface DroneStats {
  available: number;
  inFlight: number;
  maintenance: number;
  total: number;
}

interface DashboardContextType {
  deliveries: Delivery[];
  droneStats: DroneStats;
  addDelivery: (delivery: Delivery) => void;
  updateDeliveryStatus: (id: number, status: Delivery['status'], drone?: string) => void;
  updateDroneStats: (stats: Partial<DroneStats>) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  
  // Keep initial state commented for demo purposes
  // Uncomment these if you want placeholder data for screenshots:
  /*
  const [deliveries, setDeliveries] = useState<Delivery[]>([
    { id: 1, weight: 2, location: 'Edinburgh Royal Infirmary', time: '10:00', date: '2025-12-10', cooling: true, status: 'pending' },
    { id: 2, weight: 1, location: 'Western General Hospital', time: '11:00', date: '2025-12-10', status: 'pending' },
    { id: 3, weight: 0.8, location: 'Royal Hospital for Children', time: '12:00', date: '2025-12-10', status: 'assigned', assignedDrone: 'Drone 1' },
    { id: 4, weight: 3, location: 'St John\'s Hospital', time: '14:00', date: '2025-12-10', heating: true, status: 'pending' },
  ]);
  */

  const [droneStats, setDroneStats] = useState<DroneStats>({
    available: 10,  // All 10 drones start available
    inFlight: 0,
    maintenance: 0,
    total: 10,  // Total fleet is 10
  });

  const addDelivery = (delivery: Delivery) => {
    setDeliveries(prev => [...prev, delivery]);
  };

  const updateDeliveryStatus = (id: number, status: Delivery['status'], drone?: string) => {
    setDeliveries(prev =>
      prev.map(d =>
        d.id === id ? { ...d, status, assignedDrone: drone } : d
      )
    );

    // Update drone stats based on status changes
    if (status === 'in-flight') {
      setDroneStats(prev => ({
        ...prev,
        available: prev.available - 1,
        inFlight: prev.inFlight + 1,
      }));
    } else if (status === 'completed') {
      setDroneStats(prev => ({
        ...prev,
        inFlight: prev.inFlight - 1,
        available: prev.available + 1,
      }));
    } else if (status === 'assigned') {
      setDroneStats(prev => ({
        ...prev,
        available: prev.available - 1,
      }));
    }
  };

  const updateDroneStats = (stats: Partial<DroneStats>) => {
    setDroneStats(prev => ({ ...prev, ...stats }));
  };

  return (
    <DashboardContext.Provider
      value={{
        deliveries,
        droneStats,
        addDelivery,
        updateDeliveryStatus,
        updateDroneStats,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
}