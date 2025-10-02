# Environment Configuration Guide

This document provides comprehensive instructions for setting up environment variables for the Product Ecosystem backend application.

## Quick Setup

1. **Generate environment template:**
   ```bash
   npm run generate-env
   ```

2. **Set up environment file:**
   ```bash
   npm run setup-env
   ```

3. **Validate environment:**
   ```bash
   npm run validate-env
   ```

## Required Environment Variables

### Core Server Configuration

```bash
# Application environment (development, production, test)
NODE_ENV=development

# Server port number
PORT=5000

# API version prefix
API_VERSION=v1
```

### Database Configuration

```bash
# MongoDB connection URI for main database (REQUIRED)
MONGODB_URI=mongodb://localhost:27017/product-ecosystem

# MongoDB connection URI for test database (optional)
MONGODB_TEST_URI=mongodb://localhost:27017/product-ecosystem-test
```

### Authentication Configuration

```bash
# JWT secret key for token signing (REQUIRED - minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# JWT token expiration time
JWT_EXPIRES_IN=7d
```

### CORS Configuration

```bash
# Comma-separated list of allowed CORS origins
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Rate Limiting

```bash
# Rate limit window in milliseconds (15 minutes default)
RATE_LIMIT_WINDOW_MS=900000

# Maximum requests per rate limit window
RATE_LIMIT_MAX_REQUESTS=100
```

## Notification System Configuration

### WebSocket Configuration

```bash
# Enable WebSocket real-time notifications
WEBSOCKET_NOTIFICATIONS_ENABLED=true

# Comma-separated list of allowed WebSocket CORS origins
WEBSOCKET_CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# WebSocket ping timeout in milliseconds
WEBSOCKET_PING_TIMEOUT=60000

# WebSocket ping interval in milliseconds
WEBSOCKET_PING_INTERVAL=25000
```

### General Notification Settings

```bash
# Enable notification system
NOTIFICATIONS_ENABLED=true

# Enable email notifications
EMAIL_NOTIFICATIONS_ENABLED=true

# Email service provider (nodemailer, sendgrid, aws-ses)
EMAIL_SERVICE=nodemailer
```

## Email Service Configuration

### Option 1: NodeMailer (Gmail/SMTP)

```bash
EMAIL_SERVICE=nodemailer

# SMTP configuration
NODEMAILER_HOST=smtp.gmail.com
NODEMAILER_PORT=587
NODEMAILER_SECURE=false

# Authentication (REQUIRED if using NodeMailer)
NODEMAILER_USER=your-email@gmail.com
NODEMAILER_PASS=your-app-password

# From address configuration
NODEMAILER_FROM_NAME=Product Ecosystem
NODEMAILER_FROM_EMAIL=your-email@gmail.com
```

**Gmail Setup Instructions:**
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: Google Account → Security → App passwords
3. Use the App Password as `NODEMAILER_PASS`

### Option 2: SendGrid

```bash
EMAIL_SERVICE=sendgrid

# SendGrid API configuration (REQUIRED if using SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Product Ecosystem
```

**SendGrid Setup Instructions:**
1. Create a SendGrid account at https://sendgrid.com
2. Generate an API key with Mail Send permissions
3. Verify your sender identity/domain

### Option 3: AWS SES

```bash
EMAIL_SERVICE=aws-ses

# AWS SES configuration (REQUIRED if using AWS SES)
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=your-ses-access-key-id
AWS_SES_SECRET_ACCESS_KEY=your-ses-secret-access-key
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
AWS_SES_FROM_NAME=Product Ecosystem
```

**AWS SES Setup Instructions:**
1. Set up AWS SES in your AWS account
2. Verify your email address or domain
3. Create IAM user with SES permissions
4. Generate access keys for the IAM user

## Email Template Configuration

```bash
# Directory for email templates
EMAIL_TEMPLATE_DIR=./templates/emails

