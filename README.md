# ILP CW3: MCP-Enabled Drone Operations Dashboard
**Student ID:** s2479386

## What This Is
A conversational interface for ILP drone delivery planning using Anthropic's Model Context Protocol (MCP). Hospital staff can plan deliveries through natural language instead of JSON/REST APIs.

**Key Features:**
- Natural language delivery planning via Claude AI
- Real-time drone flight visualization
- Multi-drone coordination
- Automatic cost calculation

---

## Architecture
```
User → Next.js Dashboard → MCP Server → Claude API → ILP REST API (CW2 Backend)
```

**Components:**
- `operations-ui/` - Next.js dashboard (port 3000)
- `mcp-server/` - MCP protocol server  
- `backend/` - ILP REST API from CW2 (port 8080)

---

## Prerequisites
- Node.js 18+
- Java 17+ (for backend)
- Anthropic API key (get from https://console.anthropic.com/)

---

## Setup & Running

### 1. Start Backend (CW2)
```bash
cd backend
./mvnw spring-boot:run
```
Verify: `curl http://localhost:8080/api/v1/uid` should return `s2479386`

### 2. Configure Dashboard
```bash
cd operations-ui
```

Create `.env.local`:
```
ANTHROPIC_API_KEY=your_api_key_here
NEXT_PUBLIC_ILP_API_URL=http://localhost:8080
```

Install and run:
```bash
npm install
npm run dev
```

### 3. Access Dashboard
Open http://localhost:3000

---

## Usage

**Example conversation:**
```
You: "I need to deliver 5kg to Western General Hospital with cooling"
Claude: [asks for date, time, coordinates]
You: "Date: 2025-12-05, time: 10:00, coordinates: -3.2351, 55.9623"
Claude: [shows drone selection, cost estimate]
You: "confirm"
```

Click **"Live Flight Map"** to watch animated drone paths.

---

## Technology Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Leaflet.js
- **MCP Server:** @modelcontextprotocol/sdk
- **Backend:** Spring Boot (CW2)
- **State:** Zustand

---

## MCP Tools Implemented
- `query_available_drones` - Find available drones
- `plan_delivery_path` - Calculate optimal routes
- `get_drone_details` - Get drone specifications

---

## Project Structure
```
├── backend/              # CW2 Spring Boot API
├── mcp-server/          # MCP protocol server
│   └── src/
│       └── index.ts     # Tool definitions
└── operations-ui/       # Next.js dashboard
    ├── app/
    │   ├── api/chat/   # Claude integration
    │   ├── components/ # ClaudeChat, MapView
    │   └── page.tsx    # Main dashboard
    └── lib/
        ├── store.ts    # State management
        └── types.ts    # TypeScript types
```

---

## Troubleshooting

**Backend not responding:**
```bash
cd backend
./mvnw clean install
./mvnw spring-boot:run
```

**Map not loading:**  
Check browser console for errors, ensure port 3000 is free

---

## Future Enhancements
- Weather API integration
- Emergency priority handling
- Historical analytics
- Multi-language support
