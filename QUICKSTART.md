# Quick Start Guide

This guide will help you get the PC Part Picker application running on your local machine.

## Prerequisites

Make sure you have the following installed:
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org/) and npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for MySQL)
- Git

## Step 1: Clone the Repository

```bash
git clone https://github.com/iusdv/PC-Part-Picker.git
cd PC-Part-Picker
```

## Step 2: Start the Database

Using Docker (recommended):

```bash
docker-compose up -d
```

This will start a MySQL 8.0 container on port 3306.

**Verify MySQL is running:**
```bash
docker ps
```

You should see a container named `pcpartpicker_mysql` running.

## Step 3: Setup the Backend

Navigate to the backend folder:

```bash
cd backend
```

Install EF Core tools (if not already installed):

```bash
dotnet tool install --global dotnet-ef
```

Create and apply database migrations:

```bash
dotnet ef migrations add InitialCreate --project PCPartPicker.Infrastructure --startup-project PCPartPicker.Api
dotnet ef database update --project PCPartPicker.Infrastructure --startup-project PCPartPicker.Api
```

Run the API:

```bash
cd PCPartPicker.Api
dotnet run
```

The API will start at:
- HTTPS: `https://localhost:5001`
- HTTP: `http://localhost:5000`
- Swagger UI: `https://localhost:5001/swagger`

**Note:** The database will be automatically seeded with sample parts (CPUs, Motherboards, RAM, GPUs, Storage, PSUs, and Cases) on first run.

**Keep this terminal open** - the API needs to keep running.

## Step 4: Setup the Frontend

Open a **new terminal** and navigate to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will start at `http://localhost:5173`

**Keep this terminal open** - the dev server needs to keep running.

## Step 5: Use the Application

1. Open your browser and go to `http://localhost:5173`
2. You'll see the Builder page with a category sidebar
3. **Sample data is already loaded!** The database was seeded with:
   - 4 CPUs (AMD Ryzen 9 7950X, Intel Core i9-14900K, etc.)
   - 4 Motherboards (ASUS ROG Strix, MSI MPG Z790, etc.)
   - 2 RAM kits
   - 2 GPUs (NVIDIA RTX 4090, AMD RX 7900 XTX)
   - 2 Storage devices
   - 2 PSUs
   - 2 Cases
4. Click on a category (e.g., CPU) to see available parts
5. Click on a part to select it for your build
6. View the total price and wattage in the summary panel
7. Click **Save Build** to save your configuration and get a share code
8. Share your build using the URL: `http://localhost:5173/share/{shareCode}`

**Optional:** Navigate to the **Admin** page to add more parts.

## Testing the Scraper (Optional)

The scraper is a separate tool for personal data collection:

```bash
cd scraper/PCPartScraper
dotnet run
```

Output files will be in `scraper/PCPartScraper/output/`

## Troubleshooting

### MySQL Connection Issues

If you get database connection errors:

1. Make sure MySQL container is running: `docker ps`
2. Check the connection string in `backend/PCPartPicker.Api/appsettings.json`
3. Verify port 3306 is not being used by another application

### Frontend Can't Connect to Backend

1. Make sure the backend API is running on `http://localhost:5000`
2. Check CORS settings in `backend/PCPartPicker.Api/Program.cs`
3. Verify the API URL in `frontend/.env` is correct

### Port Already in Use

If you get port conflicts:

**Backend (5000/5001):**
Edit `backend/PCPartPicker.Api/Properties/launchSettings.json` to use different ports

**Frontend (5173):**
Edit `frontend/vite.config.ts` to specify a different port:
```typescript
export default defineConfig({
  server: { port: 3000 }
})
```

**MySQL (3306):**
Edit `docker-compose.yml` to map to a different port:
```yaml
ports:
  - "3307:3306"  # Host:Container
```

## Next Steps

- Add more part types (RAM, GPU, Storage, PSU, Case)
- Implement user authentication
- Add build comparison features
- Integrate with real PC part data sources

## Stopping the Application

1. Press `Ctrl+C` in both terminal windows (frontend and backend)
2. Stop the MySQL container:
   ```bash
   docker-compose down
   ```

## Additional Resources

- [ASP.NET Core Documentation](https://docs.microsoft.com/aspnet/core)
- [React Documentation](https://react.dev)
- [Entity Framework Core](https://docs.microsoft.com/ef/core)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com)
