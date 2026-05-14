-- Insert default settings if not exists
INSERT INTO settings (default_reminder_days, timezone, default_language, email_enabled, sms_enabled, whatsapp_enabled)
SELECT 30, 'UTC', 'en', TRUE, FALSE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);