# Company branding
EMAIL_LOGO_URL=https://yourdomain.com/logo.png
EMAIL_COMPANY_NAME=Product Ecosystem
EMAIL_SUPPORT_EMAIL=support@yourdomain.com
EMAIL_COMPANY_ADDRESS=Your Company Address
```

## Notification Triggers Configuration

```bash
# Enable specific notification types
LOW_STOCK_NOTIFICATIONS_ENABLED=true
NEW_ORDER_NOTIFICATIONS_ENABLED=true
CUBIC_VOLUME_NOTIFICATIONS_ENABLED=true

# Cubic volume threshold in kg for alerts
CUBIC_VOLUME_THRESHOLD_KG=32
```

## Cleanup Configuration

```bash
# Number of days to retain notifications
NOTIFICATION_RETENTION_DAYS=90

# Interval in hours for notification cleanup
NOTIFICATION_CLEANUP_INTERVAL_HOURS=24
```

## Email Service Configuration

The notification system supports multiple email service providers. Choose one based on your needs:

### Option 1: NodeMailer (SMTP/Gmail) - Recommended for Development

```bash
# Email service type
EMAIL_SERVICE=nodemailer

# SMTP Configuration (Gmail example)
NODEMAILER_HOST=smtp.gmail.com
NODEMAILER_PORT=587
NODEMAILER_SECURE=false
NODEMAILER_USER=your-email@gmail.com
NODEMAILER_PASS=your-app-password
NODEMAILER_FROM_NAME=Product Ecosystem
NODEMAILER_FROM_EMAIL=your-email@gmail.com
```

**Gmail Setup Instructions:**
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: Google Account → Security → 2-Step Verification → App passwords
3. Use the generated App Password (not your regular password) in `NODEMAILER_PASS`

**Other SMTP Providers:**
- **Outlook/Hotmail:** `smtp.live.com:587`
- **Yahoo:** `smtp.mail.yahoo.com:587`
- **Custom SMTP:** Use your provider's SMTP settings

### Option 2: SendGrid - Recommended for Production

```bash
# Email service type
EMAIL_SERVICE=sendgrid

# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Product Ecosystem
```

**SendGrid Setup Instructions:**
1. Sign up for a SendGrid account
2. Verify your sender identity (single sender or domain)
3. Create an API key with "Mail Send" permissions
4. Use a verified email address in `SENDGRID_FROM_EMAIL`

### Option 3: AWS SES - Recommended for Enterprise

```bash
# Email service type
EMAIL_SERVICE=aws-ses

# AWS SES Configuration
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=your-ses-access-key-id
AWS_SES_SECRET_ACCESS_KEY=your-ses-secret-access-key
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
AWS_SES_FROM_NAME=Product Ecosystem
```

**AWS SES Setup Instructions:**
1. Create an AWS account and navigate to SES
2. Verify your domain or email address
3. Request production access (remove sandbox limitations)
4. Create IAM user with SES sending permissions
5. Generate access keys for the IAM user

**Required IAM Permissions:**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail",
                "ses:GetSendQuota",
                "ses:GetSendStatistics"
            ],
            "Resource": "*"
        }
    ]
}
```

### Email Template Configuration

```bash
# Template settings
EMAIL_TEMPLATE_DIR=./templates/emails
EMAIL_LOGO_URL=https://yourdomain.com/logo.png
EMAIL_COMPANY_NAME=Product Ecosystem
EMAIL_SUPPORT_EMAIL=support@yourdomain.com
EMAIL_COMPANY_ADDRESS=Your Company Address
```

### Email Template Testing

Test your email templates and configuration:

```bash
# Validate all email templates
npm run validate-email-templates

# Generate validation report
npm run email-template-report

# Test specific template rendering
npm run test-email-templates test low_stock

# Send test email (requires email service configuration)
npm run test-email-templates send new_order user@example.com

# List available templates
npm run test-email-templates list
```

### Notification Triggers Configuration

