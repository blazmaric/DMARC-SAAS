import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import dns from 'dns/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const domain = await prisma.domain.findUnique({
      where: { id },
    });

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    if (user.role === 'customer' && user.customerId !== domain.customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      const records = await dns.resolveTxt(`_dmarc.${domain.domainName}`);

      const dmarcRecord = records
        .flat()
        .find((record) => record.startsWith('v=DMARC1'));

      if (!dmarcRecord) {
        return NextResponse.json({
          status: 'missing',
          message: 'No DMARC record found',
        });
      }

      const expectedRuaEmail = `${domain.ruaToken}@${process.env.NEXT_PUBLIC_DMARC_DOMAIN}`;
      const containsRua = dmarcRecord.includes(expectedRuaEmail);

      return NextResponse.json({
        status: containsRua ? 'valid' : 'detected',
        record: dmarcRecord,
        containsRua,
        message: containsRua
          ? 'DMARC record configured correctly'
          : 'DMARC record found but not pointing to M-Host',
      });
    } catch (error: any) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        return NextResponse.json({
          status: 'missing',
          message: 'No DMARC record found',
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('DNS check error:', error);
    return NextResponse.json(
      { error: 'Failed to check DNS' },
      { status: 500 }
    );
  }
}
