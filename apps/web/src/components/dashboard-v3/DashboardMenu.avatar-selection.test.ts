import { describe, expect, it } from "vitest";
import { resolveMenuAvatarSelection } from "./DashboardMenu";
import type { AvatarProfile } from "../../lib/avatarProfile";

describe("resolveMenuAvatarSelection", () => {
  it("prefers avatar_id from /users/me payload", () => {
    const profile = {
      avatarId: 3,
      avatarCode: "LEGACY_CHILL",
      avatarName: "Legacy Chill",
      theme: { accent: "#00C2FF", chip: "aqua" },
      isLegacyFallback: false,
      fallbackReason: "none",
    } satisfies AvatarProfile;

    expect(resolveMenuAvatarSelection(profile)).toMatchObject({
      avatarId: 3,
      code: "LEGACY_FLOW",
    });
  });

  it("falls back to avatar_code when avatar_id is missing", () => {
    const profile = {
      avatarId: null,
      avatarCode: "LEGACY_EVOLVE",
      avatarName: "Legacy Evolve",
      theme: { accent: "#FF6A00", chip: "ember" },
      isLegacyFallback: true,
      fallbackReason: "missing-avatar-payload",
    } satisfies AvatarProfile;

    expect(resolveMenuAvatarSelection(profile)).toMatchObject({
      avatarId: 4,
      code: "LEGACY_EVOLVE",
    });
  });

  it("uses explicit default avatar fallback when avatar data is missing", () => {
    expect(resolveMenuAvatarSelection(null)).toMatchObject({
      avatarId: 2,
      code: "LEGACY_CHILL",
    });
  });
});
