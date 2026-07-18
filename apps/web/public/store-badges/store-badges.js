(() => {
  const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=org.innerbloom.app";

  const BADGES = {
    es: {
      appStore: "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/es-es?size=250x83",
      googlePlay: "https://play.google.com/intl/en_us/badges/static/images/badges/es_badge_web_generic.png",
      wrapperLabel: "Descargar Innerbloom",
      appStoreLabel: "Innerbloom estará disponible próximamente en App Store",
      appStoreAlt: "Descárgalo en el App Store, próximamente",
      googlePlayLabel: "Descargar Innerbloom en Google Play",
      googlePlayAlt: "Disponible en Google Play",
      comingSoon: "Próximamente",
    },
    en: {
      appStore: "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83",
      googlePlay: "https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png",
      wrapperLabel: "Download Innerbloom",
      appStoreLabel: "Innerbloom will be available soon on the App Store",
      appStoreAlt: "Download on the App Store, coming soon",
      googlePlayLabel: "Download Innerbloom on Google Play",
      googlePlayAlt: "Get it on Google Play",
      comingSoon: "Coming soon",
    },
  };

  function getCurrentLanguage() {
    const activeLabel = document.querySelector(".lang-button-label")?.textContent?.trim().toLowerCase();
    return activeLabel === "en" ? "en" : "es";
  }

  function applyLanguage(wrapper) {
    const language = getCurrentLanguage();
    const copy = BADGES[language];
    const appStore = wrapper.querySelector(".ib-store-badge--app-store");
    const appStoreImage = appStore?.querySelector(".ib-store-badge-image");
    const googlePlay = wrapper.querySelector(".ib-store-badge--google-play");
    const googlePlayImage = googlePlay?.querySelector(".ib-store-badge-image");

    wrapper.dataset.language = language;
    wrapper.setAttribute("aria-label", copy.wrapperLabel);

    if (appStore) {
      appStore.setAttribute("aria-label", copy.appStoreLabel);
      appStore.dataset.comingSoon = copy.comingSoon;
    }
    if (appStoreImage) {
      appStoreImage.src = copy.appStore;
      appStoreImage.alt = copy.appStoreAlt;
    }
    if (googlePlay) googlePlay.setAttribute("aria-label", copy.googlePlayLabel);
    if (googlePlayImage) {
      googlePlayImage.src = copy.googlePlay;
      googlePlayImage.alt = copy.googlePlayAlt;
    }
  }

  function buildStoreBadges() {
    const wrapper = document.createElement("div");
    wrapper.className = "ib-store-badges";
    wrapper.dataset.storeBadges = "hero";

    const appStore = document.createElement("span");
    appStore.className = "ib-store-badge ib-store-badge--app-store ib-store-badge-disabled ib-store-badge-coming-soon";
    appStore.setAttribute("role", "img");

    const appStoreImage = document.createElement("img");
    appStoreImage.className = "ib-store-badge-image";
    appStoreImage.loading = "eager";
    appStoreImage.decoding = "async";
    appStore.appendChild(appStoreImage);

    const googlePlay = document.createElement("a");
    googlePlay.className = "ib-store-badge ib-store-badge--google-play ib-store-badge-link";
    googlePlay.href = GOOGLE_PLAY_URL;
    googlePlay.target = "_blank";
    googlePlay.rel = "noopener noreferrer";
    googlePlay.dataset.analyticsCta = "google_play_download";
    googlePlay.dataset.analyticsLocation = "hero";

    const googlePlayImage = document.createElement("img");
    googlePlayImage.className = "ib-store-badge-image";
    googlePlayImage.loading = "eager";
    googlePlayImage.decoding = "async";
    googlePlay.appendChild(googlePlayImage);

    wrapper.append(appStore, googlePlay);
    applyLanguage(wrapper);
    return wrapper;
  }

  function mountStoreBadges() {
    const heroCopy = document.querySelector(".hero .hero-copy");
    const heroNote = heroCopy?.querySelector(".hero-cta-note");
    if (!heroCopy || !heroNote) return;

    let badges = document.querySelector('[data-store-badges="hero"]');
    if (!badges) {
      badges = buildStoreBadges();
      heroNote.insertAdjacentElement("afterend", badges);
    } else {
      applyLanguage(badges);
    }
  }

  const observer = new MutationObserver(mountStoreBadges);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountStoreBadges, { once: true });
  } else {
    mountStoreBadges();
  }
})();