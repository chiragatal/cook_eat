import 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      email: string;
      name?: string | null;
      isAdmin: boolean;
      image?: string | null;
    }
  }

  interface User {
    id: number;
    email: string;
    name?: string | null;
    isAdmin: boolean;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: number;
    isAdmin: boolean;
  }
}
