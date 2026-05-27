CREATE DATABASE recipe_manager_db;
USE recipe_manager_db;

-- SELECT
SELECT * FROM Recipes;

-- INSERT
INSERT INTO Recipes (title, description, ingredients, category, cookingTime, userId, createdAt, updatedAt)
VALUES ('Борщ', 'Українська перша страва', 'буряк, капуста, картопля', 'Суп', 60, 1, NOW(), NOW());

-- UPDATE
UPDATE Recipes SET cookingTime = 55 WHERE id = 1;

-- DELETE
DELETE FROM Recipes WHERE id = 1;
