'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Shield, Globe, User, LogOut, Settings, Info } from 'lucide-react';
import { APP_VERSION, COPYRIGHT, MADE_IN_SLOVENIA } from '@/lib/version';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionData = useSession();

  // Safety check for SSR
  if (!sessionData) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
    </div>;
  }

  const { data: session, status } = sessionData;
  const user = session?.user ?? null;

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/app/domains" className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-slate-800" />
                <span className="text-xl font-bold text-slate-900">
                  M-Host DMARC
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-4">
                <Link
                  href="/app/domains"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname?.startsWith('/app/domains')
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Globe className="inline h-4 w-4 mr-1" />
                  Domains
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    href="/admin/customers"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname?.startsWith('/admin')
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Settings className="inline h-4 w-4 mr-1" />
                    Admin
                  </Link>
                )}
                <Link
                  href="/app/system"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === '/app/system'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Info className="inline h-4 w-4 mr-1" />
                  System
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline">{user?.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.email}</span>
                      <span className="text-xs text-slate-500">
                        {user?.role === 'admin' ? 'Administrator' : user?.customerName}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-slate-600">{COPYRIGHT}</p>
              <p className="text-xs text-slate-500 mt-1">{MADE_IN_SLOVENIA}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <Link
                href="/app/system"
                className="hover:text-slate-900 transition-colors"
              >
                Verzija {APP_VERSION}
              </Link>
              <span>•</span>
              <a
                href="https://m-host.si"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900 transition-colors"
              >
                M-Host d.o.o.
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
