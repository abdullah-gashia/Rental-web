-- Mirror in-app notifications to e-mail. Additive and defaulted, so existing
-- rows keep working and every current user is opted in.
ALTER TABLE "user_preferences"
  ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT true;
