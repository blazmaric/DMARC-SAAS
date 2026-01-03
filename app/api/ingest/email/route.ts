import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseEmailForDmarc } from '@/lib/dmarc-parser';
import { extractTokenFromEmail } from '@/lib/tokens';

const MAX_BODY_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const ingestSecret = request.headers.get('x-ingest-token');

    if (!ingestSecret || ingestSecret !== process.env.INGEST_SECRET) {
      return NextResponse.json(
        { error: 'Invalid or missing ingest token' },
        { status: 401 }
      );
    }

    const contentLength = parseInt(
      request.headers.get('content-length') || '0',
      10
    );
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }

    const emailBuffer = Buffer.from(await request.arrayBuffer());

    const dmarcReport = await parseEmailForDmarc(emailBuffer);

    if (!dmarcReport) {
      return NextResponse.json(
        { error: 'No valid DMARC report found in email' },
        { status: 400 }
      );
    }

    const emailText = emailBuffer.toString('utf-8');
    const toMatch = emailText.match(/^To:\s*(.+)$/m);
    const toAddress = toMatch ? toMatch[1] : '';

    const token = extractTokenFromEmail(toAddress);

    if (!token) {
      return NextResponse.json(
        { error: 'Could not extract token from email' },
        { status: 400 }
      );
    }

    const domain = await prisma.domain.findUnique({
      where: { ruaToken: token },
      select: { id: true, customerId: true },
    });

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found for token' },
        { status: 404 }
      );
    }

    const existingReport = await prisma.dmarcReport.findFirst({
      where: {
        domainId: domain.id,
        orgName: dmarcReport.orgName,
        reportId: dmarcReport.reportId,
        beginDate: dmarcReport.beginDate,
        endDate: dmarcReport.endDate,
      },
    });

    if (existingReport) {
      return NextResponse.json({
        message: 'Report already processed',
        reportId: existingReport.id,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newReport = await tx.dmarcReport.create({
        data: {
          domainId: domain.id,
          orgName: dmarcReport.orgName,
          reportId: dmarcReport.reportId,
          beginDate: dmarcReport.beginDate,
          endDate: dmarcReport.endDate,
        },
      });

      if (dmarcReport.records.length > 0) {
        await tx.dmarcRecord.createMany({
          data: dmarcReport.records.map((record) => ({
            reportId: newReport.id,
            sourceIp: record.sourceIp,
            count: record.count,
            disposition: record.disposition,
            dkimResult: record.dkimResult,
            spfResult: record.spfResult,
            dkimAligned: record.dkimAligned,
            spfAligned: record.spfAligned,
            headerFrom: record.headerFrom,
            envelopeFrom: record.envelopeFrom || null,
          })),
        });
      }

      return newReport;
    });

    await updateDailyAggregates(
      domain.id,
      dmarcReport.beginDate,
      dmarcReport.records
    );

    return NextResponse.json({
      message: 'Report processed successfully',
      reportId: result.id,
      recordCount: dmarcReport.records.length,
    });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updateDailyAggregates(
  domainId: string,
  date: Date,
  records: any[]
) {
  const dateOnly = new Date(date);
  dateOnly.setUTCHours(0, 0, 0, 0);

  const total = records.reduce((sum, r) => sum + r.count, 0);
  const passAligned = records
    .filter((r) => r.dkimAligned && r.spfAligned)
    .reduce((sum, r) => sum + r.count, 0);
  const failAligned = total - passAligned;

  await prisma.dailyAggregate.upsert({
    where: {
      unique_daily_aggregate: {
        domainId,
        date: dateOnly,
      },
    },
    update: {
      total: { increment: total },
      passAligned: { increment: passAligned },
      failAligned: { increment: failAligned },
    },
    create: {
      domainId,
      date: dateOnly,
      total,
      passAligned,
      failAligned,
    },
  });
}
