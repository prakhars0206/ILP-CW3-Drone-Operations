// app/api/chat/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { BackendClient } from '@/lib/backend-client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const backendClient = new BackendClient();

// sRetry logic for rate limits
async function callClaudeWithRetry(
    params: any, 
    maxRetries = 2
  ): Promise<Anthropic.Messages.Message> {  // ⭐ Add return type
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await anthropic.messages.create(params);
      } catch (error: any) {
        if (error.status === 429 && i < maxRetries) {
          const waitTime = Math.pow(2, i) * 1000;
          console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          throw error;
        }
      }
    }
    // This should never be reached, but TypeScript needs it
    throw new Error('Failed to get response after retries');
  }
  

// Define all MCP tools in Anthropic API format
const tools: Anthropic.Tool[] = [
  {
    name: 'query_available_drones',
    description: 'Finds drones that can handle one or more deliveries based on their requirements (capacity, cooling, heating, time windows, max cost). **CRITICAL**: You MUST have exact coordinates (lng, lat) for each delivery location before calling this tool. If the user has not provided coordinates, ask them explicitly: "What are the coordinates for [location]?" Do NOT guess or estimate coordinates. Returns list of drone IDs that meet ALL requirements for ALL deliveries.',
    input_schema: {
      type: 'object',
      properties: {
        deliveries: {
          type: 'array',
          description: 'Array of delivery requests to check availability for',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'Unique delivery ID' },
              date: { type: 'string', description: 'Delivery date in YYYY-MM-DD format' },
              time: { type: 'string', description: 'Delivery time in HH:MM format (24-hour)' },
              requirements: {
                type: 'object',
                properties: {
                  capacity: { type: 'number', description: 'Required capacity in kg' },
                  cooling: { type: 'boolean', description: 'Whether cooling is required' },
                  heating: { type: 'boolean', description: 'Whether heating is required' },
                  maxCost: { type: 'number', description: 'Maximum acceptable cost in GBP' },
                },
                required: ['capacity'],
              },
              delivery: {
                type: 'object',
                properties: {
                  lng: { type: 'number', description: 'Delivery longitude' },
                  lat: { type: 'number', description: 'Delivery latitude' },
                },
                required: ['lng', 'lat'],
              },
            },
            required: ['id', 'date', 'time', 'requirements', 'delivery'],
          },
        },
      },
      required: ['deliveries'],
    },
  },
  {
    name: 'plan_delivery_path',
    description: 'Calculates the optimal delivery path for one or more deliveries. Returns complete flight paths, costs, and move counts. **YOU MUST CALL THIS TOOL to get accurate costs and times - do NOT estimate or guess these values.** Handles multi-delivery optimization. **CRITICAL**: You MUST have exact coordinates (lng, lat) for each delivery before calling this tool.',
    input_schema: {
      type: 'object',
      properties: {
        deliveries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              date: { type: 'string' },
              time: { type: 'string' },
              requirements: {
                type: 'object',
                properties: {
                  capacity: { type: 'number' },
                  cooling: { type: 'boolean' },
                  heating: { type: 'boolean' },
                },
                required: ['capacity'],
              },
              delivery: {
                type: 'object',
                properties: {
                  lng: { type: 'number' },
                  lat: { type: 'number' },
                },
                required: ['lng', 'lat'],
              },
            },
            required: ['id', 'date', 'time', 'requirements', 'delivery'],
          },
        },
      },
      required: ['deliveries'],
    },
  },
  {
    name: 'get_drone_details',
    description: 'Gets detailed information about a specific drone by its ID, including capabilities, costs, and capacity',
    input_schema: {
      type: 'object',
      properties: {
        droneId: {
          type: 'string',
          description: "The ID of the drone (e.g., '1', '4', '7')",
        },
      },
      required: ['droneId'],
    },
  },
  {
    name: 'find_drones_with_cooling',
    description: 'Finds all drones that have (or don\'t have) cooling capability. Useful when deliveries require temperature-controlled transport.',
    input_schema: {
      type: 'object',
      properties: {
        hasCooling: {
          type: 'boolean',
          description: 'True to find drones WITH cooling, false to find drones WITHOUT cooling',
        },
      },
      required: ['hasCooling'],
    },
  },
  {
    name: 'explain_why_unavailable',
    description: 'When plan_delivery_path returns empty results or totalCost=0, use this to explain why a delivery cannot be scheduled. Helps inform the user about range limitations, drone availability, or other constraints.',
    input_schema: {
      type: 'object',
      properties: {
        delivery: {
          type: 'object',  
          description: 'The delivery object that could not be scheduled',
          properties: {
            id: { type: 'number' },
            date: { type: 'string' },
            time: { type: 'string' },
            requirements: {
              type: 'object',
              properties: {
                capacity: { type: 'number' },
                cooling: { type: 'boolean' },
                heating: { type: 'boolean' },
              },
            },
            delivery: {
              type: 'object',
              properties: {
                lng: { type: 'number' },
                lat: { type: 'number' },
              },
            },
          },
        },
      },
      required: ['delivery'],
    },
  },
];

