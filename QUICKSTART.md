# Quick Start Guide - PC Part Picker

## Prerequisites
- Docker and Docker Compose installed
- OR .NET 10 SDK + Node.js 18+ + MySQL 8+

## Docker Setup (5 Minutes)

### 1. Clone and Start
```bash
git clone <repository-url>
cd PC-Part-Picker
docker-compose up -d
```

### 2. Apply Database Migrations
```bash
docker exec pcpartpicker-backend dotnet ef database update
```

### 3. (Optional) Load Sample Data
```bash
docker exec -i pcpartpicker-mysql mysql -uroot -pReplaceWithSecurePassword123! pcpartpicker < backend/seed-data.sql
```

### 4. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Swagger: http://localhost:5000/swagger

### 5. Create Admin User
1. Register a new account at http://localhost:5173/register
2. Make the user admin:
```bash
docker exec -i pcpartpicker-mysql mysql -uroot -pReplaceWithSecurePassword123! pcpartpicker -e "UPDATE Users SET IsAdmin = 1 WHERE Username = 'your_username';"
```
3. Log out and log back in

### 6. Start Building!
- Go to Admin Panel to add PC parts (if you didn't load sample data)
- Create a new build
- Add parts from different categories
- Watch for compatibility warnings
- Share your build!

## Manual Setup

### Backend
```bash
cd backend/PCPartPicker.API
dotnet restore
dotnet ef database update
dotnet run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Default Credentials
- No default users - create via registration
- MySQL: root / ReplaceWithSecurePassword123! (change this!)

## Troubleshooting

### Port Already in Use
```bash
# Change ports in docker-compose.yml or stop conflicting services
docker-compose down
sudo lsof -i :5000  # Check what's using port 5000
sudo lsof -i :5173  # Check what's using port 5173
sudo lsof -i :3306  # Check what's using port 3306
```

### Database Connection Failed
```bash
# Wait for MySQL to be ready
docker-compose logs mysql
# Should see "ready for connections"
```

### Frontend Can't Connect to Backend
- Check backend is running: http://localhost:5000/swagger
- Check CORS settings in backend/PCPartPicker.API/Program.cs
- Check API URL in frontend/src/services/api.ts

### Migration Errors
```bash
# Remove existing migrations and recreate
cd backend/PCPartPicker.Infrastructure
rm -rf Migrations/
cd ../PCPartPicker.API
dotnet ef migrations add InitialCreate --project ../PCPartPicker.Infrastructure/PCPartPicker.Infrastructure.csproj
dotnet ef database update
```

## Next Steps
1. Explore the Admin Panel to manage parts
2. Create your first PC build
3. Test compatibility warnings by mixing incompatible parts
4. Share a build and access it via the share link
5. Export a build to a text file

## Support
- Check IMPLEMENTATION_SUMMARY.md for detailed documentation
- Check README.md for complete setup instructions
- Review API endpoints at http://localhost:5000/swagger

Enjoy building PCs! 🖥️✨
