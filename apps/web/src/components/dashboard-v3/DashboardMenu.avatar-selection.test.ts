import { describe, expect, it } from "vitest";
import {
  resolveMenuAvatarPreviewImage,
  resolveMenuAvatarSelection,
  resolveMenuAvatarTheme,
} from "./DashboardMenu";
import { AVATAR_OPTIONS } from "../../lib/avatarCatalog";
import type { AvatarProfile } from "../../lib/avatarProfile";

describe("resolveMenuAvatarSelection", () => {
  it("prefers avatar_id from /users/me payload", () => {
    const profile = {
      avatarId: 3,
      avatarCode: "BLUE_AMPHIBIAN",
      avatarName: "Blue Amphibian",
      theme: { accent: "#00C2FF", chip: "aqua" },
      isLegacyFallback: false,
      fallbackReason: "none",
      assetPayload: null,
    } satisfies AvatarProfile;

    expect(resolveMenuAvatarSelection(profile)).toMatchObject({
      avatarId: 3,
      code: "RED_CAT",
    });
  });

  it("falls back to avatar_code when avatar_id is missing", () => {
    const profile = {
      avatarId: null,
      avatarCode: "LEGACY_EVOLVE",
      avatarName: "Legacy Evolve (compat)",
      theme: { accent: "#FF6A00", chip: "ember" },
      isLegacyFallback: true,
      fallbackReason: "missing-avatar-payload",
      assetPayload: null,
    } satisfies AvatarProfile;

    expect(resolveMenuAvatarSelection(profile)).toMatchObject({
      avatarId: 4,
      code: "VIOLET_OWL",
    });
  });

  it("uses explicit default avatar fallback when avatar data is missing", () => {
    expect(resolveMenuAvatarSelection(null)).toMatchObject({
      avatarId: 1,
      code: "BLUE_AMPHIBIAN",
    });
  });

  it("resolves menu theme tokens from selected avatar identity", () => {
    const staleThemeProfile = {
      avatarId: 4,
      avatarCode: "VIOLET_OWL",
      avatarName: "Violet Owl",
      theme: { accent: "#00C2FF", chip: "aqua" },
      isLegacyFallback: false,
      fallbackReason: "none",
      assetPayload: null,
    } satisfies AvatarProfile;

    expect(resolveMenuAvatarTheme(staleThemeProfile)).toEqual({
      accent: "#A855F7",
      chip: "violet",
    });
  });

  it("uses GMO preview images for change-avatar cards without /avatars/v1 fallback", () => {
    const previewImages = AVATAR_OPTIONS.map((option) => resolveMenuAvatarPreviewImage(option));
    expect(previewImages).toEqual(["/flowGMO.png", "/chillGMO.png", "/lowGMO.png", "/evolveGMO.png"]);
    previewImages.forEach((imagePath) => {
      expect(imagePath).not.toContain("/avatars/v1/");
    });
  });
});
