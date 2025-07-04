# n8n MCP Adapter

A minimal Node.js adapter that sits in front of your n8n webhook and speaks the Model Context Protocol (MCP) over Server-Sent Events (SSE) for ChatGPT Connectors.

## Features

- **SSE Handshake**: `GET /mcp` endpoint for establishing SSE connections
- **MCP Message Processing**: `POST /mcp` endpoint for receiving and processing MCP messages
- **n8n Integration**: Forwards processed messages to your n8n webhook
- **Real-time Broadcasting**: Broadcasts n8n responses back to all connected SSE clients
- **Health Monitoring**: Built-in health check endpoint

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure your n8n webhook URL:

```bash
cp env.example .env
```

Edit `.env` and set your n8n webhook URL:

```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
PORT=3000
```

### 3. Run the Server

```bash
# Production
npm start

# Development (with auto-restart)
npm run dev
```

The server will start on port 3000 (or the port specified in your `.env` file).

## API Endpoints

### GET /mcp - SSE Connection

Establishes a Server-Sent Events connection for real-time communication.

**Headers:**
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`

**Events:**
- `open`: Sent immediately upon connection
- `mcp.response`: Broadcasted when n8n responses are received

### POST /mcp - MCP Message Processing

Receives MCP messages, processes them, and forwards to n8n.

**Request Body:**
```json
{
  "messages": [
    {
      "role": "assistant",
      "function_call": {
        "name": "your_function_name",
        "arguments": "{\"input\": \"Hello world\", \"imageUrl\": \"https://example.com/image.jpg\"}"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "MCP message processed and broadcasted",
  "clientsCount": 1
}
```

### GET /health - Health Check

Returns server status and active connection count.

```json
{
  "status": "ok",
  "activeConnections": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Testing

### Test SSE Connection

Connect to the SSE endpoint and listen for events:

```bash
curl -N http://localhost:3000/mcp
```

You should see:
```
event: open
data: {}

```

### Test MCP Message Processing

Send a test MCP message:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "assistant",
        "function_call": {
          "name": "test_function",
          "arguments": "{\"input\": \"Hello from curl test\"}"
        }
      }
    ]
  }'
```

### Test Health Endpoint

```bash
curl http://localhost:3000/health
```

## Message Flow

1. **Client connects** to `GET /mcp` via SSE
2. **MCP message received** via `POST /mcp`
3. **Message parsed** to extract `function_call.arguments`
4. **Payload forwarded** to n8n webhook
5. **n8n response** received and processed
6. **Response broadcasted** to all connected SSE clients as `mcp.response` event

## Expected n8n Webhook Response

Your n8n webhook should return JSON in this format:

```json
{
  "reply": "Response text from n8n",
  "audioUrl": "https://example.com/audio.mp3",
  "imageAnalysis": {
    "description": "Image analysis results"
  }
}
```

## Error Handling

The adapter includes comprehensive error handling for:

- Invalid JSON in `function_call.arguments`
- Missing required fields (`input`)
- n8n webhook failures
- SSE client disconnections
- Malformed requests

## Development

### Project Structure

```
├── server.js          # Main server implementation
├── package.json       # Dependencies and scripts
├── env.example        # Environment configuration template
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `N8N_WEBHOOK_URL` | Your n8n webhook endpoint | Yes | - |
| `PORT` | Server port | No | 3000 |

### Logging

The server provides detailed console logging for:

- SSE client connections/disconnections
- MCP message processing
- n8n webhook requests/responses
- Error conditions

## Troubleshooting

### Common Issues

1. **"N8N_WEBHOOK_URL not configured"**
   - Ensure `.env` file exists and contains `N8N_WEBHOOK_URL`

2. **"No assistant message with function_call found"**
   - Verify your MCP message contains an assistant message with a `function_call`

3. **"Invalid JSON in function_call.arguments"**
   - Ensure `function_call.arguments` is valid JSON string

4. **SSE connection not receiving events**
   - Check that your client properly handles SSE protocol
   - Verify CORS settings if testing from browser

### Debug Mode

For additional debugging, run with Node.js debug flags:

```bash
NODE_OPTIONS="--inspect" npm start
```

## License

MIT 