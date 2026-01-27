# Architecture Overview

This document provides a detailed overview of the PC Part Picker architecture.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Pages: Builder, Share, Admin                         │  │
│  │  State Management: TanStack Query                     │  │
│  │  UI: Tailwind CSS                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓ HTTP/REST                      │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend (ASP.NET Core)                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Api Layer                                            │  │
│  │  - PartsController                                    │  │
│  │  - BuildsController                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Application Layer                                    │  │
│  │  - CompatibilityService                               │  │
│  │  - WattageEstimator                                   │  │
│  │  - DTOs                                               │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Infrastructure Layer                                 │  │
│  │  - DbContext                                          │  │
│  │  - Repositories                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Domain Layer                                         │  │
│  │  - Entities (CPU, GPU, RAM, etc.)                     │  │
│  │  - Interfaces                                         │  │
│  │  - Enums                                              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database (MySQL 8.0)                      │
│  - Parts table (TPH for all part types)                     │
│  - Builds table                                              │
└─────────────────────────────────────────────────────────────┘
```

## Backend Architecture - Clean Architecture

### Domain Layer
**Purpose:** Contains the core business entities and domain logic.

**Responsibilities:**
- Define domain entities (CPU, GPU, RAM, Motherboard, Storage, PSU, Case, Build)
- Define enums (SocketType, RAMType, FormFactor, PartCategory)
- Define repository interfaces
- No dependencies on other layers

**Key Files:**
- `Entities/Part.cs` - Abstract base class for all parts
- `Entities/CPU.cs` - CPU-specific properties
- `Entities/Build.cs` - User build configuration
- `Enums/SocketType.cs` - CPU socket types
- `Interfaces/IRepository.cs` - Generic repository pattern

### Application Layer
**Purpose:** Contains business logic and use cases.

**Responsibilities:**
- Define DTOs for data transfer
- Implement business services
- Define service interfaces
- Orchestrate domain objects

**Key Services:**
- `CompatibilityService` - Validates part compatibility
  - Socket matching (CPU ↔ Motherboard)
  - RAM type compatibility
  - Form factor validation
  - PSU wattage checking
  
- `WattageEstimator` - Calculates power requirements
  - Sums up individual part wattages
  - Adds system overhead
  - Recommends PSU with 30% headroom

**Dependencies:** Domain layer only

### Infrastructure Layer
**Purpose:** Implements data access and external concerns.

**Responsibilities:**
- Database context configuration
- Repository implementations
- Database migrations
- External service integrations

**Key Components:**
- `ApplicationDbContext` - EF Core DbContext
  - Configures entity relationships
  - Sets up Table Per Hierarchy (TPH) for parts
  - Defines indexes and constraints
  
- `Repository<T>` - Generic repository implementation
  - CRUD operations
  - Async/await patterns

**Dependencies:** Domain and Application layers

### API Layer
**Purpose:** Exposes REST endpoints and handles HTTP concerns.

**Responsibilities:**
- Define API controllers
- Configure dependency injection
- Setup middleware (CORS, authentication, etc.)
- API documentation (Swagger)

**Key Controllers:**
- `PartsController` - Manages PC parts
  - GET /api/parts/cpus
  - POST /api/parts/cpus
  - Similar endpoints for other part types
  
- `BuildsController` - Manages user builds
  - POST /api/builds - Create build
  - GET /api/builds/{id} - Get build
  - GET /api/builds/share/{code} - Share build
  - POST /api/builds/{id}/check-compatibility

**Dependencies:** Infrastructure and Application layers

## Frontend Architecture

### Component Structure

```
src/
├── api/
│   └── client.ts              # Axios API client
├── pages/
│   ├── BuilderPage.tsx        # Main build configuration page
│   ├── SharePage.tsx          # Read-only build view
│   └── AdminPage.tsx          # Parts management
├── types/
│   └── index.ts               # TypeScript interfaces
└── App.tsx                    # Root component with routing
```

### State Management

- **TanStack Query (React Query)** for server state
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Query invalidation

- **useState** for local UI state
  - Selected category
  - Current build configuration
  - Form inputs

### Data Flow

1. User selects a part category
2. TanStack Query fetches parts from API
3. User clicks on a part
4. Local state updates build configuration
5. UI recalculates totals (price, wattage)
6. User saves build
7. Mutation sends data to API
8. API returns share code
9. Query cache is invalidated
10. UI updates with new data

## Database Schema

### Parts Table (Table Per Hierarchy)

```sql
CREATE TABLE Parts (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Discriminator VARCHAR(50),  -- CPU, GPU, RAM, etc.
    Name VARCHAR(200),
    Manufacturer VARCHAR(100),
    Price DECIMAL(18,2),
    ImageUrl VARCHAR(500),
    Wattage INT,
    ProductUrl VARCHAR(500),
    Category INT,
    CreatedAt DATETIME,
    UpdatedAt DATETIME,
    
    -- CPU specific
    Socket INT,
    CoreCount INT,
    ThreadCount INT,
    BaseClock DECIMAL(5,2),
    BoostClock DECIMAL(5,2),
    IntegratedGraphics BIT,
    
    -- Motherboard specific
    Chipset VARCHAR(100),
    FormFactor INT,
    MemoryType INT,
    MemorySlots INT,
    MaxMemoryGB INT,
    PCIeSlots INT,
    M2Slots INT,
    SataSlots INT,
    
    -- ... other part-specific columns
);
```

### Builds Table

```sql
CREATE TABLE Builds (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(200),
    Description TEXT,
    ShareCode VARCHAR(20) UNIQUE,
    CPUId INT,
    MotherboardId INT,
    RAMId INT,
    GPUId INT,
    StorageId INT,
    PSUId INT,
    CaseId INT,
    TotalPrice DECIMAL(18,2),
    TotalWattage INT,
    CreatedAt DATETIME,
    UpdatedAt DATETIME,
    
    FOREIGN KEY (CPUId) REFERENCES Parts(Id),
    FOREIGN KEY (MotherboardId) REFERENCES Parts(Id),
    -- ... other foreign keys
);
```

## Compatibility Logic

The `CompatibilityService` performs the following checks:

### 1. Socket Compatibility
```csharp
if (build.CPU.Socket != build.Motherboard.Socket)
    // Error: Incompatible sockets
