-- Insert 5 sample staff employees
INSERT INTO public.employees (
  id,
  employee_number,
  name_ar,
  name_en,
  national_id,
  nationality,
  phone,
  email,
  department,
  position,
  is_active
) VALUES
  (
    gen_random_uuid(),
    'EMP-2025-001',
    'أحمد محمد العلي',
    'Ahmed Mohammed Al-Ali',
    '1234567890',
    'Saudi Arabia',
    '+966501234567',
    'ahmed.alali@company.com',
    'Human Resources',
    'HR Manager',
    TRUE
  ),
  (
    gen_random_uuid(),
    'EMP-2025-002',
    'فاطمة عبدالله السالم',
    'Fatima Abdullah Al-Salem',
    '2345678901',
    'Saudi Arabia',
    '+966502345678',
    'fatima.salem@company.com',
    'Finance',
    'Accountant',
    TRUE
  ),
  (
    gen_random_uuid(),
    'EMP-2025-003',
    'خالد سعيد الحربي',
    'Khaled Saeed Al-Harbi',
    '3456789012',
    'Saudi Arabia',
    '+966503456789',
    'khaled.harbi@company.com',
    'IT',
    'System Administrator',
    TRUE
  ),
  (
    gen_random_uuid(),
    'EMP-2025-004',
    'نورة عبدالرحمن القحطاني',
    'Noura Abdulrahman Al-Qahtani',
    '4567890123',
    'Saudi Arabia',
    '+966504567890',
    'noura.qahtani@company.com',
    'Operations',
    'Operations Coordinator',
    TRUE
  ),
  (
    gen_random_uuid(),
    'EMP-2025-005',
    'عمر يوسف الشمري',
    'Omar Yousef Al-Shammari',
    '5678901234',
    'Saudi Arabia',
    '+966505678901',
    'omar.shammari@company.com',
    'Marketing',
    'Marketing Specialist',
    TRUE
  );
