# WeatherStation Pro

A polished, responsive weather dashboard built with Node.js, Express, Open-Meteo and optional MongoDB Atlas history.

## Features
- Search weather by city using Open-Meteo geocoding and forecast APIs
- Current temperature, feels-like temperature, humidity, wind direction/speed, pressure, visibility, UV index and precipitation
- Interactive 24-hour temperature chart
- Seven-day forecast with daily high/low and rain probability
- Sunrise, sunset and daylight duration
- Weather briefing and practical daily tip
- Dark/light appearance toggle
- Recent search history stored in browser and optionally MongoDB
- Health endpoint for deployment checks
- Responsive desktop and mobile layout
- Render deployment blueprint

## Run locally
1. Install Node.js 18 or newer.
2. Extract this folder and open a terminal inside it.
3. Run `npm install`
4. Optional MongoDB: copy `.env.example` to `.env`, then set your MongoDB Atlas connection string.
5. Run `npm start`
6. Open `http://localhost:3000`

The dashboard works without MongoDB. Without `MONGODB_URI`, recent searches are stored in the browser only.

## Deploy to Render
1. Push this project to a GitHub repository.
2. In Render, create a new Web Service from that repository.
3. Set build command to `npm install` and start command to `npm start`, or use the included `render.yaml`.
4. Add `MONGODB_URI` as a secret environment variable if you want cloud search history.
5. Set `MONGODB_DB=weatherDB` and `MONGODB_COLLECTION=weatherRecords` if you want to retain those database names.
6. In MongoDB Atlas, allow network access for your Render service and create a database user with least-privilege access.

## Notes
- Weather information is provided by Open-Meteo; an internet connection is required.
- Do not commit `.env` or database credentials to GitHub.
- The app does not require an API key for the Open-Meteo endpoints used here.
