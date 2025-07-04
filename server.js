import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Store active SSE connections
const clients = new Set();

// GET /mcp - SSE handshake endpoint
app.get('/mcp', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial open event
  res.write('event: open\ndata: {}\n\n');

  // Add client to tracking set
  clients.add(res);

  // Handle client disconnect
  req.on('close', () => {
    clients.delete(res);
    console.log('Client disconnected, active connections:', clients.size);
  });

  console.log('New SSE client connected, active connections:', clients.size);
});

// POST /mcp - Receive incoming MCP messages
app.post('/mcp', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    // Find the first assistant message with a function_call
    const assistantMessage = messages.find(msg => 
      msg.role === 'assistant' && msg.function_call
    );

    if (!assistantMessage) {
      return res.status(400).json({ error: 'No assistant message with function_call found' });
    }

    const { function_call } = assistantMessage;
    
    // Parse function_call.arguments as JSON
    let parsedArgs;
    try {
      parsedArgs = JSON.parse(function_call.arguments);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JSON in function_call.arguments' });
    }

    // Extract the payload for n8n
    const { input, imageUrl, audioUrl } = parsedArgs;
    
    if (!input) {
      return res.status(400).json({ error: 'input field is required in function_call.arguments' });
    }

    // Prepare payload for n8n webhook
    const n8nPayload = {
      input,
      ...(imageUrl && { imageUrl }),
      ...(audioUrl && { audioUrl })
    };

    // Forward to n8n webhook
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return res.status(500).json({ error: 'N8N_WEBHOOK_URL not configured' });
    }

    console.log('Forwarding to n8n webhook:', n8nWebhookUrl);
    console.log('Payload:', n8nPayload);

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload)
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n webhook responded with status: ${n8nResponse.status}`);
    }

    const n8nData = await n8nResponse.json();
    
    console.log('n8n response:', n8nData);

    // Prepare MCP response
    const mcpResponse = {
      role: 'function',
      name: function_call.name,
      content: JSON.stringify(n8nData)
    };

    // Broadcast to all connected SSE clients
    const sseMessage = `event: mcp.response\ndata: ${JSON.stringify(mcpResponse)}\n\n`;
    
    clients.forEach(client => {
      try {
        client.write(sseMessage);
      } catch (error) {
        console.log('Failed to send to client, removing from set');
        clients.delete(client);
      }
    });

    console.log(`Broadcasted response to ${clients.size} clients`);

    // Return success response
    res.json({ 
      success: true, 
      message: 'MCP message processed and broadcasted',
      clientsCount: clients.size 
    });

  } catch (error) {
    console.error('Error processing MCP message:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeConnections: clients.size,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`MCP Adapter running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/mcp`);
  console.log(`POST endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Active SSE connections: ${clients.size}`);
}); 