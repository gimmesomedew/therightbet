-- Add NCAA Football to sports table
INSERT INTO sports (name, code) 
VALUES ('NCAA Football', 'NCAAFB')
ON CONFLICT (code) DO NOTHING;

