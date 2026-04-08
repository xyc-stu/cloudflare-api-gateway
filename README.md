# Cloudflare API Gateway

A production-ready API Gateway built on Cloudflare Workers with TypeScript, featuring JWT authentication, rate limiting, KV storage, and comprehensive middleware support.

## Features

- **🔐 JWT Authentication** - Secure token-based authentication with auto-generated secrets
- **🚦 Rate Limiting** - Configurable rate limits per endpoint with KV storage
- **📊 Request Logging** - Structured JSON logging with request tracing
- **🌍 CORS Support** - Flexible cross-origin resource sharing configuration
- **💾 KV Storage** - Cloudflare KV integration for caching and session management
- **⚡ Edge Performance** - Runs on Cloudflare's global edge network
- **🛡️ Error Handling** - Comprehensive error handling with detailed responses
- **📚 API Documentation** - Self-documenting API endpoints

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: [Hono](https://hono.dev/) - Ultrafast web framework
- **Language**: TypeScript
- **Authentication**: JWT with Web Crypto API
- **Storage**: Cloudflare KV
- **Deployment**: Wrangler CLI

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI authenticated

### Installation

```bash
# Clone the repository
git clone https://github.com/xyc-stu/cloudflare-api-gateway.git
cd cloudflare-api-gateway

# Install dependencies
npm install

# Authenticate with Cloudflare
npx wrangler login
```

### Development

```bash
# Start local development server
npm run dev

# The server will start at http://localhost:8787
```

### Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## API Endpoints

### Health & Status

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Basic health check | No |
| GET | `/health/detailed` | Detailed health status | No |
| GET | `/health/ready` | Readiness probe | No |
| GET | `/health/live` | Liveness probe | No |

### Authentication

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/auth/login` | User login | 5/15min |
| POST | `/auth/register` | User registration | 5/15min |
| GET | `/auth/demo-token` | Get demo token | 5/15min |
| POST | `/auth/refresh` | Refresh JWT token | 5/15min |
| POST | `/auth/logout` | User logout | 5/15min |

### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/me` | Get current user | Yes |
| PATCH | `/users/me` | Update current user | Yes |
| GET | `/users` | List all users | Admin |
| GET | `/users/:id` | Get user by ID | Yes |
| POST | `/users` | Create user | Admin |
| PATCH | `/users/:id` | Update user | Admin |
| DELETE | `/users/:id` | Delete user | Admin |

### API Utilities

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api` | API information | No |
| GET | `/api/docs` | API documentation | No |
| GET | `/api/data` | Get paginated data | No |
| GET | `/api/data/search` | Search data | No |
| GET | `/api/data/stats` | Get statistics | No |
| ALL | `/api/echo` | Echo request | No |
| GET | `/api/time` | Server time | No |
| GET | `/api/ip` | IP information | No |

## Authentication

The API uses JWT Bearer tokens for authentication. Include the token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-worker.your-subdomain.workers.dev/users/me
```

### Getting a Demo Token

```bash
curl https://your-worker.your-subdomain.workers.dev/auth/demo-token
```

## Rate Limiting

Rate limits are applied per endpoint category:

- **Public endpoints**: 1000 requests/minute
- **Authenticated endpoints**: 200 requests/minute
- **Auth endpoints**: 5 requests/15 minutes

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Configuration

### Environment Variables

Set in `wrangler.jsonc`:

```json
{
  "vars": {
    "ENVIRONMENT": "production",
    "API_VERSION": "v1",
    "JWT_ISSUER": "cloudflare-api-gateway",
    "JWT_AUDIENCE": "api-users"
  }
}
```

### KV Namespaces

The following KV namespaces are used:

- `RATE_LIMIT_STORE` - Rate limiting data
- `SESSION_STORE` - Session and JWT secret storage
- `CACHE_STORE` - API response caching

## Project Structure

```
cloudflare-api-gateway/
├── src/
│   ├── index.ts          # Main entry point
│   ├── types/
│   │   └── index.ts      # TypeScript type definitions
│   ├── middleware/
│   │   ├── auth.ts       # Authentication middleware
│   │   ├── cors.ts       # CORS configuration
│   │   ├── error-handler.ts  # Error handling
│   │   ├── logger.ts     # Request logging
│   │   └── rate-limit.ts # Rate limiting
│   ├── routes/
│   │   ├── api.ts        # General API routes
│   │   ├── auth.ts       # Authentication routes
│   │   ├── health.ts     # Health check routes
│   │   └── users.ts      # User management routes
│   └── utils/
│       ├── cache.ts      # Caching utilities
│       ├── errors.ts     # Error classes
│       ├── helpers.ts    # Helper functions
│       ├── jwt.ts        # JWT utilities
│       └── rate-limiter.ts  # Rate limiting logic
├── package.json
├── tsconfig.json
├── wrangler.jsonc
└── README.md
```

## Development

### Local Development

```bash
# Start development server with hot reload
npm run dev

# Type check
npm run check

# Build
npm run build

# Generate types from Wrangler config
npm run types
```

### Testing

```bash
# Get a demo token
TOKEN=$(curl -s https://localhost:8787/auth/demo-token | jq -r '.data.token')

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" https://localhost:8787/users/me
```

## Deployment

### Staging

```bash
# Deploy to staging environment
npx wrangler deploy --env staging
```

### Production

```bash
# Deploy to production
npm run deploy
# or
npx wrangler deploy
```

## Monitoring

View logs in real-time:

```bash
npx wrangler tail
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Author

**xyc-stu**

---

Built with ❤️ on Cloudflare Workers