```bash
# Enable/disable notification types
LOW_STOCK_NOTIFICATIONS_ENABLED=true
NEW_ORDER_NOTIFICATIONS_ENABLED=true
CUBIC_VOLUME_NOTIFICATIONS_ENABLED=true

# Cubic volume threshold for admin alerts (in kg)
CUBIC_VOLUME_THRESHOLD_KG=32

# Notification cleanup settings
NOTIFICATION_RETENTION_DAYS=90
NOTIFICATION_CLEANUP_INTERVAL_HOURS=24
```

### Email Service Comparison

| Feature | NodeMailer | SendGrid | AWS SES |
|---------|------------|----------|---------|
| **Cost** | Free (with provider limits) | Free tier: 100 emails/day | Free tier: 62,000 emails/month |
| **Setup Complexity** | Simple | Medium | Complex |
| **Reliability** | Provider dependent | High | Very High |
| **Delivery Rate** | Provider dependent | >99% | >99% |
| **Analytics** | Basic | Advanced | Advanced |
| **Best For** | Development/Testing | Small to Medium Business | Enterprise/High Volume |

### Email Service Troubleshooting

**NodeMailer Issues:**
- Verify SMTP credentials and server settings
- Check if 2FA is enabled (use App Password for Gmail)
- Ensure "Less secure app access" is disabled (use App Password)
- Check firewall/network restrictions on SMTP ports

**SendGrid Issues:**
- Verify API key has correct permissions
- Check sender identity verification status
- Monitor SendGrid dashboard for bounce/spam reports
- Verify domain authentication if using custom domain

**AWS SES Issues:**
- Verify AWS credentials and region settings
- Check if account is still in sandbox mode
- Verify sender email/domain is verified in SES
- Check IAM permissions for SES operations
- Monitor SES dashboard for bounce/complaint rates

## Environment File Setup

1. **Copy the template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file with your actual values:**
   ```bash
   nano .env  # or use your preferred editor
   ```

3. **Validate your configuration:**
   ```bash
   npm run validate-env
   ```

## Security Best Practices

1. **Never commit .env files to version control**
2. **Use strong, unique JWT secrets (minimum 32 characters)**
3. **Use environment-specific database URIs**
4. **Rotate API keys and secrets regularly**
5. **Use App Passwords for Gmail (not your main password)**
6. **Restrict CORS origins to your actual frontend domains**

## Development vs Production

### Development Environment
```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/product-ecosystem-dev
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Production Environment
```bash
NODE_ENV=production
MONGODB_URI=mongodb://your-production-mongodb-uri
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Troubleshooting

### Common Issues

1. **Email not sending:**
   - Check your email service credentials
   - Verify API keys and permissions
   - Check spam folders for test emails

2. **WebSocket connection failed:**
   - Verify CORS origins include your frontend URL
   - Check firewall settings
   - Ensure port is not blocked

3. **Database connection failed:**
   - Verify MongoDB URI format
   - Check database server status
   - Verify network connectivity

### Validation Errors

Run `npm run validate-env` to see detailed error messages and fix them accordingly.

## Support

For additional help with environment setup:
1. Check the validation output: `npm run validate-env`
2. Review the application logs for specific error messages
3. Refer to the service provider documentation (SendGrid, AWS SES, etc.)

## Scripts Reference

### Environment Configuration
- `npm run setup-env` - Generate environment template and validation scripts
- `npm run validate-env` - Validate current environment configuration
- `npm run generate-env` - Generate .env.example file only

### Email Template Testing
- `npm run validate-email-templates` - Validate all email templates
- `npm run email-template-report` - Generate HTML validation report
- `npm run test-email-templates` - Run email template testing CLI (see help for options)

### Database Management
- `npm run migrate` - Run database migrations
- `npm run migrate:down` - Rollback database migrations
- `npm run migrate:status` - Check migration status

### Development
- `npm run dev` - Start development server with auto-reload
- `npm run test` - Run test suite
- `npm run seed` - Seed database with sample data