async function executeToolCall(toolName: string, toolInput: any): Promise<any> {
  console.log(`Executing tool: ${toolName}`, toolInput);

  try {
    switch (toolName) {
        case 'query_available_drones': {
            const result = await backendClient.queryAvailableDrones(toolInput.deliveries);
    
                //  Add reminder directly to the result Claude sees
                return {
                availableDrones: result,
                droneCount: result.length,
                //  Claude what to do next
                nextStep: "IMPORTANT: You must IMMEDIATELY call plan_delivery_path with these same deliveries to get costs and flight paths. Do NOT wait for user confirmation - call it now!",
                reminder: "Call plan_delivery_path immediately with the same delivery parameters to get actual costs."
                };
            }

          case 'plan_delivery_path': {
            const result = await backendClient.calculateDeliveryPath(toolInput.deliveries);
            
            // Check if all deliveries were successfully planned
            const requestedCount = toolInput.deliveries.length;
            const plannedCount = result.dronePaths?.reduce((sum: number, path: any) => 
              sum + (path.deliveries?.length || 0), 0) || 0;
            
            //  If planning failed, return ONLY error info (no cost/time)
            if (plannedCount < requestedCount) {
              const failedCount = requestedCount - plannedCount;
              return {
                success: false,
                error: `DELIVERY PLANNING FAILED: Only ${plannedCount} of ${requestedCount} deliveries could be planned.`,
                reason: `${failedCount} delivery location(s) exceed the maximum flight range of all available drones.`,
                plannedDeliveries: plannedCount,
                failedDeliveries: failedCount,
                recommendation: `The ${plannedCount} closer deliveries can proceed separately.`,
              };
            }
            
            // Only reach here if ALL deliveries succeeded
            const deliveryTimes = toolInput.deliveries.map((d: any) => d.time).sort();
            const timeWindow = deliveryTimes.length > 1
              ? `${deliveryTimes[0]} to ${deliveryTimes[deliveryTimes.length - 1]}`
              : deliveryTimes[0];
          
            return {
              success: true,
              totalCost: result.totalCost,
              totalMoves: result.totalMoves,
              flightTimeMinutes: Math.ceil(result.totalMoves / 60),
              timeWindow: timeWindow,
              dronesUsed: result.dronePaths.map((dp: any) => dp.droneId),
              dronePaths: result.dronePaths,
              summary: `Cost: £${result.totalCost.toFixed(2)}, Flight time: ~${Math.ceil(result.totalMoves / 60)} min, Window: ${timeWindow}`,
            };
          }

      case 'get_drone_details':
        return await backendClient.getDroneDetails(toolInput.droneId);

      case 'find_drones_with_cooling':
        return await backendClient.getDronesWithCooling(toolInput.hasCooling);

        case 'explain_why_unavailable': {
            // ⭐ Parse the delivery string into an object
            let deliveryObj;
            try {
              if (typeof toolInput.delivery === 'string') {
                deliveryObj = JSON.parse(toolInput.delivery);
              } else {
                deliveryObj = toolInput.delivery;
              }
            } catch (e) {
              console.error('❌ Failed to parse delivery JSON:', e);
              return {
                explanation: 'Invalid delivery format provided',
                canBeScheduled: false,
              };
            }
          
            const result = await backendClient.explainAvailability(deliveryObj);
            return result;
          }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`Error executing ${toolName}:`, error);
    throw error;
  }
}

