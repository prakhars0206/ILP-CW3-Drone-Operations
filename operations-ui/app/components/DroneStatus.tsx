// app/components/DroneStatus.tsx
'use client';

import { Plane } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export function DroneStatus() {
  const { droneStats } = useDashboard();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Available</p>
            <p className="text-3xl font-bold text-gray-900">{droneStats.available}</p>
          </div>
          <Plane className="w-10 h-10 text-green-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">In Flight</p>
            <p className="text-3xl font-bold text-gray-900">{droneStats.inFlight}</p>
          </div>
          <Plane className="w-10 h-10 text-blue-500 animate-pulse" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Fleet</p>
            <p className="text-3xl font-bold text-gray-900">{droneStats.total}</p>
          </div>
          <Plane className="w-10 h-10 text-gray-500" />
        </div>
      </div>
    </div>
  );
}
