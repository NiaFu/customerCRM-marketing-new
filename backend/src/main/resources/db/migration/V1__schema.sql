CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(254),
  source VARCHAR(100),
  location VARCHAR(100),
  notes TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT phone_e164 CHECK (phone ~ '^\\+[1-9][0-9]{7,14}$')
);
CREATE TABLE tags (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  color VARCHAR(16) NOT NULL DEFAULT '#667085'
);
CREATE TABLE customer_tags (
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(customer_id,tag_id)
);
CREATE TABLE deals (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product VARCHAR(160) NOT NULL,
  stage VARCHAR(20) NOT NULL DEFAULT 'NEW'
    CHECK (stage IN ('NEW','VISITED','QUOTED','FOLLOW_UP','WON','LOST')),
  amount NUMERIC(12,2),
  follow_up_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE TABLE activities (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_customer ON activities(customer_id,created_at DESC);
CREATE TABLE sms_messages (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  request_id UUID NOT NULL UNIQUE,
  body VARCHAR(800) NOT NULL,
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('MARKETING','SERVICE')),
  status VARCHAR(20) NOT NULL,
  provider_message_id VARCHAR(150),
  error_message VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sms_customer ON sms_messages(customer_id,created_at DESC);
