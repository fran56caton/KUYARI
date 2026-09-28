ALTER TABLE products ADD COLUMN inquiry_only INTEGER NOT NULL DEFAULT 0 CHECK(inquiry_only IN (0,1));
