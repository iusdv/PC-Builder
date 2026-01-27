# PC-Part-Picker

PC Builder Configurator is a full-stack web app that lets users create and validate custom PC builds. It performs real-time compatibility checks, estimates power usage and total cost, and allows builds to be saved, shared, and exported. Built with ASP.NET Core, MySQL, and React + TypeScript.

## Tech Stack

### Backend
- **ASP.NET Core Web API** (.NET 10)
- **MySQL** with Entity Framework Core
- **JWT Authentication**
- **Clean Architecture** (Domain, Application, Infrastructure, API layers)
- **Swagger/OpenAPI** for API documentation

### Frontend
- **React** 18
- **TypeScript**
- **Vite** for fast development and optimized builds
- **React Router** for navigation
- **Axios** for HTTP requests

## Features

- **User Authentication**: Register and login with JWT-based authentication
- **PC Part Management**: Browse and filter PC parts by category (CPU, Motherboard, RAM, GPU, Storage, PSU, Case)
- **Build Creation**: Create custom PC builds by selecting compatible parts
- **Real-time Compatibility Checking**: Automatic warnings for incompatible components (socket mismatches, insufficient PSU wattage, etc.)
- **Price & Wattage Calculation**: Automatic calculation of total build cost and power consumption
- **Share Builds**: Generate shareable links for your builds
- **Export Builds**: Export build configurations to text files
- **Admin Panel**: Manage PC parts (add, edit, delete) with admin privileges

## Getting Started

### Prerequisites

- .NET 10 SDK
- Node.js (v18 or higher)
- MySQL Server (8.0 or higher)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Update the connection string in `PCPartPicker.API/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=pcpartpicker;User=root;Password=your_password;"
  }
}
```

3. Create the database and run migrations:
```bash
cd PCPartPicker.API
dotnet ef database update
```

4. Run the backend:
```bash
dotnet run
```

The API will be available at `http://localhost:5000` (or `https://localhost:5001` for HTTPS).
Swagger documentation will be available at `http://localhost:5000/swagger`.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Update the API URL in `src/services/api.ts` if needed (default is `http://localhost:5000/api`).

4. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### First Time Setup

1. Create an admin user by registering through the UI, then manually update the `IsAdmin` field in the database:
```sql
UPDATE Users SET IsAdmin = 1 WHERE Username = 'your_username';
```

2. Use the Admin Panel to add PC parts to the database.

3. Create builds and test the compatibility checking features.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT token

### Parts
- `GET /api/parts` - Get all parts
- `GET /api/parts/category/{category}` - Get parts by category
- `GET /api/parts/{id}` - Get part by ID
- `POST /api/parts` - Create new part (Admin only)
- `PUT /api/parts/{id}` - Update part (Admin only)
- `DELETE /api/parts/{id}` - Delete part (Admin only)

### Builds
- `GET /api/builds` - Get user's builds
- `GET /api/builds/{id}` - Get build by ID
- `GET /api/builds/shared/{shareToken}` - Get shared build
- `POST /api/builds` - Create new build
- `POST /api/builds/{id}/parts` - Add part to build
- `DELETE /api/builds/{id}/parts/{partId}` - Remove part from build
- `DELETE /api/builds/{id}` - Delete build
- `GET /api/builds/{id}/compatibility` - Check build compatibility

## Architecture

The backend follows Clean Architecture principles:

- **Domain**: Core entities and business logic
- **Application**: DTOs and service interfaces
- **Infrastructure**: EF Core DbContext and service implementations
- **API**: Controllers and configuration

## Database Schema

- **Users**: User accounts and authentication
- **PCParts**: PC components with specifications
- **Builds**: User-created PC builds
- **BuildParts**: Many-to-many relationship between builds and parts

## License

MIT

