# MongoDB + Node.js APIs - Complete Guide

## Your Node.js APIs (Already Created!)

All APIs are located in `/server/routes/` and use MongoDB with Mongoose.

### Available API Endpoints:

#### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password

#### Users (`/api/users`)
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Projects (`/api/projects`)
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Tasks (`/api/tasks`)
- `GET /api/tasks/project/:projectId` - Get tasks for a project
- `POST /api/tasks` - Create new task (admin only)
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/status` - Update task status
- `PUT /api/tasks/:id/assign` - Assign task to user
- `POST /api/tasks/:id/comments` - Add comment to task

#### Messages (`/api/messages`)
- `GET /api/messages/project/:projectId` - Get messages for a project
- `POST /api/messages` - Send new message
- `PUT /api/messages/:id/read` - Mark message as read
- `DELETE /api/messages/:id` - Delete message

#### Training Programs (`/api/training-programs`)
- `GET /api/training-programs` - Get all training programs
- `POST /api/training-programs` - Create training program
- `GET /api/training-programs/:id` - Get program by ID
- `PUT /api/training-programs/:id` - Update program
- `DELETE /api/training-programs/:id` - Delete program

#### Categories (`/api/categories`)
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

#### Contact (`/api/contact`)
- `POST /api/contact` - Send contact message

#### Reclamation (`/api/reclamation`)
- `POST /api/reclamation` - Submit reclamation
- `GET /api/reclamation` - Get all reclamations (admin)

#### Analytics (`/api/analytics`)
- `GET /api/analytics/dashboard` - Get dashboard analytics

#### Quotes (`/api/quotes`)
- `GET /api/quotes` - Get all quotes
- `POST /api/quotes` - Create quote
- `PUT /api/quotes/:id` - Update quote

#### Files (`/api/files`)
- `POST /api/files/upload` - Upload file
- `GET /api/files/:filename` - Download file

## MongoDB Connection Setup

### Option 1: MongoDB Atlas (Cloud - Recommended)

1. **Create MongoDB Atlas Account:**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free
   - Create a new cluster (Free tier M0)

2. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

3. **Update .env file:**
   ```
   MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/delivery_digital?retryWrites=true&w=majority
   ```

### Option 2: Local MongoDB

If you want to run MongoDB locally:

```bash
# Ubuntu/Debian
sudo apt-get install -y mongodb

# macOS
brew install mongodb-community

# Start MongoDB
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

Then use:
```
MONGO_URI=mongodb://localhost:27017/delivery_digital
```

## Starting Your Server

```bash
# Install dependencies (if not already done)
npm install

# Start the server
npm run server

# Or with auto-restart on changes
npm run server:dev
```

Server will run on: `http://localhost:3008`

## Testing APIs

### Example: Login
```bash
curl -X POST http://localhost:3008/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@deliverydigital.fr","password":"admin123"}'
```

### Example: Get Projects (with auth)
```bash
curl -X GET http://localhost:3008/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Current .env Configuration

Your `.env` file needs:
```
MONGO_URI=<your-mongodb-connection-string>
PORT=3008
NODE_ENV=development
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
VITE_API_URL=https://8337d3e26ec0.ngrok.app
```

## Next Steps

1. Sign up for MongoDB Atlas or install MongoDB locally
2. Update `MONGO_URI` in `.env` with your connection string
3. Start the server: `npm run server`
4. The server will auto-create demo users and data
5. Test with the frontend app

## Demo Users (Auto-created on first run)

- **Admin**: admin@deliverydigital.fr / admin123
- **Client**: client@example.com / client123
- **Trainer**: trainer@example.com / trainer123
