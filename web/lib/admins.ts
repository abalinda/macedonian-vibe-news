const ADMIN_EMAILS = [
  // Update this list to control who can create blog posts.
  "admin@vibes.mk",
  "team@vibes.mk",
  "andrej.petrovski@vibes.mk",
  "balinda.centar@gmail.com",

] as const;

export const isAdminEmail = (email: string | null | undefined) => {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === normalized);
};

export const adminEmails = ADMIN_EMAILS;