```

### 2. RAM Type Compatibility
```csharp
if (build.RAM.Type != build.Motherboard.MemoryType)
    // Error: Incompatible RAM type
```

### 3. Form Factor Compatibility
```csharp
// ATX case can fit MicroATX and MiniITX
// MiniITX case can only fit MiniITX board
```

### 4. GPU Clearance
```csharp
if (build.GPU.Length > build.Case.MaxGPULength)
    // Error: GPU too long for case
```

### 5. PSU Wattage
```csharp
int totalWattage = EstimateTotalWattage(build);
int recommended = totalWattage * 1.3; // 30% headroom

if (build.PSU.WattageRating < totalWattage)
    // Error: Insufficient PSU
else if (build.PSU.WattageRating < recommended)
    // Warning: Below recommended
```

## Wattage Calculation

```csharp
public int EstimateTotalWattage(Build build)
{
    int total = 0;
    
    total += build.CPU?.Wattage ?? 0;      // TDP
    total += build.GPU?.Wattage ?? 0;      // TDP
    total += build.RAM?.Wattage ?? 0;      // ~5W per module
    total += build.Storage?.Wattage ?? 0;  // ~2-8W
    total += build.Motherboard?.Wattage ?? 0; // ~50W
    total += 50; // System overhead (fans, RGB, etc.)
    
    return total;
}
```

## Security Considerations

### Current State
- CORS configured for development (localhost:5173, localhost:3000)
- JWT authentication configured but not enforced
- No user authentication yet

### Recommended Additions
- Implement user registration/login
- Add JWT token validation middleware
- Rate limiting for API endpoints
- Input validation and sanitization
- SQL injection protection (EF Core handles this)
- XSS protection (React handles this)

## Scalability Considerations

### Current Architecture
- Monolithic application
- Single database
- In-memory caching (via TanStack Query on frontend)

### Future Improvements
- Add Redis for server-side caching
- Implement CQRS pattern for reads/writes
- Add message queue for async operations
- Separate read/write databases
- Microservices architecture (separate services for parts, builds, compatibility)

## Performance Optimizations

### Backend
- Use async/await throughout
- Implement pagination for large result sets
- Add database indexes on foreign keys
- Use EF Core Include() for eager loading

### Frontend
- Code splitting with React.lazy()
- Image lazy loading
- Virtual scrolling for large lists
- Debounce search inputs
- Memoization with useMemo/useCallback

## Testing Strategy

### Backend Testing
- Unit tests for CompatibilityService
- Unit tests for WattageEstimator
- Integration tests for API endpoints
- Repository pattern tests

### Frontend Testing
- Component tests with React Testing Library
- Integration tests for user flows
- E2E tests with Playwright/Cypress

## Deployment

### Development
- Frontend: Vite dev server (port 5173)
- Backend: dotnet run (ports 5000/5001)
- Database: Docker container (port 3306)

### Production Recommendations
- Frontend: Build and deploy to CDN (Vercel, Netlify)
- Backend: Deploy to Azure App Service or Docker container
- Database: Azure Database for MySQL or AWS RDS
- Use environment variables for configuration
- Enable HTTPS everywhere
- Set up CI/CD pipeline (GitHub Actions)

## Monitoring & Logging

### Recommended Tools
- Application Insights (Azure)
- Sentry (error tracking)
- Structured logging with Serilog
- Health check endpoints
- Performance metrics

## Future Enhancements

1. **User System**
   - User registration/login
   - Save multiple builds per user
   - User profiles

2. **Advanced Features**
   - Price tracking and alerts
   - Build comparison
   - Bottleneck analysis
   - Performance benchmarks
   - Part reviews and ratings

3. **Data Improvements**
   - Integration with real PC part APIs
   - Automated price updates
   - Stock availability checking

4. **UI/UX Enhancements**
   - Dark mode
   - Mobile responsive design
   - Advanced filtering and sorting
   - Build templates
   - Export to PDF
