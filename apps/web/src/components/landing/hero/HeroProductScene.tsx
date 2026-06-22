import { mobilePremiumThemeVars } from "../../../pages/labs/mobile-premium/mobilePremiumTokens";
import type { Language } from "../../../content/officialLandingContent";
import { HeroAnimationController } from "./HeroAnimationController";
import { HeroDashboardPreview } from "./HeroDashboardPreview";
import { MarketingPhoneFrame } from "./MarketingPhoneFrame";
import { HeroSplashScreen } from "./HeroSplashScreen";
import { EmotionChartPreviewCard } from "./previews/RhythmPreviewCard";
import { TaskDetailPreview } from "./previews/TaskDetailPreview";
import { TaskSummaryPreview } from "./previews/TaskSummaryPreview";
import styles from "./HeroProductScene.module.css";

export function HeroProductScene({ language = "es" }: { language?: Language }) {
  return (
    <HeroAnimationController>
      {({ phase, cycle, reducedMotion }) => (
        <div className={`${styles.scene} ${styles.loopScene}`} data-loop-phase={phase} data-reduced-motion={reducedMotion ? "true" : undefined} style={mobilePremiumThemeVars.dark}>
          <div className={styles.sceneGlow} aria-hidden="true" />
          <div className={`${styles.sceneLayer} ${styles.sceneLayerRhythm}`} key={`rhythm-${cycle}`}>
            <EmotionChartPreviewCard language={language} />
          </div>
          <div className={styles.phoneLayer} key={`phone-${cycle}`}>
            <MarketingPhoneFrame>
              <div className={styles.phoneScreenStack}>
                <HeroDashboardPreview language={language} />
                <HeroSplashScreen />
              </div>
            </MarketingPhoneFrame>
          </div>
          <div className={`${styles.sceneLayer} ${styles.sceneLayerSummary}`} key={`summary-${cycle}`}>
            <TaskSummaryPreview language={language} />
          </div>
          <div className={`${styles.sceneLayer} ${styles.sceneLayerDetail}`} key={`detail-${cycle}`}>
            <TaskDetailPreview language={language} />
          </div>
        </div>
      )}
    </HeroAnimationController>
  );
}
