import styles from "./page.module.css";

export default function Loading() {
  return (
    <main className={styles.main} aria-busy="true">
      <h1>Loading forecast&hellip;</h1>
      <div className={styles.slots} aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={`${styles.slot} ${styles.skeleton}`} />
        ))}
      </div>
    </main>
  );
}
