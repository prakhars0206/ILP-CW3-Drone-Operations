#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ILPClient } from "./ilp-client.js";

const server = new Server(
  {
    name: "ilp-drone-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const ILP_BACKEND_URL = process.env.ILP_BACKEND_URL || "http://localhost:8080";
const ilpClient = new ILPClient(ILP_BACKEND_URL);
const SECONDS_PER_MOVE = parseFloat(process.env.SECONDS_PER_MOVE || "1.0");


console.error(`========================================`);
console.error(`ILP MCP Server starting...`);
console.error(`Backend URL: ${ILP_BACKEND_URL}`);
console.error(`Time calculation: ${SECONDS_PER_MOVE} second(s) per move`);
console.error(`Move distance: ~0.00015 degrees (~17m)`);
console.error(`Estimated speed: ~${(17 / SECONDS_PER_MOVE).toFixed(1)} m/s (~${((17 / SECONDS_PER_MOVE) * 3.6).toFixed(1)} km/h)`);
console.error(`========================================`);

// Helper function for time formatting
function formatFlightTime(moves: number): string {
  const seconds = moves * SECONDS_PER_MOVE;
  const minutes = Math.ceil(seconds / 60);
  return `~${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

function formatDeliveryWindow(times: string[]): string {
  if (times.length === 0) return "";
  if (times.length === 1) return ` at ${times[0]}`;
  
  const sorted = times.sort();
  return ` from ${sorted[0]} to ${sorted[sorted.length - 1]}`;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_student_id",
        description: "Returns the student ID of the system owner",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "check_backend_connection",
        description: "Checks if the ILP backend is reachable",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_drone_details",
        description:
          "Gets detailed information about a specific drone by its ID, including capabilities, costs, and capacity",
        inputSchema: {
          type: "object",
          properties: {
            droneId: {
              type: "string",
              description: "The ID of the drone (e.g., '1', '4', '7')",
            },
          },
          required: ["droneId"],
        },
      },
      {
        name: "find_drones_with_cooling",
        description:
          "Finds all drones that have (or don't have) cooling capability. Useful when deliveries require temperature-controlled transport.",
        inputSchema: {
          type: "object",
          properties: {
            hasCooling: {
              type: "boolean",
              description: "True to find drones WITH cooling, false to find drones WITHOUT cooling",
            },
          },
          required: ["hasCooling"],
        },
      },
      {
        name: "query_available_drones",
        description:
          "Finds drones that can handle one or more deliveries based on their requirements. Returns list of drone IDs that meet ALL requirements for ALL deliveries.",
        inputSchema: {
          type: "object",
          properties: {
            deliveries: {
              type: "array",
              description: "Array of delivery requests to check availability for",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  date: { type: "string" },
                  time: { type: "string" },
                  requirements: {
                    type: "object",
                    properties: {
                      capacity: { type: "number" },
                      cooling: { type: "boolean" },
                      heating: { type: "boolean" },
                      maxCost: { type: "number" },
                    },
                    required: ["capacity"],
                  },
                  delivery: {
                    type: "object",
                    properties: {
                      lng: { type: "number" },
                      lat: { type: "number" },
                    },
                    required: ["lng", "lat"],
                  },
                },
                required: ["id", "date", "time", "requirements", "delivery"],
              },
            },
          },
          required: ["deliveries"],
        },
      },
      {
        name: "plan_delivery_path",
        description:
          "Calculates the optimal delivery path for one or more deliveries. Returns complete flight paths, costs, and move counts.",
        inputSchema: {
          type: "object",
          properties: {
            deliveries: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  date: { type: "string" },
                  time: { type: "string" },
                  requirements: {
                    type: "object",
                    properties: {
                      capacity: { type: "number" },
                      cooling: { type: "boolean" },
                      heating: { type: "boolean" },
                      maxCost: { type: "number" },
                    },
                    required: ["capacity"],
                  },
                  delivery: {
                    type: "object",
                    properties: {
                      lng: { type: "number" },
                      lat: { type: "number" },
                    },
                    required: ["lng", "lat"],
                  },
                },
                required: ["id", "date", "time", "requirements", "delivery"],
              },
            },
          },
          required: ["deliveries"],
        },
      },
      {
        name: "explain_why_unavailable",
        description:
          "When no drones are available for a delivery, this explains WHY each drone cannot handle it. Provides detailed breakdown of constraint failures and suggestions for alternatives.",
        inputSchema: {
          type: "object",
          properties: {
            delivery: {
              type: "object",
              description: "The delivery to explain unavailability for",
              properties: {
                id: { type: "number" },
                date: { type: "string" },
                time: { type: "string" },
                requirements: {
                  type: "object",
                  properties: {
                    capacity: { type: "number" },
                    cooling: { type: "boolean" },
                    heating: { type: "boolean" },
                    maxCost: { type: "number" },
                  },
                  required: ["capacity"],
                },
                delivery: {
                  type: "object",
                  properties: {
                    lng: { type: "number" },
                    lat: { type: "number" },
                  },
                  required: ["lng", "lat"],
                },
              },
              required: ["id", "date", "time", "requirements", "delivery"],
            },
          },
          required: ["delivery"],
        },
      },
      {
        name: "compare_delivery_strategies",
        description:
          "Compares different strategies for delivering multiple items: using a single drone vs using multiple drones. Analyzes cost vs speed trade-offs.",
        inputSchema: {
          type: "object",
          properties: {
            deliveries: {
              type: "array",
              description: "Array of deliveries to compare strategies for (must be 2 or more)",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  date: { type: "string" },
                  time: { type: "string" },
                  requirements: {
                    type: "object",
                    properties: {
                      capacity: { type: "number" },
                      cooling: { type: "boolean" },
                      heating: { type: "boolean" },
                      maxCost: { type: "number" },
                    },
                    required: ["capacity"],
                  },
                  delivery: {
                    type: "object",
                    properties: {
                      lng: { type: "number" },
                      lat: { type: "number" },
                    },
                    required: ["lng", "lat"],
                  },
                },
                required: ["id", "date", "time", "requirements", "delivery"],
              },
            },
          },
          required: ["deliveries"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.error(`Tool called: ${name}`);

  try {
    switch (name) {
      case "get_student_id": {
        const response = await fetch(`${ILP_BACKEND_URL}/api/v1/uid`);
        const studentId = await response.text();
        return {
          content: [{ type: "text", text: `Student ID: ${studentId}` }],
        };
      }

      case "check_backend_connection": {
        try {
          const response = await fetch(`${ILP_BACKEND_URL}/api/v1/uid`);
          if (response.ok) {
            const studentId = await response.text();
            return {
              content: [
                {
                  type: "text",
                  text: `✅ Backend is reachable!\nStudent ID: ${studentId}\nBackend URL: ${ILP_BACKEND_URL}`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ Backend returned error: ${response.status}`,
                },
              ],
            };
          }
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Cannot reach backend at ${ILP_BACKEND_URL}\nError: ${error}`,
              },
            ],
          };
        }
      }

      case "get_drone_details": {
        const { droneId } = args as { droneId: string };
        const drone = await ilpClient.getDroneDetails(droneId);

        if (!drone) {
          return {
            content: [{ type: "text", text: `Drone with ID '${droneId}' not found.` }],
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(drone, null, 2) }],
        };
      }

      case "find_drones_with_cooling": {
        const { hasCooling } = args as { hasCooling: boolean };
        const droneIds = await ilpClient.getDronesWithCooling(hasCooling);

        return {
          content: [
            {
              type: "text",
              text: `Drones ${hasCooling ? "WITH" : "WITHOUT"} cooling: ${JSON.stringify(droneIds)}`,
            },
          ],
        };
      }

      case "query_available_drones": {
        const { deliveries } = args as { deliveries: any[] };
        const availableDroneIds = await ilpClient.queryAvailableDrones(deliveries);

        if (availableDroneIds.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No drones available that meet all requirements for all deliveries.",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Available drones: ${JSON.stringify(availableDroneIds)}\n\nThese drones can handle all ${deliveries.length} deliveries with the specified requirements.`,
            },
          ],
        };
      }

      case "plan_delivery_path": {
        const { deliveries } = args as { deliveries: any[] };
        const pathResponse = await ilpClient.calculateDeliveryPath(deliveries);
      
        // Extract delivery times for window calculation
        const deliveryTimes = deliveries.map(d => d.time).sort();
        const timeWindow = deliveryTimes.length > 1 
          ? `${deliveryTimes[0]} to ${deliveryTimes[deliveryTimes.length - 1]}`
          : deliveryTimes[0];
      
        const flightTime = formatFlightTime(pathResponse.totalMoves);
      
        const summary = `
      Delivery Plan Summary:
      - Total Cost: £${pathResponse.totalCost.toFixed(2)}
      - Total Flight Time: ${flightTime} (cumulative drone movement time)
      - Total Moves: ${pathResponse.totalMoves}
      - Delivery Window: ${timeWindow} (wall-clock duration)
      - Number of Drones Used: ${pathResponse.dronePaths.length}
      
      Drone Assignments:
      ${pathResponse.dronePaths
        .map(
          (dp, i) =>
            `${i + 1}. Drone ${dp.droneId}: ${dp.deliveries.length} delivery(ies)
         Deliveries: ${dp.deliveries.map((d) => `#${d.deliveryId}`).join(", ")}`
        )
        .join("\n")}
      
      *(Time estimates assume ${SECONDS_PER_MOVE} second per move - adjust SECONDS_PER_MOVE env var for different drone speeds)*
      `;
      
        return {
          content: [{ type: "text", text: summary }],
        };
      }

      case "explain_why_unavailable": {
        const { delivery } = args as { delivery: any };
        const explanation = await ilpClient.explainAvailability(delivery);

        let response = "# Availability Analysis\n\n";

        // Group by availability
        const available = explanation.droneChecks.filter((d) => d.available);
        const unavailable = explanation.droneChecks.filter((d) => !d.available);

        if (available.length > 0) {
          response += `## ✅ Available Drones (${available.length})\n\n`;
          available.forEach((drone) => {
            response += `**Drone ${drone.droneId} (${drone.droneName})**\n`;
            drone.reasons.forEach((r) => response += `  ${r}\n`);
            response += "\n";
          });
        }

        if (unavailable.length > 0) {
          response += `## ❌ Unavailable Drones (${unavailable.length})\n\n`;
          unavailable.forEach((drone) => {
            response += `**Drone ${drone.droneId} (${drone.droneName})**\n`;
            drone.reasons.forEach((r) => response += `  ${r}\n`);
            response += "\n";
          });
        }

        if (explanation.suggestions.length > 0) {
          response += "\n## 💡 Suggestions\n\n";
          explanation.suggestions.forEach((s) => response += `${s}\n`);
        }

        return {
          content: [{ type: "text", text: response }],
        };
      }

      case "compare_delivery_strategies": {
        const { deliveries } = args as { deliveries: any[] };
      
        if (deliveries.length < 2) {
          return {
            content: [
              {
                type: "text",
                text: "Need at least 2 deliveries to compare strategies.",
              },
            ],
          };
        }
      
        // Extract delivery times for context
        const deliveryTimes = deliveries.map(d => d.time).sort();
        const timeWindow = deliveryTimes.length > 1 
          ? `${deliveryTimes[0]} to ${deliveryTimes[deliveryTimes.length - 1]}`
          : deliveryTimes[0];
      
        // Strategy A: Single drone for all deliveries
        let singleDroneResult;
        try {
          singleDroneResult = await ilpClient.calculateDeliveryPath(deliveries);
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: "Cannot plan single-drone strategy - no drone can handle all deliveries together.",
              },
            ],
          };
        }
      
        // Strategy B: Individual drones for each delivery
        const individualResults = await Promise.all(
          deliveries.map((d) => ilpClient.calculateDeliveryPath([d]))
        );
      
        const totalIndividualCost = individualResults.reduce(
          (sum, r) => sum + r.totalCost,
          0
        );
        const totalIndividualMoves = individualResults.reduce(
          (sum, r) => sum + r.totalMoves,
          0
        );
      
        // Check if same drone is used multiple times
        const dronesUsed = individualResults.map((r) => r.dronePaths[0].droneId);
        const uniqueDrones = [...new Set(dronesUsed)];
        const isActuallyParallel = uniqueDrones.length === deliveries.length;
      
        // Calculate time based on whether it's actually parallel or not
        const singleDroneTime = singleDroneResult.totalMoves;
        let multiDroneTime: number;
        let multiDroneStrategy: string;
      
        if (isActuallyParallel) {
          // True parallel - use max time
          multiDroneTime = Math.max(...individualResults.map((r) => r.totalMoves));
          multiDroneStrategy = "Parallel (using different drones)";
        } else {
          // Same drone used multiple times - it's actually sequential
          multiDroneTime = totalIndividualMoves;
          multiDroneStrategy = `Sequential (same drone: Drone ${dronesUsed[0]})`;
        }
      
        const costDiff = totalIndividualCost - singleDroneResult.totalCost;
        const timeSavings = singleDroneTime - multiDroneTime;
        const timeSavingsPercent = singleDroneTime > 0 
          ? Math.round((timeSavings / singleDroneTime) * 100)
          : 0;
      
        // Build drone usage description
        let droneUsageDesc: string;
        if (isActuallyParallel) {
          droneUsageDesc = dronesUsed.map((id, i) => `Delivery ${i + 1}: Drone ${id}`).join(", ");
        } else {
          droneUsageDesc = `Drone ${dronesUsed[0]} for all deliveries (sequential, not parallel)`;
        }
      
        // Format flight times
        const singleFlightTime = formatFlightTime(singleDroneTime);
        const multiFlightTime = formatFlightTime(multiDroneTime);
      
        const comparison = `
      # Delivery Strategy Comparison
      *(Delivery window: ${timeWindow} | Time shown is cumulative flight time | Assumes ${SECONDS_PER_MOVE}s per move)*
      
      ## Strategy A: Single Drone (Optimized Route)
      - **Drone Used**: Drone ${singleDroneResult.dronePaths[0].droneId}
      - **Total Cost**: £${singleDroneResult.totalCost.toFixed(2)}
      - **Total Moves**: ${singleDroneResult.totalMoves}
      - **Flight Time**: ${singleFlightTime} (cumulative drone movement)
      - **How it works**: Optimized multi-stop route
      - **Pro**: ${costDiff > 0 ? 'Lower cost, ' : ''}efficient routing
      - **Con**: Sequential delivery
      
      ## Strategy B: Separate Planning Per Delivery
      - **Drones**: ${droneUsageDesc}
      - **Total Cost**: £${totalIndividualCost.toFixed(2)}
      - **Total Moves**: ${totalIndividualMoves} (combined)
      - **Flight Time**: ${multiFlightTime} (${multiDroneStrategy})
      - **How it works**: ${isActuallyParallel ? 'Each drone handles one delivery in parallel' : 'Same drone makes separate trips for each delivery'}
      - **Pro**: ${isActuallyParallel ? `Parallel execution${timeSavingsPercent > 0 ? `, ${timeSavingsPercent}% faster` : ''}` : 'Simpler individual trip planning'}
      - **Con**: ${costDiff > 0 ? `Higher cost (£${Math.abs(costDiff).toFixed(2)} more)` : 'Less efficient routing'}
      
      ---
      
      ## Recommendation
      ${
        isActuallyParallel && timeSavingsPercent > 20
          ? `**Use Strategy B** - True parallel delivery with ${timeSavingsPercent}% flight time savings${costDiff > 0 ? `, though it costs £${costDiff.toFixed(2)} more` : ''}.`
          : costDiff > 0
          ? `**Use Strategy A** to save £${costDiff.toFixed(2)}. ${!isActuallyParallel ? 'Strategy B would use the same drone anyway, so no flight time advantage.' : ''}`
          : `**Use Strategy B** - It's ${costDiff < 0 ? 'cheaper AND ' : ''}better optimized.`
      }
      
      **Note:** Flight times are for drone movement only. Actual delivery window spans ${timeWindow} to accommodate scheduled delivery times.
      `;
      
        return {
          content: [{ type: "text", text: comparison }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ILP MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});