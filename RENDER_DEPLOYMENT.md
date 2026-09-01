# Render Deployment Guide for Grimoorio

## Backend Setup (FastAPI)

1. **Create Web Service**
   - Go to render.com → New → Web Service
   - Connect your GitHub repository
   - Root Directory: `backend/`
   - Environment: `Python 3.11`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python -m uvicorn server:app --host 0.0.0.0 --port $PORT`

2. **Set Environment Variables** (in Render Dashboard)
   - `MONGO_URL`: Your MongoDB connection string
   - `DB_NAME`: Database name
   - `JWT_SECRET`: Your JWT secret key
   - `R2_BUCKET_NAME`: Cloudflare R2 bucket
   - `R2_ENDPOINT_URL`: R2 endpoint
   - `R2_ACCESS_KEY_ID`: R2 access key
   - `R2_SECRET_ACCESS_KEY`: R2 secret key
   - `ADMIN_EMAIL`: Admin email
   - `ADMIN_PASSWORD`: Admin password

## Frontend Setup (React)

1. **Create Static Site**
   - Go to render.com → New → Static Site
   - Connect your GitHub repository
   - Root Directory: `frontend/`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`

2. **Update Backend URL**
   - After backend is deployed, note its URL (e.g., https://your-backend.onrender.com)
   - Update frontend environment in Render dashboard:
     - `REACT_APP_BACKEND_URL`: https://your-backend.onrender.com

3. **Allow CORS**
   - The backend already has CORS enabled, but verify the frontend URL is accessible

## Important Notes

- Keep your `.env` files local - they're in `.gitignore`
- The `.env.example` files are in the repo for reference
- All secrets should be configured in Render's environment variables, never in git
- Frontend will auto-rebuild when you push to main
- Backend will restart automatically with new environment variables
