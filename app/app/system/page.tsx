import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSystemInfo, MADE_IN_SLOVENIA } from '@/lib/version';
import { Shield, Database, Lock, Server, Calendar, Tag } from 'lucide-react';

export default async function SystemPage() {
  const systemInfo = getSystemInfo();

  const infoItems = [
    {
      icon: Tag,
      label: 'Verzija',
      value: systemInfo.version,
      badge: true,
    },
    {
      icon: Calendar,
      label: 'Datum izgradnje',
      value: systemInfo.buildDate,
    },
    {
      icon: Server,
      label: 'Okolje',
      value: systemInfo.environment,
      badge: true,
    },
    {
      icon: Database,
      label: 'Podatkovna baza',
      value: systemInfo.database,
    },
    {
      icon: Lock,
      label: 'Avtentikacija',
      value: systemInfo.auth,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Informacije o sistemu</h1>
        <p className="text-slate-600 mt-2">
          Tehnične informacije o platformi M-Host DMARC
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-700" />
              <CardTitle>M-Host DMARC</CardTitle>
            </div>
            <CardDescription>
              On-premise platforma za spremljanje DMARC
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">
                    {item.label}
                  </span>
                </div>
                {item.badge ? (
                  <Badge variant="secondary">{item.value}</Badge>
                ) : (
                  <span className="text-sm text-slate-600">{item.value}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funkcionalnosti</CardTitle>
            <CardDescription>Ključne zmožnosti platforme</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>100% On-Premise - vsi podatki na vašem strežniku</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Večstanovanjska arhitektura z ločenimi podatki</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Vgrajen SMTP strežnik za sprejem DMARC poročil</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Preverjanje DNS konfiguracije v realnem času</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Analitična nadzorna plošča s grafikoni</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>PDF poročila v slovenščini in angleščini</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>GDPR skladno - lokalno shranjevanje podatkov</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tehnološki sklad</CardTitle>
            <CardDescription>Uporabljene tehnologije</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-slate-700">Frontend</p>
                <p className="text-slate-600">
                  Next.js 13, TypeScript, Tailwind CSS, shadcn/ui
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Backend</p>
                <p className="text-slate-600">Next.js API Routes, Prisma ORM</p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Podatkovna baza</p>
                <p className="text-slate-600">PostgreSQL 16 (lokalna)</p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Infrastruktura</p>
                <p className="text-slate-600">
                  Docker Compose (Nginx, Postfix, App, PostgreSQL)
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Varnost</p>
                <p className="text-slate-600">
                  NextAuth, JWT tokens, bcrypt hashing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>O M-Host</CardTitle>
            <CardDescription>Slovenska rešitev za EU trg</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              M-Host DMARC je profesionalna on-premise platforma za spremljanje
              DMARC avtentikacije e-pošte. Zasnovana je za slovenske in
              evropske organizacije, ki potrebujejo popoln nadzor nad svojimi
              podatki.
            </p>
            <div className="pt-2 border-t">
              <p className="text-sm font-medium text-slate-700">
                {MADE_IN_SLOVENIA}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                M-Host d.o.o., Ljubljana, Slovenija
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kontakt in podpora</CardTitle>
          <CardDescription>
            Za tehnično podporo ali dodatne informacije
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">E-pošta:</span>{' '}
              <a
                href="mailto:info@m-host.si"
                className="text-slate-900 hover:underline"
              >
                info@m-host.si
              </a>
            </p>
            <p>
              <span className="font-medium">Spletna stran:</span>{' '}
              <a
                href="https://m-host.si"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-900 hover:underline"
              >
                m-host.si
              </a>
            </p>
            <p className="text-slate-500 pt-2">
              Za najnovejšo dokumentacijo in posodobitve obiščite našo GitHub
              stran.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
