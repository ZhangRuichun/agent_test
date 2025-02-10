# Technical Documentation

## System Overview
Optishelf Agent is an advanced digital shelf analytics platform that enables marketers to test product lineups using both human consumers and AI-powered synthetic consumers. The platform integrates AI capabilities for product generation and testing while providing comprehensive analytics for market research.

## Architecture

### Frontend (React + TypeScript)
1. **Component Structure**
   - React with TypeScript for type safety
   - Shadcn UI components for consistent design
   - Wouter for lightweight routing
   - React Query for state management and API calls
   - React Hook Form with Zod validation

2. **Key Features**
   - Product management interface
   - Image upload and AI generation
   - Interactive shelf configuration
   - Real-time form validation
   - Responsive design with Tailwind CSS

### Backend (Express + TypeScript)
1. **API Structure**
   - RESTful API endpoints
   - Express.js router implementation
   - Multer middleware for file uploads
   - OpenAI GPT-4o integration
   - Pino logging system

2. **Key Features**
   - Secure file upload handling
   - Image processing and storage
   - AI-powered product generation
   - Authentication middleware
   - Rate limiting and security measures

### Database (PostgreSQL + Drizzle ORM)
1. **Schema Design**
   ```typescript
   // Core Tables
   - products
   - productImages
   - shelves
   - shelfVariants
   - personas
   - respondents
   - questions
   - responses
   ```

2. **Key Relations**
   ```typescript
   // One-to-Many
   Product -> ProductImages
   Respondent -> Responses
   
   // Many-to-Many
   Shelf <-> Products (through shelfProducts)
   Shelf <-> Personas (through shelfPersonas)
   Shelf <-> Questions (through shelfQuestions)
   ```

## Data Models

### Product
```typescript
{
  id: number
  brandName: string
  productName: string
  description: string
  listPrice: number // Stored in cents
  benefits?: string
  cost?: number
  lowPrice?: number
  highPrice?: number
  newProduct: "yes" | "no"
  status: "ACTIVE" | "DELETED"
  images?: { id: number, url: string }[]
}
```

### Shelf
```typescript
{
  id: number
  projectName: string
  description?: string
  createdAt: Date
  createdBy: number
  status: "ACTIVE" | "DELETED"
}
```

### Persona
```typescript
{
  id: number
  name: string
  demographicScreener: string
  demographics: object
  demandSpaces: object
  questions: object
  status: "ACTIVE" | "DELETED"
}
```

## API Endpoints

### Products API
```typescript
// Product Management
POST   /api/products              // Create new product
GET    /api/products              // List products
GET    /api/products/:id          // Get product details
PUT    /api/products/:id          // Update product
DELETE /api/products/:id          // Delete product

// Product Images
POST   /api/products/:id/images           // Upload product image
POST   /api/products/:id/download-image   // Save AI-generated image
DELETE /api/products/:id/images/:imageId  // Delete product image

// AI Generation
POST   /api/generate-products    // Generate product ideas with AI
```

### Shelves API
```typescript
// Shelf Management
POST   /api/shelves              // Create new shelf
GET    /api/shelves              // List shelves
GET    /api/shelves/:id          // Get shelf details
PUT    /api/shelves/:id          // Update shelf
DELETE /api/shelves/:id          // Delete shelf

// Shelf Configuration
POST   /api/shelves/:id/personas  // Configure shelf personas
POST   /api/shelves/:id/products  // Configure shelf products
```

## Security Implementation

1. **Authentication**
   - Session-based authentication
   - Secure password hashing
   - Role-based access control
   - Session timeout handling

2. **File Upload Security**
   - File type validation
   - Size limits (5MB max)
   - Secure file storage
   - Unique filename generation

3. **API Security**
   - Input validation with Zod
   - Request rate limiting
   - CORS configuration
   - XSS prevention
   - SQL injection protection

## Error Handling

1. **API Error Response Format**
```typescript
{
  error: {
    code: string
    message: string
    details?: object
  }
  status: number
}
```

2. **Common Error Codes**
```typescript
const ErrorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMITED: 'RATE_LIMITED'
}
```

## Performance Considerations

1. **Frontend Optimization**
   - Code splitting
   - Lazy loading of routes
   - Image optimization
   - Caching strategies
   - Bundle size optimization

2. **Backend Optimization**
   - Database indexing
   - Query optimization
   - Response caching
   - Connection pooling
   - Compression middleware

## Testing Strategy

1. **Unit Testing**
   - Component testing with Vitest
   - API endpoint testing
   - Database operation testing
   - Utility function testing

2. **Integration Testing**
   - API integration tests
   - Database integration
   - File upload testing
   - Authentication flow testing

3. **End-to-End Testing**
   - User flow testing
   - Product management flows
   - Shelf configuration flows
   - Response collection flows

## Monitoring and Logging

1. **Application Logging**
   - Pino logger implementation
   - Log levels configuration
   - Request/Response logging
   - Error tracking
   - Performance monitoring

2. **Metrics Collection**
   - API response times
   - Error rates
   - Database performance
   - File upload metrics
   - AI generation metrics

## Deployment

1. **Environment Configuration**
```typescript
// Required Environment Variables
DATABASE_URL=postgresql://...
OPENAI_API_KEY=...
SESSION_SECRET=...
PORT=5000
NODE_ENV=development|production
```

2. **Build Process**
```bash
# Production build
npm run build

# Database migration
npm run db:push

# Start production server
npm start
```

## Future Considerations

1. **Scalability**
   - Horizontal scaling strategy
   - Load balancer configuration
   - Database replication
   - Caching layer implementation

2. **Feature Roadmap**
   - Enhanced AI capabilities
   - Advanced analytics dashboard
   - Multi-tenant support
   - Real-time collaboration
   - Advanced reporting features 