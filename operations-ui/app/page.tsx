// app/page.tsx
import { ClaudeChat } from './components/ClaudeChat';
import { DeliveryQueue } from './components/DeliveryQueue';
import { DroneStatus } from './components/DroneStatus';
import { DashboardProvider } from './context/DashboardContext';

export default function Home() {
  return (
    <DashboardProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              🚁 Drone Operations Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Hospital Logistics Management System - University of Edinburgh ILP CW3
            </p>
          </div>
        </header>

        {/* Main content - FIXED: removed overflow-hidden */}
        <div className="flex-1 flex">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3">
            {/* Left side: Dashboard (2/3 width) - FIXED: added max-h-screen and overflow-y-auto */}
            <div className="lg:col-span-2 overflow-y-auto max-h-[calc(100vh-88px)] p-6 space-y-6">
              {/* Drone status cards */}
              <DroneStatus />

              {/* Delivery queue */}
              <DeliveryQueue />
            </div>

            {/* Right side: Claude Chat (1/3 width) - FIXED: proper height constraint */}
            <div className="lg:col-span-1 flex flex-col max-h-[calc(100vh-88px)]">
              <ClaudeChat />
            </div>
          </div>
        </div>
      </div>
    </DashboardProvider>
  );
}