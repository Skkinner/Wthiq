-- Insert default settings if not exists
INSERT INTO public.settings (
  default_reminder_days,
  timezone,
  default_language,
  email_enabled,
  sms_enabled,
  whatsapp_enabled
)
SELECT 
  ARRAY[30, 15, 7, 1],
  'Asia/Riyadh',
  'ar',
  true,
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.settings LIMIT 1);
