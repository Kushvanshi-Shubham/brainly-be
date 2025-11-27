# Brainly Backend API 🧠

A robust Node.js/Express backend for the Brainly content management platform. Built with TypeScript, MongoDB, and modern security practices.

## 🚀 Features

- **Authentication** - JWT-based secure authentication
- **Content Management** - Save, organize, and retrieve articles, videos, and links
- **Tagging System** - Flexible tag-based organization
- **Sharing** - Generate shareable links for your content collections
- **Security** - Rate limiting, helmet.js, input sanitization
- **Validation** - Zod schema validation for all inputs
- **TypeScript** - Fully typed for better developer experience
- **🆕 Discovery Analytics** - Advanced content analytics, insights, and rediscovery features

## 📋 Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kushvanshi-Shubham/brainly-be.git
   cd brainly-be
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   MONGO_URL=mongodb://localhost:27017/brainly
   JWT_SECRET=your-super-secret-jwt-key
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

#### Sign Up
```http
POST /api/v1/signup
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login
```http
POST /api/v1/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Content Endpoints

All content endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-token>
```

#### Create Content
```http
POST /api/v1/content
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Amazing Article",
  "link": "https://example.com/article",
  "type": "article",
  "tags": ["programming", "tutorial"]
}
```

#### Get All Content (with pagination)
```http
GET /api/v1/content?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "content": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Delete Content
```http
DELETE /api/v1/content/:id
Authorization: Bearer <token>
```

### Sharing Endpoints

#### Generate Share Link
```http
POST /api/v1/brain/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "share": true
}
```

**Response:**
```json
{
  "hash": "abc123def456"
}
```

#### Access Shared Content
```http
GET /api/v1/brain/:shareLink
```

**Response:**
```json
{
  "username": "user@example.com",
  "content": [...]
}
```

## 🏗️ Project Structure

```
brainly-be/
├── src/
│   ├── config.ts           # Environment configuration
│   ├── db.ts              # Database models & connection
│   ├── index.ts           # Express app setup
│   ├── middleware.ts      # Authentication middleware
│   ├── errorHandler.ts    # Global error handling
│   ├── utlis.ts          # Utility functions
│   ├── override.d.ts     # TypeScript type extensions
│   └── routes/
│       ├── authRoutes.ts      # Authentication routes
│       ├── contentRoutes.ts   # Content management routes
│       ├── shareRoutes.ts     # Sharing functionality
│       └── profileRoutes.ts   # User profile routes
├── dist/                  # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── .env
```

## 🔒 Security Features

- **Rate Limiting** - Prevents brute force attacks (100 requests/15 min general, 5 requests/15 min for auth)
- **Helmet.js** - Sets security HTTP headers
- **MongoDB Sanitization** - Prevents NoSQL injection attacks
- **JWT Authentication** - Secure token-based auth with 1-day expiration
- **Password Hashing** - bcrypt with 10 salt rounds
- **Input Validation** - Zod schema validation on all inputs
- **CORS** - Configured for specific origins only

## 📊 Database Schema

### User
```typescript
{
  username: string (email, unique, required)
  password: string (hashed, required)
  timestamps: { createdAt, updatedAt }
}
```

### Content
```typescript
{
  title: string (required)
  link: string (URL, required)
  type: 'article' | 'video' | 'resource' | 'other' | 'youtube' | 'twitter'
  tags: ObjectId[] (ref: Tag)
  userId: ObjectId (ref: User, indexed)
}
```

### Tag
```typescript
{
  name: string (unique, lowercase, required)
}
```

### Link (Share Links)
```typescript
{
  hash: string (unique, indexed, required)
  userId: ObjectId (ref: User, unique)
}
```

## 🧪 Testing

```bash
# Run tests (coming soon)
npm test

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Using Render/Railway/Heroku

1. Set environment variables in your hosting platform
2. Set `NODE_ENV=production`
3. Deploy from GitHub repository

### Using Docker (optional)

```dockerfile
# Coming soon
```

## 🛣️ Roadmap

- [ ] Add unit and integration tests
- [ ] Implement WebSocket for real-time updates
- [ ] Add email notifications
- [ ] Implement content search with Elasticsearch
- [ ] Add content export (PDF, JSON)
- [ ] Implement AI-powered content summarization
- [ ] Add analytics dashboard
- [ ] Implement subscription/payment system

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

ISC License

## 👤 Author

**Kushvanshi Shubham**
- GitHub: [@Kushvanshi-Shubham](https://github.com/Kushvanshi-Shubham)

## 🐛 Known Issues

- None currently reported

## 📞 Support

For support, email your-email@example.com or create an issue in the GitHub repository.

---

Made with ❤️ by Kushvanshi Shubham
