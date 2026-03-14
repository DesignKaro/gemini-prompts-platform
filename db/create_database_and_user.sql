-- MySQL setup for Gemini Prompts project
-- Run this as a privileged MySQL user (root/admin).

CREATE DATABASE IF NOT EXISTS `u507572967_gemini_prompts`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'u507572967_gemini_prompts'@'%'
  IDENTIFIED BY 'Argro8264@8264';

GRANT ALL PRIVILEGES ON `u507572967_gemini_prompts`.*
  TO 'u507572967_gemini_prompts'@'%';

FLUSH PRIVILEGES;
