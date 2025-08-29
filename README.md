# DiNutri - Nutrition Management Platform

## 🎯 Overview
DiNutri is a comprehensive nutrition management platform that connects nutritionists and patients. The platform allows nutritionists to create personalized meal plans and prescriptions, while patients can access their customized nutrition plans.

## 🏗️ Architecture
- **Frontend**: React.js with CRACO configuration and Tailwind CSS
- **Backend**: Express.js with MongoDB and JWT authentication
- **Database**: MongoDB (cloud-hosted)
- **Deployment**: Vercel (serverless functions)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB connection (or cloud MongoDB Atlas)
- Yarn (for frontend)

### Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd difitNutri
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB connection string
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend
yarn install
yarn start
```

### Environment Variables

#### Backend (.env)
```env
MONGO_URL="your-mongodb-connection-string"
DB_NAME="difitNutri"
JWT_SECRET="your-jwt-secret"
CORS_ORIGINS="*"
PORT=8000
NODE_ENV=development
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login (returns JWT token)

### User Management
- `GET /api/me` - Get current user profile

### Patients (Nutritionist only)
- `GET /api/patients` - List all patients
- `POST /api/patients` - Create new patient
- `GET /api/patients/:id` - Get specific patient
- `PUT /api/patients/:id` - Update patient
- `GET /api/patients/:id/latest` - Get latest prescription for patient

### Prescriptions
- `GET /api/prescriptions` - List prescriptions (with patientId query)
- `POST /api/prescriptions` - Create new prescription
- `GET /api/prescriptions/:id` - Get specific prescription
- `PUT /api/prescriptions/:id` - Update prescription
- `POST /api/prescriptions/:id/duplicate` - Duplicate prescription

### Invites (Nutritionist only)
- `GET /api/invites` - List all invites
- `POST /api/invites` - Create new invite
- `GET /api/invites/:token` - Get invite details (public)
- `POST /api/invites/:token/accept` - Accept invite (public)
- `POST /api/invites/:id/revoke` - Revoke invite

### Health Check
- `GET /api/health` - API health status

## 🔐 Authentication

The platform uses JWT (JSON Web Tokens) for authentication. Default credentials:
- **Email**: `pro@dinutri.app`
- **Password**: `password123`

## 👥 User Roles

### Nutritionist
- Create and manage patients
- Create and manage prescriptions
- Send invites to patients
- View all their patients' data

### Patient
- View their own patient profile
- Access their published prescriptions
- Cannot access other patients' data

## 🌐 VS Code Online Preview

The application is configured to work with VS Code Online environments:

### URLs
- **Frontend**: `https://[codespace]-3000.githubpreview.dev`
- **Backend**: `https://[codespace]-8000.githubpreview.dev`
- **Health Check**: `https://[codespace]-8000.githubpreview.dev/api/health`

### CORS Configuration
The backend automatically detects and allows:
- Localhost origins (for local development)
- `.githubpreview.dev` domains (for VS Code Online)
- `.github.dev` domains (for GitHub Codespaces)

## 🚀 Deployment

### Vercel Deployment
```bash
npm install -g vercel
vercel --prod
```

The `vercel.json` configuration handles:
- Serverless functions for the backend
- Static hosting for the frontend
- Environment variable management
- Route configuration

### Environment Variables (Production)
Set these in your Vercel dashboard:
- `MONGO_URL`: Your MongoDB connection string
- `JWT_SECRET`: Strong secret for JWT signing
- `DB_NAME`: Database name (default: "difitNutri")

## 🛠️ Development Commands

```bash
# Start both frontend and backend
npm run dev

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Build for production
npm run build

# Run tests
npm test
```

## 📁 Project Structure

```
difitNutri/
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── utils/          # Utility functions
│   │   └── index.js        # Main server file
│   ├── package.json
│   └── .env
├── frontend/               # React application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── craco.config.js
├── vercel.json            # Vercel deployment config
├── package.json           # Root package.json
└── README.md
```

## 🧪 Testing

Use the included test script to verify API functionality:

```bash
python3 backend_test.py
```

This will test all major API endpoints including:
- Authentication flow
- Patient management
- Prescription creation
- Invite system
- Security measures

## 🔧 Migration Notes

This project has been migrated from Python/FastAPI to Node.js/Express while maintaining:
- ✅ Exact same API contract
- ✅ Same database schema
- ✅ Compatible authentication system
- ✅ Identical frontend interface
- ✅ VS Code Online preview support

## 📞 Support

For issues or questions, please check the API health endpoint first:
`GET /api/health`

This will confirm if the backend is running and accessible.
