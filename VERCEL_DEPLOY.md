# Deploying to Vercel

This SvelteKit application is configured to deploy on Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Your GitHub repository pushed to GitHub
3. Environment variables configured

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Import your repository**
   - Go to https://vercel.com/new
   - Import your GitHub repository (`THERiGHTBET`)
   - Vercel will auto-detect SvelteKit

2. **Configure environment variables**
   - In the Vercel project settings, go to "Environment Variables"
   - Add all variables from your `.env` file:
     - `DATABASE_URL` - Your Neon database connection string
     - `SPORTRADAR_API_KEY` - Your Sportradar API key
     - `JWT_SECRET` - Your JWT secret for authentication
     - Any other environment variables you use

3. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
   For production deployment:
   ```bash
   vercel --prod
   ```

4. **Set environment variables**
   ```bash
   vercel env add DATABASE_URL
   vercel env add SPORTRADAR_API_KEY
   vercel env add JWT_SECRET
   # Add other variables as needed
   ```

## Configuration Files

- `svelte.config.js` - Configured with `@sveltejs/adapter-vercel`
- `vercel.json` - Vercel-specific configuration (optional, auto-detected)

## Environment Variables

Make sure to set these in Vercel's dashboard:

- `DATABASE_URL` - Neon PostgreSQL connection string
- `SPORTRADAR_API_KEY` - Your Sportradar API key
- `JWT_SECRET` - Secret key for JWT tokens

## Database Configuration

Your Neon database should be accessible from Vercel's serverless functions. The `@neondatabase/serverless` package is already configured and will work with Vercel's edge runtime.

## Notes

- Vercel will automatically detect SvelteKit and configure the build
- The adapter uses Vercel's serverless functions for API routes
- Static assets are automatically optimized and served via CDN
- Preview deployments are created for every push to your repository

## Troubleshooting

If you encounter build errors:
1. Check that all environment variables are set
2. Verify your `package.json` has the correct dependencies
3. Check Vercel build logs for specific error messages
4. Ensure your Node.js version is compatible (Vercel uses Node 20.x by default)

