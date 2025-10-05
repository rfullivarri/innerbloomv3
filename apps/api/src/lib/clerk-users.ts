import type { ShadowUserUpsert } from '../services/user-shadow.js';

export interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

export interface ClerkUserPayload {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string | null;
  image_url?: string | null;
  profile_image_url?: string | null;
}

export function extractPrimaryEmail(user: ClerkUserPayload): string | null {
  const addresses = user.email_addresses ?? [];
  const primaryId = user.primary_email_address_id ?? undefined;

  const primary = primaryId
    ? addresses.find((address) => address.id === primaryId)
    : undefined;

  const selected = primary ?? addresses[0];
  const value = selected?.email_address?.trim();

  return value ? value : null;
}

export function buildFullName(user: ClerkUserPayload): string | null {
  const parts = [user.first_name, user.last_name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  if (parts.length > 0) {
    return parts.join(' ');
  }

  const username = user.username?.trim();
  return username ? username : null;
}

export function extractImageUrl(user: ClerkUserPayload): string | null {
  const value = user.image_url ?? user.profile_image_url ?? null;
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapClerkUserToShadow(user: ClerkUserPayload): ShadowUserUpsert {
  return {
    clerkUserId: user.id,
    emailPrimary: extractPrimaryEmail(user),
    fullName: buildFullName(user),
    imageUrl: extractImageUrl(user),
  };
}
