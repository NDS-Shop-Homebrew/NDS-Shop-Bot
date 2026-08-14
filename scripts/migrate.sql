-- NDS-Shop Bot — migration BDD (nouvelles tables bot_*)
-- Idempotent : CREATE TABLE IF NOT EXISTS. À exécuter une fois sur le serveur.
-- Usage: mysql ndsshop < scripts/migrate.sql   (ou sudo mysql ndsshop < scripts/migrate.sql)

CREATE TABLE IF NOT EXISTS `bot_ticket` (
    `id` VARCHAR(191) NOT NULL,
    `userId` TEXT NOT NULL,
    `username` TEXT NULL,
    `category` TEXT NOT NULL,
    `threadId` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bot_ticket_message` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `authorId` TEXT NOT NULL,
    `author` TEXT NOT NULL,
    `content` TEXT NOT NULL,
    `direction` VARCHAR(191) NOT NULL DEFAULT 'user',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    CONSTRAINT `bot_ticket_message_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `bot_ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bot_user_profile` (
    `id` VARCHAR(191) NOT NULL,
    `discordId` VARCHAR(191) NOT NULL,
    `xp` BIGINT NOT NULL DEFAULT 0,
    `level` INTEGER NOT NULL DEFAULT 1,
    `favorites` TEXT NULL,
    `watched` TEXT NULL,
    `lastXpAt` DATETIME(3) NULL,
    `totalMsgs` INTEGER NOT NULL DEFAULT 0,
    `badge` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `bot_user_profile_discordId_key`(`discordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bot_game_sub` (
    `id` VARCHAR(191) NOT NULL,
    `discordId` VARCHAR(191) NOT NULL,
    `games` TEXT NOT NULL,
    UNIQUE INDEX `bot_game_sub_discordId_key`(`discordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bot_reminder` (
    `id` VARCHAR(191) NOT NULL,
    `discordId` TEXT NOT NULL,
    `content` TEXT NOT NULL,
    `channelId` TEXT NULL,
    `dueAt` DATETIME(3) NOT NULL,
    `sent` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bot_command_log` (
    `id` VARCHAR(191) NOT NULL,
    `userId` TEXT NOT NULL,
    `username` TEXT NULL,
    `command` TEXT NOT NULL,
    `options` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bot_blacklist` (
    `id` VARCHAR(191) NOT NULL,
    `discordId` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `bot_blacklist_discordId_key`(`discordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bot_warn` (
    `id` VARCHAR(191) NOT NULL,
    `discordId` TEXT NOT NULL,
    `modId` TEXT NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bot_dm_contact` (
    `id` VARCHAR(191) NOT NULL,
    `discordId` VARCHAR(191) NOT NULL,
    `username` TEXT NOT NULL,
    `lastMessage` TEXT NULL,
    `lastAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `unreadCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `bot_dm_contact_discordId_key`(`discordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bot_dm_message` (
    `id` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `direction` VARCHAR(191) NOT NULL DEFAULT 'user',
    `authorId` TEXT NOT NULL,
    `author` TEXT NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    CONSTRAINT `bot_dm_message_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `bot_dm_contact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
