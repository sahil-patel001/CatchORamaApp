#!/usr/bin/env node

/**
 * Script to clear rate limiting cache
 * Run this if you're locked out due to rate limiting during development
 */

const path = require("path");
const fs = require("fs");

console.log("🔧 Clearing rate limiting cache...");

// In a real production environment, you might need to clear Redis cache
// For the current implementation using in-memory rate limiting,
// simply restarting the server will clear the limits

console.log("💡 To clear rate limits:");
console.log("   1. Stop the server (Ctrl+C)");
console.log("   2. Restart with: npm run dev or npm start");
console.log("");
console.log("📝 Rate limits have been adjusted for development:");
console.log("   - Auth endpoints: 50 attempts per 15 minutes (was 5)");
console.log("   - General endpoints: 100 requests per 15 minutes");
console.log("   - Dashboard endpoints: 200 requests per 5 minutes");
console.log("");
console.log("🚀 Server restart required for changes to take effect.");

// Create a temporary flag file to indicate rate limits should be reset
const flagFile = path.join(__dirname, "..", ".rate-limit-reset");
fs.writeFileSync(flagFile, new Date().toISOString());

console.log("✅ Rate limit reset flag created. Restart the server now.");
