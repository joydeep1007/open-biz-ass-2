# Udyam Registration Backend API

A production-ready Node.js backend built with TypeScript, Express, and Prisma for validating and storing Udyam Registration form submissions.

## 🚀 Features

- **TypeScript** for type safety and better developer experience
- **Express.js** web framework with CORS support
- **Prisma ORM** for PostgreSQL database operations
- **Zod** for request validation
- **Dynamic schema validation** based on scraped form structure
- **Comprehensive error handling** with meaningful HTTP status codes
- **Request logging** with Morgan
- **Graceful shutdown** handling
- **Health check** endpoint

## 📁 Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── routes/
│   │   └── form.ts           # API routes (/schema, /validate, /submit)
│   ├── app.ts                # Express app setup, CORS, middleware
│   ├── config.ts             # Environment configuration
│   ├── db.ts                 # Prisma client and database utilities
│   ├── index.ts              # Server bootstrap
│   ├── schemaLoader.ts       # Load and parse scraped schema JSON
│   └── validators.ts         # Form validation logic
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## 🛠️ Setup Instructions

### Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** database
- **npm** or **yarn**

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your_supabase_anon_key_here"

# Schema file path (relative to backend directory)
SCHEMA_PATH="../scraped/real_credentials_schema.json"

# Server configuration
PORT=8000
NODE_ENV=development
```

**Get your Supabase credentials:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings > API
4. Copy the Project URL and anon/public key

### 3. Database Setup

**Option A: Automatic Setup (Recommended)**
The application will automatically create the required tables when you start the server.

**Option B: Manual Setup**
If automatic setup doesn't work, run the SQL commands in your Supabase SQL Editor:

```bash
# Copy the SQL commands from supabase-setup.sql
cat supabase-setup.sql
```

Then paste and run them in your Supabase project's SQL Editor.

**Legacy Prisma Support (Optional)**
If you need Prisma for migrations:
```bash
npm run db:generate
npm run db:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:8000` with hot reloading enabled.

## 📡 API Endpoints

### Health Check
```http
GET /
```
Returns server status and basic information.

### Get Schema
```http
GET /schema
```
Returns the loaded Udyam registration form schema.

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://udyamregistration.gov.in/UdyamRegistration.aspx",
    "scraped_at": "2025-08-12 22:25:16",
    "steps": [...]
  },
  "meta": {
    "totalSteps": 2,
    "totalFields": 31,
    "scrapedAt": "2025-08-12 22:25:16"
  }
}
```

### Validate Form Data
```http
POST /validate
Content-Type: application/json

{
  "txtadharno": "123456789012",
  "txtownername": "John Doe",
  "ddlTypeofOrg": "1",
  "txtPan": "ABCDE1234F"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Validation passed",
  "validatedFields": 4
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": {
    "txtPan": "PAN must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)",
    "txtownername": "Name of Entrepreneur is required"
  }
}
```

### Submit Form Data
```http
POST /submit
Content-Type: application/json

{
  "txtadharno": "123456789012",
  "txtownername": "John Doe",
  "ddlTypeofOrg": "1",
  "txtPan": "ABCDE1234F",
  "txtPanName": "John Doe",
  "txtdob": "01/01/1990"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "id": 123,
  "message": "Submission stored successfully",
  "submittedAt": "2025-08-12T22:30:00.000Z"
}
```

### Get Submissions (Admin)
```http
GET /submissions?page=1&limit=10
```

Returns paginated list of all submissions.

### Get Specific Submission
```http
GET /submissions/123
```

Returns a specific submission by ID.

## 🧪 Testing the API

### Using curl

**Test validation:**
```bash
curl -X POST http://localhost:8000/validate \
  -H "Content-Type: application/json" \
  -d '{
    "txtadharno": "123456789012",
    "txtownername": "John Doe",
    "ddlTypeofOrg": "1"
  }'
```

**Test submission:**
```bash
curl -X POST http://localhost:8000/submit \
  -H "Content-Type: application/json" \
  -d '{
    "txtadharno": "123456789012",
    "txtownername": "John Doe",
    "ddlTypeofOrg": "1",
    "txtPan": "ABCDE1234F",
    "txtPanName": "John Doe",
    "txtdob": "01/01/1990"
  }'
```

**Get schema:**
```bash
curl http://localhost:8000/schema
```

### Using Postman

Import the following collection or create requests manually:

1. **GET** `http://localhost:8000/` - Health check
2. **GET** `http://localhost:8000/schema` - Get form schema
3. **POST** `http://localhost:8000/validate` - Validate form data
4. **POST** `http://localhost:8000/submit` - Submit form data

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build            # Build TypeScript to JavaScript
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Create and apply database migrations
npm run db:studio        # Open Prisma Studio (database GUI)

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm test                 # Run tests (when implemented)
```

## 🗄️ Database Schema

The application uses a single table to store form submissions:

```sql
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

The `data` column stores the entire form submission as JSON, allowing for flexible storage of dynamic form fields.

## 🔍 Validation Rules

The API validates form data based on the loaded schema:

- **Required fields**: Must be present and non-empty
- **Pattern validation**: Uses regex patterns from schema
- **Type validation**: Ensures correct data types (string, number, boolean)
- **Length constraints**: Enforces maxlength/minlength rules
- **Select options**: Validates against available dropdown options
- **Custom validation**: Special rules for PAN, Aadhaar, email, phone numbers

## 🚨 Error Handling

The API provides comprehensive error handling:

- **400 Bad Request**: Validation errors, malformed JSON
- **404 Not Found**: Invalid endpoints, missing resources
- **500 Internal Server Error**: Database errors, server issues
- **503 Service Unavailable**: Database connection issues

All errors include descriptive messages and relevant details.

## 🔒 Security Features

- **CORS protection** with specific origin allowlist
- **Request size limits** to prevent abuse
- **Input sanitization** before database storage
- **SQL injection protection** via Prisma ORM
- **Error message sanitization** in production

## 📊 Monitoring & Logging

- **Request logging** with Morgan
- **Database query logging** in development
- **Error tracking** with stack traces
- **Performance monitoring** with request duration
- **Health check endpoint** for uptime monitoring

## 🚀 Production Deployment

### Environment Variables

Set these environment variables in production:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
SCHEMA_PATH=../scraped/real_credentials_schema.json
PORT=8000
```

### Build and Start

```bash
npm run build
npm start
```

### Docker (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 8000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Database connection failed:**
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Verify database exists and credentials are correct

**Schema file not found:**
- Check SCHEMA_PATH in .env
- Ensure the scraped schema file exists
- Verify file permissions

**Port already in use:**
- Change PORT in .env
- Kill existing process: `lsof -ti:8000 | xargs kill`

**CORS errors:**
- Check allowed origins in app.ts
- Ensure frontend URL is in the allowlist

### Debug Mode

Enable detailed logging:
```env
NODE_ENV=development
LOG_LEVEL=debug
```

This will show database queries, request details, and additional debug information.