-- Enforce one newsletter subscription per email.
-- Keep the earliest row when duplicates already exist.
DELETE `newer`
FROM `NewsletterSubmission` AS `newer`
INNER JOIN `NewsletterSubmission` AS `older`
  ON `newer`.`email` = `older`.`email`
  AND (
    `newer`.`createdAt` > `older`.`createdAt`
    OR (`newer`.`createdAt` = `older`.`createdAt` AND `newer`.`id` > `older`.`id`)
  );

ALTER TABLE `NewsletterSubmission`
  ADD CONSTRAINT `NewsletterSubmission_email_key` UNIQUE (`email`);
