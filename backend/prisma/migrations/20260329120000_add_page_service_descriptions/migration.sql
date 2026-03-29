-- AlterTable: краткое описание и превью страницы (в т.ч. услуг) в колонках для выборок без join по блокам.
ALTER TABLE `Page` ADD COLUMN `description` TEXT NULL,
ADD COLUMN `preview` TEXT NULL;
