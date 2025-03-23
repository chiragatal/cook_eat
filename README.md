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

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Testing

The Cook-Eat application includes comprehensive automated testing to ensure reliability and prevent regressions. See [TESTING.md](TESTING.md) for detailed documentation and [IMPLEMENTED_TESTS.md](IMPLEMENTED_TESTS.md) for a complete list of all implemented tests.

### Testing Stack

- **Unit Tests**: Jest and React Testing Library for component and utility testing
- **End-to-End Tests**: Playwright for full application testing in real browsers
- **Mobile Testing**: Playwright device emulation for responsive design testing
- **Visual Regression**: Screenshot comparison to detect unexpected UI changes

### Running Tests

```bash
# Run unit tests
npm test

# Run unit tests in watch mode (for development)
npm run test:watch

# Run end-to-end tests
npm run test:e2e

# Run end-to-end tests with UI mode
npm run test:e2e:ui

# Run all tests
npm run test:all
```

### Pre-commit Hooks

The project uses Husky to run tests on staged files before commits, helping to ensure that only working code is committed.
