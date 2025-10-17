/*
  # Add "Making Others Great" category

  1. Changes
    - Add new category "Making Others Great" to the categories table

  2. Notes
    - Safe, additive-only change
    - Preserves existing categories
*/

INSERT INTO categories (name)
SELECT 'Making Others Great' WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE name = 'Making Others Great'
);