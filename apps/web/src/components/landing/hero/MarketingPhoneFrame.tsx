import type { ReactNode } from "react";

import styles from "./HeroProductScene.module.css";

export function MarketingPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.phoneFrame} aria-label="Dashboard de Innerbloom 2.0">
      <div className={styles.phoneIsland} aria-hidden="true">
        <span />
      </div>
      <div className={styles.phoneScreen}>{children}</div>
    </div>
  );
}
