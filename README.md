# PC Part Picker

PC Builder Configurator is a full-stack web app that lets users create and validate custom PC builds. It performs real-time compatibility checks, estimates power usage and total cost, and allows builds to be saved, shared, and exported. Built with ASP.NET Core, MySQL, and React + TypeScript.

## Tech Stack

### Backend
- **Framework**: ASP.NET Core Web API (C#)
- **Database**: MySQL 8.0
- **ORM**: Entity Framework Core (Code-First) with Pomelo.EntityFrameworkCore.MySql
- **Architecture**: Clean Architecture (Domain, Application, Infrastructure, Api layers)
- **Authentication**: JWT (configured, ready to implement)

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v6

### Optional Tools
- **Data Scraper**: Console application with AngleSharp and rate limiting for personal data collection

## Project Structure

```
PC-Part-Picker/
├── backend/
│   ├── PCPartPicker.Domain/          # Domain entities and interfaces
│   │   ├── Entities/                 # CPU, GPU, RAM, Motherboard, etc.
│   │   ├── Enums/                    # SocketType, FormFactor, RAMType
│   │   └── Interfaces/               # IRepository
│   ├── PCPartPicker.Application/     # Business logic
│   │   ├── DTOs/                     # Data Transfer Objects
│   │   ├── Interfaces/               # Service interfaces
│   │   └── Services/                 # CompatibilityService, WattageEstimator
│   ├── PCPartPicker.Infrastructure/  # Data access
│   │   ├── Data/                     # DbContext
│   │   └── Repositories/             # Generic repository
│   └── PCPartPicker.Api/             # REST API
│       └── Controllers/              # PartsController, BuildsController
├── frontend/
│   └── src/
│       ├── api/                      # API client with axios
│       ├── components/               # Reusable React components
│       ├── pages/                    # BuilderPage, SharePage, AdminPage
│       ├── types/                    # TypeScript interfaces
│       └── hooks/                    # Custom React hooks
├── scraper/
│   └── PCPartScraper/                # Optional data scraping tool
│       ├── Models/                   # PartData
│       └── Services/                 # RateLimitedScraper, DataExporter
└── docker-compose.yml                # MySQL container setup
```

## Features

### Core Features
- ✅ Select PC parts by category (CPU, Motherboard, RAM, GPU, Storage, PSU, Case)
- ✅ Real-time compatibility checking with detailed warnings and errors
- ✅ Total price calculation
- ✅ Estimated wattage with PSU headroom recommendations
- ✅ Save builds with unique share codes
- ✅ Share builds via URL
- ✅ Admin panel for parts management

### Compatibility Checks
- CPU and Motherboard socket matching
- RAM type compatibility with motherboard
- RAM capacity validation
- GPU length vs. Case clearance
- Motherboard and Case form factor compatibility
- PSU wattage sufficiency with 30% headroom recommendation
- Integrated graphics detection and warnings

## Getting Started

### Prerequisites
- .NET 10 SDK
- Node.js 18+ and npm
- MySQL 8.0 (or use Docker)
- Git

### Backend Setup

1. **Start MySQL Database**
   ```bash
   # Using Docker (recommended)
   docker-compose up -d

   # Or install MySQL locally and ensure it's running on port 3306
   ```

2. **Update Connection String** (if needed)
   Edit `backend/PCPartPicker.Api/appsettings.json`:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=localhost;Database=pcpartpicker;User=root;Password=;"
   }
   ```

3. **Run EF Core Migrations**
   ```bash
   cd backend
   dotnet ef migrations add InitialCreate --project PCPartPicker.Infrastructure --startup-project PCPartPicker.Api
   dotnet ef database update --project PCPartPicker.Infrastructure --startup-project PCPartPicker.Api
   ```

4. **Run the API**
   ```bash
   cd backend/PCPartPicker.Api
   dotnet run
   ```
   
   API will be available at `https://localhost:5001` (or `http://localhost:5000`)
   Swagger UI: `https://localhost:5001/swagger`

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure API URL** (if needed)
   Edit `frontend/.env`:
   ```
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   
   Frontend will be available at `http://localhost:5173`

### Scraper Setup (Optional)

1. **Build the Scraper**
   ```bash
   cd scraper/PCPartScraper
   dotnet build
   ```

2. **Run the Scraper**
   ```bash
   dotnet run
   ```
   
   Output files will be in `scraper/PCPartScraper/output/`

## API Endpoints

### Parts Management
- `GET /api/parts/cpus` - Get all CPUs
- `GET /api/parts/cpus/{id}` - Get CPU by ID
- `POST /api/parts/cpus` - Create new CPU
- `GET /api/parts/motherboards` - Get all motherboards
- `POST /api/parts/motherboards` - Create new motherboard
- `GET /api/parts/rams` - Get all RAM modules
- `GET /api/parts/gpus` - Get all GPUs
- `GET /api/parts/storages` - Get all storage devices
- `GET /api/parts/psus` - Get all power supplies
- `GET /api/parts/cases` - Get all cases

### Build Management
- `GET /api/builds` - Get all builds
- `GET /api/builds/{id}` - Get build by ID
- `GET /api/builds/share/{shareCode}` - Get build by share code
- `POST /api/builds` - Create new build
- `POST /api/builds/{id}/check-compatibility` - Check build compatibility
- `DELETE /api/builds/{id}` - Delete build

## Usage

### Creating a Build

1. Navigate to the Builder page (home page)
2. Select a category from the left sidebar
3. Choose a part from the displayed list
4. Repeat for all desired categories
5. View total price and wattage in the summary panel
6. Click "Save Build" to save and get a share code

### Sharing a Build

After saving a build, you'll receive a unique share code. Share the build using:
```
http://localhost:5173/share/{shareCode}
```

### Adding Parts (Admin)

1. Navigate to the Admin page (`/admin`)
2. Select the part type tab (CPU or Motherboard)
3. Fill in the part details
4. Click "Add" to save to the database

## Development

### Adding New Part Types

1. **Domain Layer**: Create entity in `PCPartPicker.Domain/Entities/`
2. **Infrastructure**: Add DbSet to `ApplicationDbContext`
3. **API**: Add endpoints in `PartsController`
4. **Frontend**: Add TypeScript interface in `types/index.ts`
5. **Frontend**: Add query hook in API client
6. **Frontend**: Update UI components

### Database Migrations

After modifying entities:
```bash
cd backend
dotnet ef migrations add YourMigrationName --project PCPartPicker.Infrastructure --startup-project PCPartPicker.Api
dotnet ef database update --project PCPartPicker.Infrastructure --startup-project PCPartPicker.Api
```

## Future Enhancements

- [ ] User authentication and accounts
- [ ] Build comparison feature
- [ ] Price tracking and alerts
- [ ] User reviews and ratings
- [ ] Advanced filtering (by price range, manufacturer, etc.)
- [ ] Bottleneck analysis
- [ ] Performance benchmarks
- [ ] Multi-language support
- [ ] Dark mode

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.
