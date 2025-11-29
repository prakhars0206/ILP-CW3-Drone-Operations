'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { useDeliveryStore, Delivery } from '@/lib/store';
import { PathSegment } from '@/lib/types';
import { 
  parseDeliveryRequest, 
  parseCostFromMessage, 
  isConfirmationMessage,
  ParsedDeliveryInfo 
} from '@/lib/messageParser';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsUsed?: string[]; // ⭐ Track which tools were called
}

export default function ClaudeChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m here to help you schedule drone deliveries. I can check availability, calculate costs, and manage your delivery operations. What would you like to do?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addDelivery } = useDeliveryStore();

  // State for tracking delivery planning flow
  const [pendingDelivery, setPendingDelivery] = useState<ParsedDeliveryInfo | null>(null);
  const [justPlannedDelivery, setJustPlannedDelivery] = useState(false);
  const [lastPlannedPath, setLastPlannedPath] = useState<PathSegment[] | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ⭐ Format timestamp helper
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit' 
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input.trim();
    const currentInputLower = currentInput.toLowerCase();
    
    const userMessage: Message = { 
      role: 'user', 
      content: currentInput,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Parse delivery information from user message
    const deliveryInfo = parseDeliveryRequest(currentInput);
    if (deliveryInfo) {
      console.log('📦 Parsed delivery info:', deliveryInfo);
      setPendingDelivery(prev => ({
        ...prev,
        ...deliveryInfo,
      }));
    }

    console.log('🔍 === CONFIRMATION CHECK ===');
    console.log('   Input:', currentInput);
    console.log('   isConfirmation:', isConfirmationMessage(currentInput));
    console.log('   pendingDelivery:', pendingDelivery);
    console.log('   justPlannedDelivery:', justPlannedDelivery);
    console.log('   lastPlannedPath segments:', lastPlannedPath?.length || 0);
    console.log('========================');

    // Check if this is a confirmation
    const isConfirmation = isConfirmationMessage(currentInput);
    
    if (isConfirmation && pendingDelivery && justPlannedDelivery) {
      console.log('CONFIRMATION DETECTED - Scheduling delivery');
      handleDeliveryConfirmation();
      setIsLoading(false);
      return;
    }

    if (isConfirmation) {
      console.log('Confirmation detected but conditions failed:');
      console.log('   - pendingDelivery exists?', !!pendingDelivery);
      console.log('   - justPlannedDelivery?', justPlannedDelivery);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      //  Track which tools were used
      const toolsUsed = data.toolCalls?.map((t: any) => t.name) || [];

      // Extract delivery info from tool calls
      if (data.toolCalls) {
        const planCall = data.toolCalls.find((t: any) => t.name === 'plan_delivery_path');
        if (planCall && planCall.result) {
          console.log('Claude used plan_delivery_path');
          setJustPlannedDelivery(true);
          
          try {
            const result = planCall.result;
            
            console.log('📍 Full result:', result);
            console.log('📍 Original tool input:', planCall.input);
            
            if (result.success && result.dronePaths && result.dronePaths.length > 0) {
              // Store BOTH the dronePaths AND the original deliveries input
              // Create enhanced dronePaths with delivery weights
              const enhancedDronePaths = result.dronePaths.map((dronePath: any) => ({
                ...dronePath,
                originalDeliveries: planCall.input?.deliveries || [], // Store original input
              }));
              
              console.log('📍 Storing', result.dronePaths.length, 'drone path(s) with original delivery data');
              setLastPlannedPath(enhancedDronePaths);
              
              // Extract delivery info from FIRST delivery of FIRST drone
              const firstDelivery = planCall.input?.deliveries?.[0];
              
              if (firstDelivery) {
                const extractedInfo: ParsedDeliveryInfo = {
                  weight: planCall.input.deliveries.reduce((sum: number, d: any) => 
                    sum + (d.requirements?.capacity || 0), 0
                  ),
                  cooling: planCall.input.deliveries.some((d: any) => d.requirements?.cooling),
                  heating: planCall.input.deliveries.some((d: any) => d.requirements?.heating),
                  date: firstDelivery.date,
                  time: firstDelivery.time,
                  location: planCall.input.deliveries.length > 1 
                    ? `Multi-stop delivery (${planCall.input.deliveries.length} stops)`
                    : 'Delivery location',
                  coordinates: {
                    lat: firstDelivery.delivery.lat,
                    lng: firstDelivery.delivery.lng,
                  },
                };
                
                console.log('📦 Extracted delivery info from plan_delivery_path:', extractedInfo);
                setPendingDelivery(extractedInfo);
              }
            }
          } catch (e) {
            console.error('Failed to parse path:', e);
          }
        }
      }

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.content,
        timestamp: new Date(),
        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeliveryConfirmation = () => {
    if (!pendingDelivery) {
      console.error('❌ No pending delivery to confirm');
      return;
    }
  
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
    
    if (!lastAssistantMessage) {
      console.error('❌ No assistant message found');
      return;
    }
  
    const costInfo = parseCostFromMessage(lastAssistantMessage.content);
    
    if (!costInfo || costInfo.cost === 0) {
      console.error('❌ Could not extract cost from confirmation');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ I couldn\'t extract the delivery cost. Please try scheduling again.',
          timestamp: new Date(),
        },
      ]);
      return;
    }
  
    if (lastPlannedPath && Array.isArray(lastPlannedPath) && lastPlannedPath.length > 0) {
      const dronePaths = lastPlannedPath;
      
      console.log('🚁 Creating deliveries for', dronePaths.length, 'drone path(s)');
      console.log('💰 Total cost from message:', costInfo.cost);
      
      dronePaths.forEach((dronePath: any, index: number) => {
        const droneId = dronePath.droneId;
        const deliverySegments = dronePath.deliveries || [];
        const originalDeliveries = dronePath.originalDeliveries || [];
        
        console.log(`\n🚁 Processing Drone ${droneId}:`);
        console.log('   Segments:', deliverySegments.length);
        console.log('   Original deliveries:', originalDeliveries.length);
        console.log('   Original deliveries data:', originalDeliveries);
        
        // Log the actual segment structure
        console.log('   Segment structure:');
        deliverySegments.forEach((seg: any, idx: number) => {
          console.log(`   Segment ${idx}:`, {
            deliveryId: seg.deliveryId,
            hasTo: !!seg.to,
            hasFrom: !!seg.from,
            hasFlightPath: !!seg.flightPath,
            flightPathLength: seg.flightPath?.length || 0,
            fullSegment: seg
          });
        });
        
        //Collect delivery info
        const deliveryPoints: { 
          name: string; 
          id: number; 
          lat: number; 
          lng: number;
          weight: number;
        }[] = [];
        
        let totalWeight = 0;
        
        deliverySegments.forEach((segment: any, segIdx: number) => {
          console.log(`\n   === Checking segment ${segIdx} ===`);
          console.log(`   Full segment data:`, segment);
          console.log(`   segment.deliveryId:`, segment.deliveryId);
          console.log(`   typeof segment.deliveryId:`, typeof segment.deliveryId);
          
          // Check if this segment has deliveryId
          if (!segment.deliveryId) {
            console.log(`   ❌ Segment ${segIdx} has no deliveryId, skipping`);
            return;
          }
          
          console.log(`   ✅ Segment ${segIdx} HAS deliveryId: ${segment.deliveryId}`);
          
          // Skip if already added
          if (deliveryPoints.some(p => p.id === segment.deliveryId)) {
            console.log(`   ⚠️ Delivery ${segment.deliveryId} already added, skipping`);
            return;
          }
          
          // Find the original delivery by ID
          console.log(`   Looking for delivery ${segment.deliveryId} in originalDeliveries...`);
          const matchingDelivery = originalDeliveries.find((od: any) => {
            console.log(`      Comparing od.id=${od.id} with segment.deliveryId=${segment.deliveryId}`);
            return od.id === segment.deliveryId;
          });
          
          if (!matchingDelivery) {
            console.log(`   ❌ No matching delivery found for ID ${segment.deliveryId}`);
            console.log(`      Available delivery IDs:`, originalDeliveries.map((od: any) => od.id));
            return;
          }
          
          console.log(`   ✅ Found matching delivery:`, matchingDelivery);
          
          // Get coordinates directly from the original delivery payload
          const lat = matchingDelivery.delivery?.lat;
          const lng = matchingDelivery.delivery?.lng;
          const weight = matchingDelivery.requirements?.capacity || 0;
          
          console.log(`   Extracted data: lat=${lat}, lng=${lng}, weight=${weight}`);
          
          if (!lat || !lng) {
            console.log(`   ❌ Delivery ${segment.deliveryId} has no coordinates in original payload`);
            return;
          }
          
          console.log(`   ✅ Got coords from original payload: ${lat}, ${lng}`);
          console.log(`   ✅ Got weight from original payload: ${weight}kg`);
          
          // ⭐ Match location by coordinates from original payload
          const knownLocations = [
            { name: 'Western General Hospital', lat: 55.9623, lng: -3.2351, tolerance: 0.002 },
            { name: 'Edinburgh Royal Infirmary', lat: 55.9219, lng: -3.1352, tolerance: 0.002 },
            { name: 'South Edinburgh', lat: 55.858, lng: -3.288, tolerance: 0.002 },
          ];
          
          let locationName = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          
          for (const known of knownLocations) {
            const latDiff = Math.abs(lat - known.lat);
            const lngDiff = Math.abs(lng - known.lng);
            
            if (latDiff < known.tolerance && lngDiff < known.tolerance) {
              locationName = known.name;
              console.log(`   ✅ Matched to ${known.name} (latDiff: ${latDiff.toFixed(6)}, lngDiff: ${lngDiff.toFixed(6)})`);
              break;
            }
          }
          
          deliveryPoints.push({
            name: locationName,
            id: segment.deliveryId,
            lat: lat,
            lng: lng,
            weight: weight,
          });
          
          totalWeight += weight;
          console.log(`   ✅ Added delivery point: ${locationName}, ${weight}kg`);
        });
        
        // ⭐ Build final location name
        let locationName: string;
        if (deliveryPoints.length > 1) {
          locationName = deliveryPoints.map(p => p.name).join(' → ');
        } else if (deliveryPoints.length === 1) {
          locationName = deliveryPoints[0].name;
        } else {
          locationName = 'Delivery location';
        }
        
        console.log(`   📍 Final location: ${locationName}`);
        console.log(`   ⚖️ Final weight: ${totalWeight}kg`);
        console.log(`   📦 Delivery points collected:`, deliveryPoints);
        
        const droneCost = costInfo.cost / dronePaths.length;
        
        const newDelivery: Delivery = {
          id: Date.now() + index * 100,
          weight: totalWeight,
          location: locationName,
          date: pendingDelivery.date || '2025-12-10',
          time: pendingDelivery.time || '15:00',
          cooling: pendingDelivery.cooling || false,
          heating: pendingDelivery.heating || false,
          status: 'assigned',
          assignedDrone: droneId,
          cost: droneCost,
          coordinates: pendingDelivery.coordinates,
          path: deliverySegments,
        };
        
        console.log(`✅ Scheduling delivery ${index + 1}/${dronePaths.length}:`, newDelivery);
        addDelivery(newDelivery);
      });
      
      setPendingDelivery(null);
      setJustPlannedDelivery(false);
      setLastPlannedPath(null);
      
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ ${dronePaths.length} ${dronePaths.length === 1 ? 'delivery' : 'deliveries'} scheduled successfully! Your deliveries have been added to the dashboard. You can track them on the live map once they're in flight.`,
          timestamp: new Date(),
        },
      ]);
      
    } else {
      console.error('❌ No valid path data found');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index}>
            <div
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className="max-w-[80%]">
                <div
                  className={`rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {/* Timestamp */}
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-right text-gray-500' : 'text-left text-gray-400'
                }`}>
                  {formatTimestamp(message.timestamp)}
                </p>
                {/*  Tools used (only for assistant messages) */}
                {message.role === 'assistant' && message.toolsUsed && message.toolsUsed.length > 0 && (
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {message.toolsUsed.map((tool, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full"
                      >
                        🔧 {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4">
              <Loader2 className="animate-spin text-gray-600" size={20} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about deliveries, check costs, or schedule a delivery..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Send size={20} />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: After Claude calculates costs, just say "confirm" to schedule
        </p>
      </div>
    </div>
  );
}