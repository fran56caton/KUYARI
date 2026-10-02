CREATE TABLE `addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text,
	`storage_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`public_product` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text,
	`action` text NOT NULL,
	`resource` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_date` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_0_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `coupon_usages` (
	`id` text PRIMARY KEY NOT NULL,
	`coupon_id` text NOT NULL,
	`order_id` text NOT NULL,
	`identity_hash` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `coupon_limits` ON `coupon_usages` (`coupon_id`,`identity_hash`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `coupon_usages_1_unique` ON `coupon_usages` (`order_id`);--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`kind` text NOT NULL,
	`value` integer NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`minimum` integer NOT NULL,
	`usage_limit` integer NOT NULL,
	`per_user` integer NOT NULL,
	`active` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_0_unique` ON `coupons` (`code`);--> statement-breakpoint
CREATE TABLE `delivery_zones` (
	`id` text PRIMARY KEY NOT NULL,
	`district` text NOT NULL,
	`province` text NOT NULL,
	`department` text NOT NULL,
	`fee` integer NOT NULL,
	`min_days` integer NOT NULL,
	`slots` text NOT NULL,
	`active` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `digital_memories` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`item_id` text NOT NULL,
	`public_token` text NOT NULL,
	`privacy` text NOT NULL,
	`pin_hash` text,
	`content` text NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `memories_order` ON `digital_memories` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `digital_memories_1_unique` ON `digital_memories` (`public_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `digital_memories_2_unique` ON `digital_memories` (`item_id`);--> statement-breakpoint
CREATE TABLE `init_flags` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memory_access` (
	`session_id` text NOT NULL,
	`memory_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `memory_id`),
	FOREIGN KEY (`memory_id`) REFERENCES `digital_memories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `memory_assets` (
	`memory_id` text NOT NULL,
	`asset_id` text NOT NULL,
	PRIMARY KEY(`memory_id`, `asset_id`),
	FOREIGN KEY (`memory_id`) REFERENCES `digital_memories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mutation_guard` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`name` text NOT NULL,
	`image` text NOT NULL,
	`qty` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`customization` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `items_order` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`status` text NOT NULL,
	`note` text NOT NULL,
	`actor` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `history_order` ON `order_status_history` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`buyer` text NOT NULL,
	`delivery` text NOT NULL,
	`subtotal` integer NOT NULL,
	`delivery_fee` integer NOT NULL,
	`discount` integer NOT NULL,
	`total` integer NOT NULL,
	`status` text NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`coupon_id` text,
	`reserved` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL,
	`preference_id` text,
	`checkout_url` text,
	`payment_lock` integer DEFAULT 0 NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`tracking_hash` text NOT NULL,
	`policy_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`channel` text DEFAULT 'online' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `orders_expiry` ON `orders` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `orders_status` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_account` ON `orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_3_unique` ON `orders` (`session_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_4_unique` ON `orders` (`code`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`event_key` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt` integer DEFAULT 0 NOT NULL,
	`sent_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_0_unique` ON `outbox` (`event_key`);--> statement-breakpoint
CREATE TABLE `password_resets` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE payment_settings (id TEXT PRIMARY KEY, value TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE yape_reports (id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), reference TEXT NOT NULL UNIQUE, payer TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL CHECK(status IN ('review','approved','rejected')), merchant TEXT NOT NULL, reviewed_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_id` text NOT NULL,
	`status` text NOT NULL,
	`amount` integer NOT NULL,
	`refunded` integer DEFAULT 0 NOT NULL,
	`provider_updated` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_order` ON `payments` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_1_unique` ON `payments` (`provider_id`);--> statement-breakpoint
CREATE TABLE `policies` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`url` text NOT NULL,
	`alt` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `images_product` ON `product_images` (`product_id`);--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`label` text NOT NULL,
	`price_delta` integer NOT NULL,
	`stock` integer NOT NULL,
	`active` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "variants_stock" CHECK("product_variants"."stock" >= 0)
);
--> statement-breakpoint
CREATE INDEX `variants_product` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`price` integer NOT NULL,
	`promo` integer,
	`stock` integer NOT NULL,
	`category_id` text NOT NULL,
	`active` integer NOT NULL,
	`featured` integer NOT NULL,
	`customizable` integer NOT NULL,
	`memory_price` integer NOT NULL,
	`options` text NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`inquiry_only` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "products_stock" CHECK("products"."stock" >= 0),
	CONSTRAINT "products_price" CHECK("products"."price" > 0)
);
--> statement-breakpoint
CREATE INDEX `products_catalog` ON `products` (`active`,`category_id`,`price`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_1_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_orders` (
	`session_id` text NOT NULL,
	`order_id` text NOT NULL,
	PRIMARY KEY(`session_id`, `order_id`),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`csrf` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_expiry` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `transaction_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`valid` integer NOT NULL,
	CONSTRAINT "optimistic_revision" CHECK("transaction_checks"."valid" = 1)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'customer' NOT NULL,
	`disabled` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_0_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE TABLE `love_access` (
	`session_id` text NOT NULL,
	`card_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `card_id`),
	FOREIGN KEY (`card_id`) REFERENCES `love_cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `love_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`public_token` text NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text,
	`content` text NOT NULL,
	`privacy` text NOT NULL,
	`pin_hash` text,
	`access_hash` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`request_key` text NOT NULL,
	`request_hash` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "love_cards_privacy" CHECK("love_cards"."privacy" IN ('link','pin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `love_cards_public_token_unique` ON `love_cards` (`public_token`);--> statement-breakpoint
CREATE INDEX `love_cards_owner` ON `love_cards` (`user_id`,`session_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `love_cards_request` ON `love_cards` (`session_id`,`request_key`);
