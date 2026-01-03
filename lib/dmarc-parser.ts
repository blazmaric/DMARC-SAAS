import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import { XMLParser } from 'fast-xml-parser';
import * as pako from 'pako';

interface DmarcFeedback {
  feedback?: {
    report_metadata?: {
      org_name?: string;
      email?: string;
      report_id?: string;
      date_range?: {
        begin?: number;
        end?: number;
      };
    };
    policy_published?: {
      domain?: string;
      adkim?: string;
      aspf?: string;
      p?: string;
      sp?: string;
      pct?: number;
    };
    record?: DmarcRecord[] | DmarcRecord;
  };
}

interface DmarcRecord {
  row?: {
    source_ip?: string;
    count?: number;
    policy_evaluated?: {
      disposition?: string;
      dkim?: string;
      spf?: string;
    };
  };
  identifiers?: {
    header_from?: string;
    envelope_from?: string;
  };
  auth_results?: {
    dkim?: DkimAuthResult | DkimAuthResult[];
    spf?: SpfAuthResult | SpfAuthResult[];
  };
}

interface DkimAuthResult {
  domain?: string;
  result?: string;
  selector?: string;
}

interface SpfAuthResult {
  domain?: string;
  result?: string;
  scope?: string;
}

export interface ParsedDmarcReport {
  orgName: string;
  reportId: string;
  beginDate: Date;
  endDate: Date;
  domain: string;
  records: ParsedDmarcRecord[];
}

export interface ParsedDmarcRecord {
  sourceIp: string;
  count: number;
  disposition: string;
  dkimResult: string;
  spfResult: string;
  dkimAligned: boolean;
  spfAligned: boolean;
  headerFrom: string;
  envelopeFrom?: string;
}

export async function parseEmailForDmarc(
  emailBuffer: Buffer
): Promise<ParsedDmarcReport | null> {
  const parsed = await simpleParser(emailBuffer);

  const xmlContent = await extractDmarcXml(parsed);
  if (!xmlContent) {
    return null;
  }

  return parseDmarcXml(xmlContent);
}

async function extractDmarcXml(
  parsed: ParsedMail
): Promise<string | null> {
  if (!parsed.attachments || parsed.attachments.length === 0) {
    return null;
  }

  for (const attachment of parsed.attachments) {
    try {
      const xml = await extractXmlFromAttachment(attachment);
      if (xml) {
        return xml;
      }
    } catch (error) {
      continue;
    }
  }

  return null;
}

async function extractXmlFromAttachment(
  attachment: Attachment
): Promise<string | null> {
  const filename = attachment.filename?.toLowerCase() || '';

  if (filename.endsWith('.xml')) {
    return attachment.content.toString('utf-8');
  }

  if (filename.endsWith('.xml.gz') || filename.endsWith('.gz')) {
    try {
      const decompressed = pako.ungzip(attachment.content);
      return Buffer.from(decompressed).toString('utf-8');
    } catch (error) {
      return null;
    }
  }

  if (filename.endsWith('.zip')) {
    return null;
  }

  return null;
}

function parseDmarcXml(xml: string): ParsedDmarcReport | null {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
  });

  const parsed: DmarcFeedback = parser.parse(xml);
  const feedback = parsed.feedback;

  if (!feedback || !feedback.report_metadata || !feedback.policy_published) {
    return null;
  }

  const metadata = feedback.report_metadata;
  const policy = feedback.policy_published;

  if (!metadata.org_name || !metadata.report_id || !metadata.date_range) {
    return null;
  }

  const records = Array.isArray(feedback.record)
    ? feedback.record
    : feedback.record
    ? [feedback.record]
    : [];

  return {
    orgName: metadata.org_name,
    reportId: metadata.report_id,
    beginDate: new Date((metadata.date_range.begin || 0) * 1000),
    endDate: new Date((metadata.date_range.end || 0) * 1000),
    domain: policy.domain || '',
    records: records
      .map((record) => parseDmarcRecord(record, policy.domain || ''))
      .filter((r): r is ParsedDmarcRecord => r !== null),
  };
}

function parseDmarcRecord(
  record: DmarcRecord,
  policyDomain: string
): ParsedDmarcRecord | null {
  if (!record.row || !record.identifiers) {
    return null;
  }

  const row = record.row;
  const identifiers = record.identifiers;
  const authResults = record.auth_results;

  const dkimResult = row.policy_evaluated?.dkim || 'fail';
  const spfResult = row.policy_evaluated?.spf || 'fail';

  let dkimAligned = dkimResult === 'pass';
  let spfAligned = spfResult === 'pass';

  if (authResults?.dkim) {
    const dkimAuth = Array.isArray(authResults.dkim)
      ? authResults.dkim
      : [authResults.dkim];
    dkimAligned = dkimAuth.some(
      (d) => d.result === 'pass' && d.domain === policyDomain
    );
  }

  if (authResults?.spf) {
    const spfAuth = Array.isArray(authResults.spf)
      ? authResults.spf
      : [authResults.spf];
    spfAligned = spfAuth.some(
      (s) => s.result === 'pass' && s.domain === policyDomain
    );
  }

  return {
    sourceIp: row.source_ip || 'unknown',
    count: row.count || 0,
    disposition: row.policy_evaluated?.disposition || 'none',
    dkimResult,
    spfResult,
    dkimAligned,
    spfAligned,
    headerFrom: identifiers.header_from || '',
    envelopeFrom: identifiers.envelope_from,
  };
}
