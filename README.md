# Cook-Eat

https://cook-eat.vercel.app/

A recipe sharing and discovery app that helps you track what you're cooking and find inspiration from other cooks.

## Features

- User authentication and profiles
- Create, share, and discover recipes
- Reactions and comments on recipes
- Recipe collections and bookmarks
- Notifications system
- Mobile-friendly UI with dark mode support

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd cook_eat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your database credentials and other settings.

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Visit `http://localhost:3000` in your browser.

## Database Management

This application uses Prisma with a PostgreSQL database, recently migrated to use UUID string IDs instead of integer IDs.

### Common Database Operations

#### View Database with Prisma Studio
```bash
npx prisma studio
```

#### Create a Database Backup
```bash
node scripts/backup-database.js
```

#### Restore from a Backup
```bash
node scripts/restore-database.js backups/[filename].json
```

#### Clear and Restore Database (fixes duplicate data issues)
```bash
node scripts/clear-and-restore.js
```

#### Fix Migration Issues
```bash
node scripts/fix-migrations.js
```

### About the UUID Migration

The application was originally built with integer IDs and has been migrated to use UUID strings. This change provides:

- Better security and data privacy
- Reduced risk of ID enumeration attacks
- Distributed system compatibility
- No sequential ID leakage

If you encounter issues with IDs or duplicate data after deployment, refer to the `DEPLOYMENT.md` troubleshooting guide.

## Deployment

See `DEPLOYMENT.md` for detailed deployment instructions and troubleshooting.

For Git-based deployment, see `GIT-DEPLOYMENT.md` for the recommended workflow.

## Testing

This project includes a comprehensive test suite with Jest and Playwright. Run tests with:

```bash
# Run Jest unit tests
npm test

# Run end-to-end tests
npm run test:e2e
```

See [TESTING.md](./TESTING.md) for more details.

### Testing Against Preview Deployment

We've added support for testing against the preview deployment instead of production:

```bash
# Run tests against the preview deployment
npm run test:preview

# Set up the preview database and run tests
npm run test:preview:setup
```

For detailed instructions, refer to [PREVIEW-TESTING.md](./PREVIEW-TESTING.md).

### Testing Stack

- **Unit Tests**: Jest and React Testing Library for component and utility testing
- **End-to-End Tests**: Playwright for full application testing in real browsers
- **Mobile Testing**: Playwright device emulation for responsive design testing
- **Visual Regression**: Screenshot comparison to detect unexpected UI changes

### Pre-commit Hooks

The project uses Husky to run tests on staged files before commits, helping to ensure that only working code is committed.

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch
```

### End-to-End Tests
```bash
# RECOMMENDED: Run tests with reduced logging and screenshot summary
npm run test:e2e:simple

# Run a specific test file
npm run test:e2e:simple -- auth.spec.ts
```

See [TESTING.md](./TESTING.md) for more detailed testing instructions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to all contributors who have helped build and improve Cook-Eat!

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
