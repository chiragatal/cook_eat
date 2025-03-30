# Git-Based Deployment with Vercel

This project is configured for automatic deployment through Git integration with Vercel. Follow these steps for a successful deployment.

## Deployment Process

### 1. Run Pre-Deployment Checks

Before committing and pushing your changes, run the pre-deployment script to ensure everything is ready:

```bash
npm run pre-deploy
```

This script will:
- Create a database backup
- Run TypeScript type checking
- Generate the Prisma client

### 2. Commit Your Changes

After the pre-deployment checks pass, commit your changes:

```bash
git add .
git commit -m "Your descriptive commit message"
```

### 3. Push to Your Repository

Push the changes to your connected Git repository:

```bash
git push origin main
```

### 4. Monitor Deployment

Vercel will automatically detect the push and start the deployment process. You can monitor the deployment in the Vercel dashboard.

## Environment Variables

### Important: Configure Environment Variables in the Vercel Dashboard

1. **Log in to your Vercel dashboard**: https://vercel.com/dashboard
2. **Select your project**
3. **Go to Settings > Environment Variables**
4. **Add the following environment variables**:

| Name | Value | Description |
|------|-------|-------------|
| `DATABASE_URL` | `postgres://...` | Your PostgreSQL connection string |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your production URL |
| `NEXTAUTH_SECRET` | `your-secret-key` | Your NextAuth secret key |

**Important**: Do NOT set these variables in `vercel.json` as that can cause deployment issues. Always use the Vercel dashboard.

## Troubleshooting

If you encounter issues during deployment:

1. **Check Vercel Build Logs**:
   - Review the build logs in the Vercel dashboard for error messages
   - Look for Prisma migration failures or database connection issues

2. **Database Migration Issues**:
   - If migrations fail, you may need to run them manually:
     ```bash
     npx prisma migrate deploy
     ```
   - For more complex migration issues, refer to [DEPLOYMENT.md](./DEPLOYMENT.md)

3. **Failed Type Checking**:
   - Fix any TypeScript errors reported by the pre-deployment script
   - Pay special attention to type mismatches with ID fields (string vs. number)

4. **Environment Variable Problems**:
   - Verify all required environment variables are set in Vercel
   - Ensure the database connection string is correct and the database is accessible

## Rollback to Previous Version

If you need to roll back to a previous version:

1. In the Vercel dashboard, go to your project
2. Navigate to "Deployments"
3. Find a working deployment and click "..." then "Promote to Production"

Alternatively, you can revert your Git commit and push the reversion.

## Database Backups

Regular backups are created during the pre-deployment process. You can find them in the `backups/` directory.

To restore from a backup, use:

```bash
node scripts/restore-database.js backups/[backup-filename].json
```

For more detailed deployment information, see [DEPLOYMENT.md](./DEPLOYMENT.md).
