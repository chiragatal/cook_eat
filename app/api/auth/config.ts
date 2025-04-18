import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Use a singleton pattern for Prisma to prevent too many connections
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Please provide NEXTAUTH_SECRET environment variable');
}

// Define the structure of our database User for clarity
interface DbUser {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  isAdmin: boolean;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        console.log('Auth attempt with credentials:', credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials');
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          }) as DbUser | null;

          console.log('User found in database:', user ? 'Yes' : 'No');

          if (!user) {
            console.log('User not found in database');
            return null;
          }

          console.log('Comparing password hash');
          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

          console.log('Password valid:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('Invalid password');
            return null;
          }

          console.log('Authentication successful, returning user data');

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
            image: null
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id.toString();
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id.toString();
        session.user.isAdmin = token.isAdmin;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  }
};
