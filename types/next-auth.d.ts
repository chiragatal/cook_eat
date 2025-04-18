import 'next-auth';
import { JWT } from 'next-auth/jwt';
import NextAuth from "next-auth";

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's ID */
      id: string;
      name?: string | null;
      email?: string;
      isAdmin?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    isAdmin?: boolean;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    isAdmin?: boolean;
  }
}