export async function POST(req: Request) {
    try {
      const { messages } = await req.json();
      console.log('Received chat request with messages:', messages.length);
  
      const systemContext = `You are an AI assistant integrated into a hospital drone logistics system.

**MANDATORY TWO-STEP WORKFLOW:**

Step 1: Call query_available_drones (to check which drones can handle the deliveries)
Step 2: IMMEDIATELY call plan_delivery_path with THE EXACT SAME delivery data (to get costs)

**YOU MUST COMPLETE BOTH STEPS IN ONE TURN - DO NOT STOP AFTER STEP 1**

**CRITICAL: ALWAYS ask for date if not provided**
When user says "on the same day" or doesn't specify a date, you MUST ask:
"What date would you like these deliveries scheduled for? (format: YYYY-MM-DD)"

**Required information for each delivery:**
- Date (YYYY-MM-DD format) - NEVER assume or make up dates
- Time (HH:MM format)
- Weight in kg
- Coordinates (lng, lat)
- Requirements (cooling/heating if needed)

Example:
User: "Deliver 5kg to X,Y with cooling on 2025-12-05 at 10:00"
You: [Call query_available_drones] → [IMMEDIATELY call plan_delivery_path]

**RULES:**
- Complete BOTH tool calls before responding to user
- Never make up dates - always ask if not provided
- When user says "confirm", acknowledge scheduling`;
  
      // ⭐ Keep calling tools until Claude stops
      let currentMessages = [...messages];
      let allToolCalls: any[] = [];
      let maxIterations = 5; // Prevent infinite loops
      let iteration = 0;
  
      while (iteration < maxIterations) {
        iteration++;
        console.log(`\n🔄 Tool calling iteration ${iteration}`);
  
        const response = await callClaudeWithRetry({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 2048,
          system: systemContext,
          tools: tools,
          messages: currentMessages,
        });
  
        console.log(`📍 Stop reason: ${response.stop_reason}`);
  
        if (response.stop_reason === 'tool_use') {
          const toolUseBlocks = response.content.filter(
            (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
          );
  
          console.log(`🔧 Tool calls in iteration ${iteration}:`, toolUseBlocks.map(t => t.name));
  
          // Execute all tools
          const toolResults = await Promise.all(
            toolUseBlocks.map(async (toolUse) => {
              try {
                const result = await executeToolCall(toolUse.name, toolUse.input);
                allToolCalls.push({
                  name: toolUse.name,
                  status: 'completed' as const,
                  result: result,
                  input: toolUse.input, // ⭐ ADD THIS LINE
                });
                return {
                  type: 'tool_result' as const,
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(result, null, 2),
                };
              } catch (error) {
                allToolCalls.push({
                  name: toolUse.name,
                  status: 'error' as const,
                  result: { error: String(error) },
                  input: toolUse.input, // ⭐ ADD THIS LINE TOO
                });
                return {
                  type: 'tool_result' as const,
                  tool_use_id: toolUse.id,
                  content: JSON.stringify({ error: String(error) }),
                  is_error: true,
                };
              }
            })
          );
  
          //Add assistant response and tool results to message history
          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: response.content },
            { role: 'user', content: toolResults },
          ];
  
          // Continue loop to call next tool
          console.log('🔁 Continuing to next iteration for more tool calls...');
          
        } else {
          // No more tools - return final response
          console.log('✅ No more tool calls - returning final response');
          
          const textContent = response.content.find(
            (block): block is Anthropic.TextBlock => block.type === 'text'
          );
  
          return Response.json({
            content: textContent?.text || 'No response',
            toolCalls: allToolCalls,
          });
        }
      }
  
      // ⭐ Safety: If we hit max iterations
      console.error('⚠️ Hit max tool calling iterations');
      return Response.json({
        content: 'I encountered an issue with tool calling. Please try again.',
        toolCalls: allToolCalls,
      });
  
    } catch (error) {
      console.error('Chat API error:', error);
      return Response.json(
        { error: 'Failed to process chat request' },
        { status: 500 }
      );
    }
  }