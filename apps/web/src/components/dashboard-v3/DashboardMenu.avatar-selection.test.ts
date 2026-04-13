import { describe, expect, it } from "vitest";
import { resolveMenuAvatarSelection } from "./DashboardMenu";
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
      avatarId: 3,
      code: "RED_CAT",
    });
  });

  it("uses explicit default avatar fallback when avatar data is missing", () => {
    expect(resolveMenuAvatarSelection(null)).toMatchObject({
      avatarId: 1,
      code: "BLUE_AMPHIBIAN",
    });
  });
});
