# Deployment Guide - Render.com

## Prerequisites
- GitHub repository: `vivid-brg/n8n`
- Render.com account
- n8n webhook URL: `https://brg-ai.app.n8n.cloud/webhook/super-ai-agent`

## Step-by-Step Deployment

### 1. Connect Repository to Render
1. Go to [Render.com](https://render.com) and log in
2. Click "New +" → "Web Service"
3. Connect your GitHub account if not already connected
4. Select repository: `vivid-brg/n8n`
5. Choose branch: `main`

### 2. Configure Web Service
**Basic Settings:**
- **Name**: `mcp-adapter`
- **Environment**: `Node`
- **Plan**: `Free`
- **Branch**: `main`

**Build & Deploy:**
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

### 3. Environment Variables
Add these environment variables in Render dashboard:

| Key | Value |
|-----|-------|
| `N8N_WEBHOOK_URL` | `https://brg-ai.app.n8n.cloud/webhook/super-ai-agent` |
| `PORT` | `3000` |

### 4. Advanced Settings (Optional)
- **Health Check Path**: `/health`
- **Auto-Deploy**: `Yes` (enabled by default)

### 5. Deploy
1. Click "Create Web Service"
2. Wait for initial deployment (3-5 minutes)
3. Monitor build logs for any errors

## Verification Steps

### 1. Check Service Status
- Service should show "Live" status in Render dashboard
- Build logs should show: `MCP Adapter running on port 3000`

### 2. Test SSE Endpoint
Replace `<your-render-url>` with your actual Render URL:

```bash
curl -N https://<your-render-url>/mcp
```

**Expected Response:**
```
event: open
data: {}
```

### 3. Test Health Endpoint
```bash
curl https://<your-render-url>/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "activeConnections": 0,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 4. Test MCP Processing
```bash
curl -X POST https://<your-render-url>/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "assistant",
        "function_call": {
          "name": "test_function",
          "arguments": "{\"input\": \"Hello from production test\"}"
        }
      }
    ]
  }'
```

## Auto-Deployment Configuration

The `render.yaml` file in the repository root enables automatic deployments:

```yaml
services:
  - type: web
    name: mcp-adapter
    env: node
    plan: free
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: N8N_WEBHOOK_URL
        value: https://brg-ai.app.n8n.cloud/webhook/super-ai-agent
      - key: PORT
        value: 3000
    healthCheckPath: /health
```

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check Node.js version compatibility
   - Verify package.json dependencies

2. **Service Won't Start**
   - Check environment variables are set
   - Verify start command: `node server.js`

3. **n8n Webhook Errors**
   - Ensure n8n webhook is active (click "Execute workflow")
   - Verify webhook URL is correct

4. **SSE Connection Issues**
   - Check CORS settings
   - Verify HTTPS is being used

### Logs
- Access logs via Render dashboard → Service → Logs
- Look for startup message: `MCP Adapter running on port 3000`

## Production Considerations

1. **Scaling**: Free tier has limitations, consider upgrading for production
2. **Monitoring**: Set up monitoring and alerting
3. **Security**: Review CORS settings and add authentication if needed
4. **SSL**: Render provides SSL certificates automatically

## Support

- Render Documentation: https://render.com/docs
- MCP Adapter Issues: Check repository issues section 