const mongoose = require("mongoose");

exports.health = (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: databaseConnected ? "CRM API is healthy" : "Database is not connected",
    data: {
      service: "crm-sales-management",
      database: databaseConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString()
    }
  });
};
