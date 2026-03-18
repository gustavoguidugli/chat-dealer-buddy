-- Fix corrupted slug: "Interesse" field has slug 'gasto' instead of 'interesse' (ID 50, Funil 26)
UPDATE campos_customizados SET slug = 'interesse' WHERE id = 50;