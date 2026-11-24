ALTER TABLE customers ADD COLUMN consent_source VARCHAR(140);
ALTER TABLE customers DROP CONSTRAINT phone_e164;
ALTER TABLE customers ADD CONSTRAINT phone_e164
  CHECK (phone ~ '^\+[1-9][0-9]{7,14}$');
