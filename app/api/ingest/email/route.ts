import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
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

    const supabase = await createServiceClient();

    const { data: domain } = await supabase
      .from('domains')
      .select('id, customer_id')
      .eq('rua_token', token)
      .maybeSingle();

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found for token' },
        { status: 404 }
      );
    }

    const { data: existingReport } = await supabase
      .from('dmarc_reports')
      .select('id')
      .eq('domain_id', domain.id)
      .eq('org_name', dmarcReport.orgName)
      .eq('report_id', dmarcReport.reportId)
      .eq('begin_date', dmarcReport.beginDate.toISOString())
      .eq('end_date', dmarcReport.endDate.toISOString())
      .maybeSingle();

    if (existingReport) {
      return NextResponse.json({
        message: 'Report already processed',
        reportId: existingReport.id,
      });
    }

    const { data: newReport, error: reportError } = await supabase
      .from('dmarc_reports')
      .insert({
        domain_id: domain.id,
        org_name: dmarcReport.orgName,
        report_id: dmarcReport.reportId,
        begin_date: dmarcReport.beginDate.toISOString(),
        end_date: dmarcReport.endDate.toISOString(),
      })
      .select('id')
      .single();

    if (reportError || !newReport) {
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      );
    }

    const recordsToInsert = dmarcReport.records.map((record) => ({
      report_id: newReport.id,
      source_ip: record.sourceIp,
      count: record.count,
      disposition: record.disposition,
      dkim_result: record.dkimResult,
      spf_result: record.spfResult,
      dkim_aligned: record.dkimAligned,
      spf_aligned: record.spfAligned,
      header_from: record.headerFrom,
      envelope_from: record.envelopeFrom || null,
    }));

    if (recordsToInsert.length > 0) {
      const { error: recordsError } = await supabase
        .from('dmarc_records')
        .insert(recordsToInsert);

      if (recordsError) {
        console.error('Failed to insert records:', recordsError);
      }
    }

    await updateDailyAggregates(
      domain.id,
      dmarcReport.beginDate,
      dmarcReport.endDate,
      dmarcReport.records
    );

    return NextResponse.json({
      message: 'Report processed successfully',
      reportId: newReport.id,
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
  beginDate: Date,
  endDate: Date,
  records: any[]
) {
  const supabase = await createServiceClient();

  const dateToProcess = new Date(beginDate);
  dateToProcess.setUTCHours(0, 0, 0, 0);

  const dateStr = dateToProcess.toISOString().split('T')[0];

  const total = records.reduce((sum, r) => sum + r.count, 0);
  const passAligned = records
    .filter((r) => r.dkimAligned && r.spfAligned)
    .reduce((sum, r) => sum + r.count, 0);
  const failAligned = total - passAligned;

  const { data: existing } = await supabase
    .from('daily_aggregates')
    .select('id, total, pass_aligned, fail_aligned')
    .eq('domain_id', domainId)
    .eq('date', dateStr)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('daily_aggregates')
      .update({
        total: existing.total + total,
        pass_aligned: existing.pass_aligned + passAligned,
        fail_aligned: existing.fail_aligned + failAligned,
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('daily_aggregates').insert({
      domain_id: domainId,
      date: dateStr,
      total,
      pass_aligned: passAligned,
      fail_aligned: failAligned,
    });
  }
}
