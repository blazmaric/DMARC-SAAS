import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    role: string;
    customerId: string | null;
    customerName?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      customerId: string | null;
      customerName?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    customerId: string | null;
    customerName?: string;
  }
}
