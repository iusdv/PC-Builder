FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY PCPartPicker.Api/PCPartPicker.Api.csproj PCPartPicker.Api/
COPY PCPartPicker.Application/PCPartPicker.Application.csproj PCPartPicker.Application/
COPY PCPartPicker.Infrastructure/PCPartPicker.Infrastructure.csproj PCPartPicker.Infrastructure/
COPY PCPartPicker.Domain/PCPartPicker.Domain.csproj PCPartPicker.Domain/

RUN dotnet restore PCPartPicker.Api/PCPartPicker.Api.csproj

COPY . .
RUN dotnet publish PCPartPicker.Api/PCPartPicker.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://0.0.0.0:8080

EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "PCPartPicker.Api.dll"]
