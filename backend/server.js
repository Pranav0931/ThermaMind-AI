const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Mock RL Agent Simulation state
let baseTemp = 22.4;
let baseHumidity = 48;
let baseCO2 = 410;
let baseOccupancy = 12;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial state
  socket.emit('sensor_data', {
    zone: 'Storage Zone A',
    temperature: baseTemp,
    humidity: baseHumidity,
    co2: baseCO2,
    occupancy: baseOccupancy,
    efficiency: 98,
    load: 14.2,
    timestamp: new Date().toISOString()
  });

  // Start simulation loop
  const interval = setInterval(() => {
    // Random walk for mock data
    baseTemp += (Math.random() - 0.5) * 0.2;
    baseHumidity += (Math.random() - 0.5) * 1;
    baseCO2 += (Math.random() - 0.5) * 5;
    
    // Simulate RL actions
    let efficiency = 98 - Math.abs(baseTemp - 22.0) * 2;
    if (efficiency > 100) efficiency = 100;
    
    const data = {
      zone: 'Storage Zone A',
      temperature: parseFloat(baseTemp.toFixed(1)),
      humidity: Math.round(baseHumidity),
      co2: Math.round(baseCO2),
      occupancy: baseOccupancy, // occasional change can be added
      efficiency: Math.round(efficiency),
      load: parseFloat((14.2 + (Math.random() - 0.5)).toFixed(1)),
      timestamp: new Date().toISOString()
    };

    socket.emit('sensor_data', data);
  }, 2000); // Emits every 2 seconds

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(interval);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
