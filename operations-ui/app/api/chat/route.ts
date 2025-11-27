// app/api/chat/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { BackendClient } from '@/lib/backend-client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const backendClient = new BackendClient();

// Define all MCP tools in Anthropic API format
const tools: Anthropic.Tool[] = [
  {
    name: 'query_available_drones',
    description: 'Finds drones that can handle one or more deliveries based on their requirements (capacity, cooling, heating, time windows, max cost). Returns list of drone IDs that meet ALL requirements for ALL deliveries.',
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
    description: 'Calculates the optimal delivery path for one or more deliveries. Returns complete flight paths, costs, and move counts. Handles multi-delivery optimization.',
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
    description: 'When no drones are available for a delivery, this explains WHY each drone cannot handle it. Provides detailed breakdown of constraint failures and suggestions for alternatives.',
    input_schema: {
      type: 'object',
      properties: {
        delivery: {
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
      required: ['delivery'],
    },
  },
];

async function executeToolCall(toolName: string, toolInput: any): Promise<any> {
  console.log(`Executing tool: ${toolName}`, toolInput);

  try {
    switch (toolName) {
      case 'query_available_drones':
        return await backendClient.queryAvailableDrones(toolInput.deliveries);

      case 'plan_delivery_path': {
        const result = await backendClient.calculateDeliveryPath(toolInput.deliveries);
        // Format response for better readability
        const deliveryTimes = toolInput.deliveries.map((d: any) => d.time).sort();
        const timeWindow = deliveryTimes.length > 1
          ? `${deliveryTimes[0]} to ${deliveryTimes[deliveryTimes.length - 1]}`
          : deliveryTimes[0];

        return {
          totalCost: result.totalCost,
          totalMoves: result.totalMoves,
          flightTimeMinutes: Math.ceil(result.totalMoves / 60),
          timeWindow: timeWindow,
          dronesUsed: result.dronePaths.map((dp: any) => dp.droneId),
          summary: `Cost: £${result.totalCost.toFixed(2)}, Flight time: ~${Math.ceil(result.totalMoves / 60)} min, Window: ${timeWindow}`,
        };
      }

      case 'get_drone_details':
        return await backendClient.getDroneDetails(toolInput.droneId);

      case 'find_drones_with_cooling':
        return await backendClient.getDronesWithCooling(toolInput.hasCooling);

      case 'explain_why_unavailable': {
        const explanation = await backendClient.explainAvailability(toolInput.delivery);
        
        // Format for better readability
        const available = explanation.droneChecks.filter((d: any) => d.available);
        const unavailable = explanation.droneChecks.filter((d: any) => !d.available);

        return {
          availableCount: available.length,
          unavailableCount: unavailable.length,
          available: available.map((d: any) => `Drone ${d.droneId} (${d.droneName})`),
          unavailableReasons: unavailable.map((d: any) => ({
            drone: `Drone ${d.droneId}`,
            reasons: d.reasons.filter((r: string) => r.includes('❌')),
          })),
          suggestions: explanation.suggestions,
        };
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

    const systemContext = `You are an AI assistant integrated directly into a hospital drone logistics management system. When you calculate delivery costs and present drone options to the user, you should ALWAYS end your response with this exact phrase:

    "Type 'confirm' to schedule this delivery."

    When the user types "confirm", you should respond by confirming the delivery has been scheduled.`;

    const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    //system: systemContext,
    tools: tools,
    messages: messages,
    });

    console.log('Claude response stop_reason:', response.stop_reason);

    // Handle tool use
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      console.log('Tool calls:', toolUseBlocks.map(t => t.name));

      // Execute all tools
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
          try {
            const result = await executeToolCall(toolUse.name, toolUse.input);
            return {
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify(result, null, 2),
            };
          } catch (error) {
            return {
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: String(error) }),
              is_error: true,
            };
          }
        })
      );

      // Continue conversation with tool results
      const finalResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        //system: systemContext,
        tools: tools,
        messages: [
          ...messages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ],
      });

      const textContent = finalResponse.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );

      return Response.json({
        content: textContent?.text || 'No response',
        toolCalls: toolUseBlocks.map(t => ({
          name: t.name,
          status: 'completed' as const,
        })),
      });
    }

    // No tool use - return text response
    const textContent = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    return Response.json({
      content: textContent?.text || 'No response',
      toolCalls: [],
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}