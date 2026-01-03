/*
  # Create DMARC Monitoring Schema
  
  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text, company name)
      - `created_at` (timestamptz)
      
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `role` (text, admin or customer)
      - `customer_id` (uuid, nullable, references customers)
      - `created_at` (timestamptz)
      
    - `domains`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `domain_name` (text)
      - `rua_token` (text, unique)
      - `dmarc_policy_target` (text, nullable)
      - `created_at` (timestamptz)
      
    - `dmarc_reports`
      - `id` (uuid, primary key)
      - `domain_id` (uuid, references domains)
      - `org_name` (text)
      - `report_id` (text)
      - `begin_date` (timestamptz)
      - `end_date` (timestamptz)
      - `created_at` (timestamptz)
      
    - `dmarc_records`
      - `id` (uuid, primary key)
      - `report_id` (uuid, references dmarc_reports)
      - `source_ip` (text)
      - `count` (integer)
      - `disposition` (text)
      - `dkim_result` (text)
      - `spf_result` (text)
      - `dkim_aligned` (boolean)
      - `spf_aligned` (boolean)
      - `header_from` (text)
      - `envelope_from` (text, nullable)
      
    - `daily_aggregates`
      - `id` (uuid, primary key)
      - `domain_id` (uuid, references domains)
      - `date` (date)
      - `total` (integer)
      - `pass_aligned` (integer)
      - `fail_aligned` (integer)
      
  2. Security
    - Enable RLS on all tables
    - Add policies for admin and customer access
    - Customers can only see their own data
    - Admins can see all data
    
  3. Indexes
    - Add indexes for frequent queries
    - Unique constraints for deduplication
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'customer',
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT role_check CHECK (role IN ('admin', 'customer'))
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create domains table
CREATE TABLE IF NOT EXISTS domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  domain_name text NOT NULL,
  rua_token text UNIQUE NOT NULL,
  dmarc_policy_target text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domains_customer_id ON domains(customer_id);
CREATE INDEX IF NOT EXISTS idx_domains_rua_token ON domains(rua_token);

ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

-- Create dmarc_reports table
CREATE TABLE IF NOT EXISTS dmarc_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  org_name text NOT NULL,
  report_id text NOT NULL,
  begin_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_report UNIQUE (domain_id, org_name, report_id, begin_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_dmarc_reports_domain_id ON dmarc_reports(domain_id);
CREATE INDEX IF NOT EXISTS idx_dmarc_reports_dates ON dmarc_reports(begin_date, end_date);

ALTER TABLE dmarc_reports ENABLE ROW LEVEL SECURITY;

-- Create dmarc_records table
CREATE TABLE IF NOT EXISTS dmarc_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES dmarc_reports(id) ON DELETE CASCADE,
  source_ip text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  disposition text NOT NULL,
  dkim_result text NOT NULL,
  spf_result text NOT NULL,
  dkim_aligned boolean NOT NULL DEFAULT false,
  spf_aligned boolean NOT NULL DEFAULT false,
  header_from text NOT NULL,
  envelope_from text
);

CREATE INDEX IF NOT EXISTS idx_dmarc_records_report_id ON dmarc_records(report_id);
CREATE INDEX IF NOT EXISTS idx_dmarc_records_source_ip ON dmarc_records(source_ip);

ALTER TABLE dmarc_records ENABLE ROW LEVEL SECURITY;

-- Create daily_aggregates table
CREATE TABLE IF NOT EXISTS daily_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  date date NOT NULL,
  total integer NOT NULL DEFAULT 0,
  pass_aligned integer NOT NULL DEFAULT 0,
  fail_aligned integer NOT NULL DEFAULT 0,
  CONSTRAINT unique_daily_aggregate UNIQUE (domain_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_aggregates_domain_date ON daily_aggregates(domain_id, date DESC);

ALTER TABLE daily_aggregates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers table
CREATE POLICY "Admins can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Customers can view their own customer"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.customer_id = customers.id
    )
  );

CREATE POLICY "Admins can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for domains table
CREATE POLICY "Customers can view their domains"
  ON domains FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.customer_id = domains.customer_id
    )
  );

CREATE POLICY "Admins can view all domains"
  ON domains FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Customers can insert their domains"
  ON domains FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.customer_id = domains.customer_id
    )
  );

CREATE POLICY "Admins can insert any domain"
  ON domains FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Customers can update their domains"
  ON domains FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.customer_id = domains.customer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.customer_id = domains.customer_id
    )
  );

CREATE POLICY "Admins can update any domain"
  ON domains FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for dmarc_reports table
CREATE POLICY "Customers can view their reports"
  ON dmarc_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM domains d
      JOIN users u ON u.customer_id = d.customer_id
      WHERE u.id = auth.uid() AND d.id = dmarc_reports.domain_id
    )
  );

CREATE POLICY "Admins can view all reports"
  ON dmarc_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for dmarc_records table
CREATE POLICY "Customers can view their records"
  ON dmarc_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dmarc_reports dr
      JOIN domains d ON d.id = dr.domain_id
      JOIN users u ON u.customer_id = d.customer_id
      WHERE u.id = auth.uid() AND dr.id = dmarc_records.report_id
    )
  );

CREATE POLICY "Admins can view all records"
  ON dmarc_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for daily_aggregates table
CREATE POLICY "Customers can view their aggregates"
  ON daily_aggregates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM domains d
      JOIN users u ON u.customer_id = d.customer_id
      WHERE u.id = auth.uid() AND d.id = daily_aggregates.domain_id
    )
  );

CREATE POLICY "Admins can view all aggregates"
  ON daily_aggregates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );