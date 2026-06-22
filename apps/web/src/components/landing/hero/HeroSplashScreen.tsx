import type { CSSProperties } from "react";
import styles from "./HeroProductScene.module.css";

const SPLASH_WORDMARK = "INNERBLOOM";

export function HeroSplashScreen() {
  return (
    <div className={styles.splashScreen} aria-hidden="true">
      <div className={styles.splashGlow} />
      <div className={styles.splashBrand}>
        <img src="/innerbloom-flower-logo.png" alt="" />
        <div className={styles.splashWordmark}>
          {SPLASH_WORDMARK.split("").map((letter, index) => (
            <span key={`${letter}-${index}`} style={{ "--letter-index": index } as CSSProperties}>
              {letter}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
