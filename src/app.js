const express = require('express');
const path = require('path');

const app = express();

// Static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// API routes are mounted in server.js
// This file just sets up basic Express config

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Serve frontend pages
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/signup.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dashboard.html'));
});

app.get('/manual-fund', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/manual-fund.html'));
});

app.get('/transactions', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/transactions.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/admin-login.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/admin-dashboard.html'));
});

module.exports = app;
