# Deployment Troubleshooting Guide

This guide addresses common issues that may occur when deploying the Cook & Eat application, especially after the migration to UUID-based IDs.

## Common Deployment Issues

### 1. Database Migration Failures

**Symptoms:**
- Deployment fails with Prisma migration errors
- Database tables are missing or have incorrect schemas
- Type errors related to ID fields

**Solutions:**
- Run migrations manually before deployment:
  ```bash
  npx prisma migrate deploy
  ```
- If the migration has conflicts, reset the database schema (⚠️ Warning: data loss):
  ```bash
  npx prisma migrate reset
  ```
- Ensure the same Prisma schema is used in all environments

### 2. Type Mismatches Between Number and String IDs

**Symptoms:**
- TypeScript errors about incompatible types
- Runtime errors about invalid ID format
- Components failing to render with ID-related errors

**Solutions:**
- Ensure all ID fields in interfaces use `string` type, not `number`
- Update interface definitions in:
  - Component props
  - API route parameters
  - Database utility functions
- Run TypeScript type checking to verify fixes:
  ```bash
  npm run type-check
  ```

### 3. API Routes Return 404 or 500 Errors

**Symptoms:**
- API routes that worked locally fail in production
- Server errors when trying to access or modify data
- Auth-related errors

**Solutions:**
- Check environment variables are set correctly in Vercel
- Verify database connection string is correct
- Ensure NEXTAUTH_URL and NEXTAUTH_SECRET are properly set
- Check logs in Vercel dashboard for detailed error messages

### 4. Database Connection Issues

**Symptoms:**
- Application deploys but fails to connect to database
- Prisma client errors in logs
- "Connection refused" or timeout errors

**Solutions:**
- Ensure the database is accessible from Vercel's deployment region
- Verify the database connection string in environment variables
- Check database firewall settings to allow connections from Vercel's IP ranges
- For Neon database, ensure the correct pooler URL is used

### 5. Image Upload Issues

**Symptoms:**
- Images fail to upload in production
- Missing images that were visible locally
- Storage-related errors

**Solutions:**
- Verify Vercel Blob Storage is properly configured
- Check access permissions for storage buckets
- Ensure environment variables for storage are correctly set

## Debugging Steps

1. **Check Vercel logs:**
   - Review build logs for errors
   - Check runtime logs for application errors

2. **Verify database migrations:**
   ```bash
   npx prisma migrate status
   ```

3. **Test database connection:**
   ```bash
   npx prisma db pull
   ```

4. **Validate environment variables:**
   Review all environment variables in Vercel dashboard

5. **Try local build:**
   ```bash
   npm run build
   ```

## Rollback Procedure

If deployment causes critical issues:

1. Restore from latest database backup:
   ```bash
   node scripts/restore-database.js backups/[latest-backup-file].json
   ```

2. Redeploy previous version using Git commit hash:
   ```bash
   vercel --prod --cwd . --scope [your-scope] [previous-commit-hash]
   ```

## Support

For persistent issues, check:
- Vercel deployment documentation
- Prisma migration documentation
- Next.js troubleshooting guides
