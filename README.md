This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

### Git-Based Deployment (Recommended)

This project is configured for automatic deployment through Git integration with Vercel:

1. Run pre-deployment checks: `npm run pre-deploy`
2. Commit your changes: `git commit -m "Your changes"`
3. Push to your repository: `git push origin main`

For detailed Git deployment instructions, see [GIT-DEPLOYMENT.md](./GIT-DEPLOYMENT.md).

### Alternative Deployment Options

1. **Manual deployment**:
   ```bash
   # Build and deploy manually
   npm run build
   npm run deploy
   ```

2. **Via Vercel Dashboard**:
   Configure the following settings:
   - Build Command: `prisma generate && prisma migrate deploy && next build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### Database Migration Notes

This project uses PostgreSQL with UUID string IDs. When deploying after the ID migration:

1. Ensure all migrations are applied with: `npx prisma migrate deploy`
2. If using an existing database, verify UUID conversions are complete
3. Always take a backup before deployment: `node scripts/backup-database.js`

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Testing

This project includes a comprehensive test suite with Jest and Playwright. Run tests with:

```bash
# Run Jest unit tests
npm test

# Run end-to-end tests
npm run test:e2e
```

See [TESTING.md](./TESTING.md) for more details.

### Testing Stack

- **Unit Tests**: Jest and React Testing Library for component and utility testing
- **End-to-End Tests**: Playwright for full application testing in real browsers
- **Mobile Testing**: Playwright device emulation for responsive design testing
- **Visual Regression**: Screenshot comparison to detect unexpected UI changes

### Pre-commit Hooks

The project uses Husky to run tests on staged files before commits, helping to ensure that only working code is committed.
