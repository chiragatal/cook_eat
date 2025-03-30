import { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Please provide NEXTAUTH_SECRET environment variable');
}

// Define the structure of our database User for clarity
interface DbUser {
  id: number;
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

          // Create a User object that matches your custom User type
          const authUser: User = {
            id: user.id, // Keep as number to match your custom type
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
            image: null
          };

          return authUser;
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
        // Type assertion to match your custom User type
        const typedUser = user as User;
        token.id = typedUser.id;
        token.isAdmin = typedUser.isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  }
};
