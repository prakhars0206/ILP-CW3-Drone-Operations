// app/components/ClaudeChat.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{
    name: string;
    status: 'running' | 'completed' | 'error';
  }>;
  timestamp: Date;
}

export function ClaudeChat() {
  const { addDelivery, updateDeliveryStatus } = useDashboard();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI assistant for drone logistics. I can help you find available drones, plan delivery routes, compare strategies, and explain why certain drones can\'t handle specific deliveries. What would you like to know?',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingDelivery, setPendingDelivery] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim().toLowerCase();
    setInput('');
    setLoading(true);

    try {
      // Check if this is a "schedule delivery" request
      const isScheduleRequest = currentInput.includes('schedule') || 
                                currentInput.includes('deliver') ||
                                currentInput.includes('send');
      
      // In the section where you parse delivery details (around line 50):

      if (isScheduleRequest) {
        // Parse delivery details from user message
        const weightMatch = input.match(/(\d+\.?\d*)kg/i);
        const coolingMatch = currentInput.includes('cooling');
        const heatingMatch = currentInput.includes('heating');
        const timeMatch = input.match(/(\d{1,2}):(\d{2})/);
        const dateMatch = input.match(/\d{4}-\d{2}-\d{2}/);
        
        // Extract hospital name (text before "at" and time)
        let location = 'Edinburgh Royal Infirmary'; // Default
        const locationMatch = input.match(/to\s+([^\.]+?)\s+(?:at|on)/i);
        if (locationMatch) {
          location = locationMatch[1].trim();
        }
        
        // NEW: Extract and validate coordinates (FIXED REGEX!)
        let lng = -3.1884;  // Default: Edinburgh Royal Infirmary
        let lat = 55.9533;

        // Check if user provided coordinates (FLEXIBLE MATCHING!)
        const coordMatch = input.match(/coordinates?[\s:]+(are|is)?[\s:]*(-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)/i);
        //                               Add ^^^^^ to match "are"      ^^^^ capture group 2    ^^^^ capture group 3

        if (coordMatch) {
          const num1 = parseFloat(coordMatch[2]); // Skip capture group 1 (the "are")
          const num2 = parseFloat(coordMatch[3]);
          
          console.log('📍 Found coordinates:', num1, num2);
          
          // Detect if swapped
          if (num1 > 50 && num1 < 60 && num2 > -8 && num2 < 5) {
            lat = num1;
            lng = num2 < 0 ? num2 : -num2;
            console.log('✅ Detected swapped, corrected:', { lng, lat });
          } else if (num1 > -8 && num1 < 5 && num2 > 50 && num2 < 60) {
            lng = num1 < 0 ? num1 : -num1;
            lat = num2;
            console.log('✅ Coordinates parsed:', { lng, lat });
          }
        } else {
          console.log('⚠️ No coordinates found, using defaults:', { lng, lat });
        }
        
        // Store pending delivery info
        if (weightMatch) {
          const newPending = {
            weight: parseFloat(weightMatch[1]),
            cooling: coolingMatch,
            heating: heatingMatch,
            time: timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '15:00',
            date: dateMatch ? dateMatch[0] : '2025-12-10',
            location: location,  // EXTRACTED FROM MESSAGE!
            lng: lng,
            lat: lat,
          };
          setPendingDelivery(newPending);
          console.log('Pending delivery set:', newPending);
        }
      }

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

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // SIMPLIFIED: Only check for the exact word "confirm"
      const isConfirmation = currentInput.trim().toLowerCase() === 'confirm';

      // Check if Claude just planned a delivery
      const justPlannedDelivery = data.toolCalls?.some((t: any) => t.name === 'plan_delivery_path');

      console.log('=== SCHEDULING DEBUG ===');
      console.log('User input:', currentInput);
      console.log('User said "confirm"?', isConfirmation);
      console.log('Pending delivery?', !!pendingDelivery);
      console.log('Just planned?', justPlannedDelivery);

      // If user typed "confirm" AND we have a pending delivery, schedule it
      if (isConfirmation && pendingDelivery) {
        const lastAssistantMessage = messages[messages.length - 1];
  
        // Extract drone (this is working already!)
        const droneMatch = lastAssistantMessage?.content.match(/(?:choose|selected?|recommend(?:ed)?)\s+drone\s+(\d+)/i) ||
                          lastAssistantMessage?.content.match(/drone\s+(\d+)\s+(?:is|would|because)/i) ||
                          lastAssistantMessage?.content.match(/(?:assigned|using)\s+drone[:\s]+(\d+)/i) ||
                          lastAssistantMessage?.content.match(/drone[:\s]+#?(\d+)/i);
        
        // Extract cost (IMPROVED - handles markdown)
        const costMatch = lastAssistantMessage?.content.match(/total\s+cost\*?\*?.*?£(\d+\.?\d*)/i) ||  // "**Total Cost**: £17.76"
                          lastAssistantMessage?.content.match(/cost.*?£(\d+\.?\d*)/i) ||                  // "cost: £17.76" or "Cost £17.76"
                          lastAssistantMessage?.content.match(/£(\d+\.?\d+)\s*total/i);                   // "£17.76 total"
        
        const cost = costMatch ? parseFloat(costMatch[1]) : 0;
        const assignedDrone = droneMatch ? `Drone ${droneMatch[1]}` : 'Drone 1';
        
        console.log('Extracted from message:');
        console.log('  - Cost:', cost);
        console.log('  - Drone:', assignedDrone);
        console.log('  - Last message preview:', lastAssistantMessage?.content.substring(0, 200));
        
        
        if (cost > 0) {
          const nextId = Date.now();
          
          console.log('✅ SCHEDULING DELIVERY!');
          
          const newDelivery = {
            id: nextId,
            weight: pendingDelivery.weight,
            location: pendingDelivery.location,
            time: pendingDelivery.time,
            date: pendingDelivery.date,
            cooling: pendingDelivery.cooling,
            heating: pendingDelivery.heating,
            status: 'assigned' as const,
            assignedDrone: assignedDrone,
          };
          
          addDelivery(newDelivery);
          console.log('✅ Delivery added to queue:', newDelivery);
          
          // Update status to in-flight after 7.5 seconds
          setTimeout(() => {
            console.log('📦 Updating delivery to in-flight');
            updateDeliveryStatus(nextId, 'in-flight', assignedDrone);
          }, 7500);
          
          // Clear pending delivery
          setPendingDelivery(null);
        } else {
          console.warn('❌ No valid cost found in previous message');
          console.log('Full message:', lastAssistantMessage?.content);

        }
      }

      // Store pending delivery info when Claude plans a path
      if (justPlannedDelivery && pendingDelivery) {
        console.log('💡 Delivery plan calculated, waiting for user to type "confirm"');
      }

      console.log('=== END DEBUG ===');

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        toolCalls: data.toolCalls,
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-sm text-gray-600">Powered by Claude & MCP</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 max-w-[85%]`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? 'bg-blue-500 ml-2' : 'bg-gray-200 mr-2'
              }`}>
                {msg.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-gray-600" />
                )}
              </div>

              {/* Message bubble */}
              <div>
                <div className={`rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content.replace(/\*\*/g, '')}</p>
                </div>

                {/* Tool calls indicator */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.toolCalls.map((tool, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                      >
                        🔧 {tool.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <p className="text-xs text-gray-400 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot className="w-5 h-5 text-gray-600" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex space-x-2 items-center">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">

        {/*Visual indicator when delivery is ready to confirm */}
        {pendingDelivery && messages.length > 1 && 
        messages[messages.length - 1]?.role === 'assistant' && 
        messages[messages.length - 1]?.toolCalls?.some((t: any) => t.name === 'plan_delivery_path') && (
          <div className="mb-3 px-4 py-3 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-sm text-blue-900">
              <strong>💡 Ready to schedule:</strong> {pendingDelivery.weight}kg delivery to {pendingDelivery.location} at {pendingDelivery.time}
              <br />
              <span className="text-xs mt-1 inline-block">
                Type <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono">confirm</code> to add to delivery queue
              </span>
            </p>
          </div>
        )}
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about deliveries, drones, routes..."
            disabled={loading}
            rows={2}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 text-gray-900"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}