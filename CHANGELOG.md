# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - Current

### Added
- **Modular monolith architecture** - Restructured for scalability and SaaS readiness
- **Dependency injection container** - All services managed via DI
- **Service layer** - 5 services (ChartConfig, ChartValidation, ChartGeneration, ChartStorage, Download)
- **Repository pattern** - 2 repositories (Indicators, Drawings)
- **REST API Layer** - Production-ready API with 15 endpoints
  - Middleware stack: CORS, rate limiting (token bucket), authentication, error handling
  - Controllers: HTTP handlers using DI container services
  - DTOs: Zod validation schemas for all requests/responses
  - Framework: Next.js 14 App Router with composable middleware
- **AI Chart Analysis** - OpenAI GPT-4o integration for chart analysis
- **JWT Authentication** - Laravel User Service integration with plan-based access
- **Conversation Module** - PostgreSQL with Prisma ORM for chat history
- **AWS S3 Storage** - Permanent chart storage with CloudFront CDN support
- **Chart drawings support** - Horizontal lines, trend lines, positions, orders
- **Comprehensive testing** - 109 unit tests with Vitest (100% passing)
- **Claude Code support** with project-scoped configuration

### Changed
- Refactored all 9 MCP tools to use DI and services
- Replaced ts-node with tsx for better performance
- Centralized database loaders, HTTP clients, config

### Fixed
- tsx integration issues

## [0.1.0] - Initial Release

### Added
- Initial release with 6 MCP tools
- Claude Desktop integration
- 100+ technical indicators support
- Multiple asset classes (crypto, stocks, forex)
- Dynamic documentation fetching
- Comprehensive API documentation with examples (JavaScript, Python, cURL)

## Upcoming Features

- OpenAPI/Swagger specification for API documentation
- API integration tests
- Redis for rate limiting (production-ready distributed)
- Batch chart generation
- Custom chart templates
- Historical data export (CSV/JSON)
- Advanced drawing tools (Fibonacci, channels, patterns)
- Real-time chart updates (WebSocket)
- Production deployment guides (Vercel, Railway, AWS)
- GitHub Actions CI/CD pipeline
