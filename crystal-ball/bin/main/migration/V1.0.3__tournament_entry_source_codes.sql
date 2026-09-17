-- Preserve entry codes supplied by the CSV source, including Olympic entries.
ALTER TYPE tournament_entry ADD VALUE IF NOT EXISTS 'ITF';
ALTER TYPE tournament_entry ADD VALUE IF NOT EXISTS 'UP';
ALTER TYPE tournament_entry ADD VALUE IF NOT EXISTS 'NG';
ALTER TYPE tournament_entry ADD VALUE IF NOT EXISTS 'W';
ALTER TYPE tournament_entry ADD VALUE IF NOT EXISTS 'L';
