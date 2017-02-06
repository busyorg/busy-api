
CREATE TABLE IF NOT EXISTS "users"(
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "phone" SERIAL NOT NULL UNIQUE,
  "email_is_verified" INT DEFAULT 0,
  "phone_is_verified" INT DEFAULT 0,
);
