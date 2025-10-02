# Notification System Setup Guide

## Overview
The notification system has been configured with the required dependencies and basic infrastructure for real-time notifications via WebSockets and email notifications.

## Dependencies Installed
- **socket.io**: ^4.8.1 - WebSocket server for real-time notifications
- **nodemailer**: ^7.0.6 - Email sending via SMTP/Gmail
- **@sendgrid/mail**: ^8.1.5 - SendGrid email service client

## Configuration Files
- `config/notification.js` - Main notification configuration with environment variable handling
- `config/notification.env.example` - Environment variables template for notification system

## Environment Variables Required

### WebSocket Configuration
```env
WEBSOCKET_PORT=5001
WEBSOCKET_CORS_ORIGINS=http://localhost:5173,http://localhost:3000
WEBSOCKET_PING_TIMEOUT=60000
WEBSOCKET_PING_INTERVAL=25000
```

### Email Service Configuration
Choose one email service and configure accordingly:

#### NodeMailer (Gmail/SMTP)
```env
EMAIL_SERVICE=nodemailer
NODEMAILER_HOST=smtp.gmail.com
NODEMAILER_PORT=587
NODEMAILER_SECURE=false
NODEMAILER_USER=your-email@gmail.com
NODEMAILER_PASS=your-app-password
NODEMAILER_FROM_NAME=Product Ecosystem
NODEMAILER_FROM_EMAIL=your-email@gmail.com
```

#### SendGrid
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Product Ecosystem
```

#### AWS SES
```env
EMAIL_SERVICE=aws-ses
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=your-ses-access-key-id
AWS_SES_SECRET_ACCESS_KEY=your-ses-secret-access-key
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
AWS_SES_FROM_NAME=Product Ecosystem
```

### Notification Settings
```env
NOTIFICATIONS_ENABLED=true
EMAIL_NOTIFICATIONS_ENABLED=true
WEBSOCKET_NOTIFICATIONS_ENABLED=true
LOW_STOCK_NOTIFICATIONS_ENABLED=true
NEW_ORDER_NOTIFICATIONS_ENABLED=true
CUBIC_VOLUME_NOTIFICATIONS_ENABLED=true
CUBIC_VOLUME_THRESHOLD_KG=32
```

## Server Integration
The Express server has been updated to include:
- HTTP server creation for Socket.IO integration
- Socket.IO server initialization with CORS configuration
- Basic WebSocket connection handling
- Configuration validation on startup
- Global io instance available via `app.get('io')`

## WebSocket Connection Flow
1. Client connects to WebSocket server
2. Client emits 'join-room' event with user data (userId, role)
3. Server adds client to user-specific and role-specific rooms
4. Server can broadcast notifications to specific users or roles

## Next Steps
1. Create notification database models
2. Implement notification service layer
3. Create email service implementations
4. Add notification triggers to existing controllers
5. Build frontend WebSocket client integration

## Testing
The server configuration has been validated and can start without errors. The notification system is ready for further implementation.
