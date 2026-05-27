const express = require('express');
const os = require('os');

const router = express.Router();

router.get('/status', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  res.json({
    status: 'OK',
    uptimeSeconds: Number(process.uptime().toFixed(2)),
    memoryUsage,
    cpuUsage,
    platform: process.platform,
    nodeVersion: process.version,
    systemLoadAverage: os.loadavg()
  });
});

module.exports = router;
