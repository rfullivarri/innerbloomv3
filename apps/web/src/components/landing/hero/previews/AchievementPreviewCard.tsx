import { HabitAchievementSeal } from "../../../dashboard-v3/HabitAchievementSeal";
import styles from "../HeroProductScene.module.css";

export function AchievementPreviewCard() {
  return (
    <article className={`${styles.floatingCard} ${styles.achievementCard}`} aria-label="Carrusel de logros">
      <div className={styles.cardHeader}>
        <p className={styles.cardTitle}>Logros</p>
        <span>Ver todos</span>
      </div>
      <div className={styles.achievementShelf}>
        <span className={styles.achievementGhost} aria-hidden="true" />
        <div className={styles.achievementMain}>
          <HabitAchievementSeal
            alt="Sello de logro de hidratación"
            className={styles.achievementSeal}
            fallback={<span className={styles.achievementFallback} />}
            imgClassName={styles.achievementImage}
            pillar="Body"
            traitCode="HIDRATACION"
            traitName="Hidratación"
          />
          <strong>2L de agua</strong>
          <span>Hydration · Achieved</span>
        </div>
        <span className={styles.achievementGhost} aria-hidden="true" />
      </div>
    </article>
  );
}
