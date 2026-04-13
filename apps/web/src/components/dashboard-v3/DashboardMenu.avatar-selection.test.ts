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
    } satisfies AvatarProfile;

    expect(resolveMenuAvatarSelection(profile, "Low")).toMatchObject({
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
    } satisfies AvatarProfile;

    expect(resolveMenuAvatarSelection(profile, "Low")).toMatchObject({
      avatarId: 4,
      code: "LEGACY_EVOLVE",
    });
  });

  it("uses rhythm fallback when avatar data is missing", () => {
    expect(resolveMenuAvatarSelection(null, "Chill")).toMatchObject({
      avatarId: 2,
      code: "LEGACY_CHILL",
    });
  });
});
