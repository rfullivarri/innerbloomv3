(() => {
  const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=org.innerbloom.app";
  const APP_STORE_BADGE_URL = "https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg";
  const GOOGLE_PLAY_BADGE_URL = "https://play.google.com/intl/en_us/badges/static/images/badges/es_badge_web_generic.png";

  function buildStoreBadges() {
    const wrapper = document.createElement("div");
    wrapper.className = "ib-store-badges";
    wrapper.dataset.storeBadges = "hero";
    wrapper.setAttribute("aria-label", "Descargar Innerbloom");

    const appStore = document.createElement("span");
    appStore.className = "ib-store-badge-disabled ib-store-badge-coming-soon";
    appStore.setAttribute("aria-label", "Innerbloom estará disponible próximamente en App Store");
    appStore.setAttribute("role", "img");

    const appStoreImage = document.createElement("img");
    appStoreImage.className = "ib-store-badge-image";
    appStoreImage.src = APP_STORE_BADGE_URL;
    appStoreImage.alt = "Descargar en el App Store, próximamente";
    appStoreImage.loading = "eager";
    appStoreImage.decoding = "async";
    appStore.appendChild(appStoreImage);

    const googlePlay = document.createElement("a");
    googlePlay.className = "ib-store-badge-link";
    googlePlay.href = GOOGLE_PLAY_URL;
    googlePlay.target = "_blank";
    googlePlay.rel = "noopener noreferrer";
    googlePlay.setAttribute("aria-label", "Descargar Innerbloom en Google Play");
    googlePlay.dataset.analyticsCta = "google_play_download";
    googlePlay.dataset.analyticsLocation = "hero";

    const googlePlayImage = document.createElement("img");
    googlePlayImage.className = "ib-store-badge-image";
    googlePlayImage.src = GOOGLE_PLAY_BADGE_URL;
    googlePlayImage.alt = "Disponible en Google Play";
    googlePlayImage.loading = "eager";
    googlePlayImage.decoding = "async";
    googlePlay.appendChild(googlePlayImage);

    wrapper.append(appStore, googlePlay);
    return wrapper;
  }

  function mountStoreBadges() {
    if (document.querySelector('[data-store-badges="hero"]')) return;

    const heroCopy = document.querySelector(".hero .hero-copy");
    const heroActions = heroCopy?.querySelector(".hero-actions");
    if (!heroCopy || !heroActions) return;

    heroActions.insertAdjacentElement("afterend", buildStoreBadges());
  }

  const observer = new MutationObserver(mountStoreBadges);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountStoreBadges, { once: true });
  } else {
    mountStoreBadges();
  }
})();
