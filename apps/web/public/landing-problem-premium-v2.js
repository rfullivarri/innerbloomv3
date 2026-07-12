(function () {
  const selector = '.landing.landing--v3-conversion .truth-problem-adaptive-graphic';
  const copy = {
    es: {
      analyze: 'ANALIZA',
      analyzeBody: 'Entiende tu estado real sin juzgarte.',
      recalibrate: 'RECALIBRA',
      recalibrateBody: 'Ajusta el plan a tu energía disponible.',
      propel: 'TE IMPULSA',
      propelBody: 'Te acompaña para que avances más allá.',
      aria: 'Cómo actúa Innerbloom'
    },
    en: {
      analyze: 'ANALYZE',
      analyzeBody: 'Understands your real state without judgment.',
      recalibrate: 'RECALIBRATE',
      recalibrateBody: 'Adjusts the plan to your available energy.',
      propel: 'PROPEL',
      propelBody: 'Helps you move beyond the setback.',
      aria: 'How Innerbloom acts'
    }
  };

  function getLanguage(host) {
    const htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (htmlLang.startsWith('es')) return 'es';
    if (htmlLang.startsWith('en')) return 'en';

    const landing = host.closest('.landing');
    const landingLang = (landing?.getAttribute('lang') || landing?.getAttribute('data-language') || '').toLowerCase();
    if (landingLang.startsWith('es')) return 'es';
    if (landingLang.startsWith('en')) return 'en';

    const pageText = document.body.textContent || '';
    if (/\bLog in\b|Create account|The main problem|You do not need/i.test(pageText)) return 'en';
    if (/\bIniciar sesión\b|Crear cuenta|El problema principal|No te falta/i.test(pageText)) return 'es';

    const graphicText = host.textContent || '';
    return /rutina rígida|sistema adaptativo|vuelves/i.test(graphicText) ? 'es' : 'en';
  }

  function ensurePremiumArrowhead(svg) {
    if (svg.querySelector('.ib-premium-arrowhead')) return;

    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    arrow.setAttribute('class', 'ib-premium-arrowhead');
    arrow.setAttribute('transform', 'translate(800 302) rotate(-34)');
    arrow.setAttribute('aria-hidden', 'true');

    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glow.setAttribute('class', 'ib-premium-arrowhead__glow');
    glow.setAttribute('d', 'M-18 0 H6');

    const head = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    head.setAttribute('class', 'ib-premium-arrowhead__shape');
    head.setAttribute('d', 'M-2 -8 L13 0 L-2 8 Z');

    arrow.appendChild(glow);
    arrow.appendChild(head);
    svg.appendChild(arrow);
  }

  function reshapeCurves(svg) {
    const paths = Array.from(svg.querySelectorAll('path[d]'));
    paths.forEach((path) => {
      path.removeAttribute('marker-end');
      path.removeAttribute('markerEnd');

      const d = path.getAttribute('d') || '';
      if (d.includes('M90 120 H260') && d.includes('C575 210 580 176 650 176')) {
        path.setAttribute('d', d
          .replace('C575 210 580 176 650 176', 'C575 210 590 192 650 192')
          .replace('C710 178 742 230 800 260', 'C710 194 748 228 800 260'));
      }
      if (d === 'M520 210 C575 210 580 176 650 176') {
        path.setAttribute('d', 'M520 210 C575 210 590 192 650 192');
      }
      if (d === 'M650 176 C710 178 742 230 800 260') {
        path.setAttribute('d', 'M650 192 C710 194 748 228 800 260');
      }
    });

    const retryNode = svg.querySelector('g[transform="translate(650 176)"]');
    if (retryNode) retryNode.setAttribute('transform', 'translate(650 192)');
    const retryLabel = svg.querySelector('g[transform="translate(662 126)"]');
    if (retryLabel) retryLabel.setAttribute('transform', 'translate(662 142)');
  }

  function hideLegacyCallouts(svg) {
    ['translate(356 474)', 'translate(514 470)', 'translate(690 452)', 'translate(802 294)']
      .forEach((transform) => {
        const group = svg.querySelector(`g[transform="${transform}"]`);
        if (group) group.classList.add('ib-premium-hidden-callout');
      });
  }

  function processMarkup(c) {
    return `
      <div class="ib-problem-process__step ib-problem-process__step--analyze">
        <span class="ib-problem-process__icon" aria-hidden="true">⌕</span>
        <strong>${c.analyze}</strong>
        <p>${c.analyzeBody}</p>
      </div>
      <span class="ib-problem-process__connector" aria-hidden="true"></span>
      <div class="ib-problem-process__step ib-problem-process__step--recalibrate">
        <span class="ib-problem-process__icon" aria-hidden="true">≋</span>
        <strong>${c.recalibrate}</strong>
        <p>${c.recalibrateBody}</p>
      </div>
      <span class="ib-problem-process__connector ib-problem-process__connector--green" aria-hidden="true"></span>
      <div class="ib-problem-process__step ib-problem-process__step--propel">
        <span class="ib-problem-process__icon" aria-hidden="true">↗</span>
        <strong>${c.propel}</strong>
        <p>${c.propelBody}</p>
      </div>`;
  }

  function syncProcess(root, language) {
    const c = copy[language];
    let panel = root.querySelector('.ib-problem-process');

    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'ib-problem-process';
      root.appendChild(panel);
    }

    if (panel.getAttribute('data-language') !== language) {
      panel.setAttribute('data-language', language);
      panel.setAttribute('aria-label', c.aria);
      panel.innerHTML = processMarkup(c);
    }
  }

  function enhance() {
    document.querySelectorAll(selector).forEach((host) => {
      const root = host.firstElementChild;
      const svg = host.querySelector('svg');
      if (!root || !svg) return;
      reshapeCurves(svg);
      hideLegacyCallouts(svg);
      ensurePremiumArrowhead(svg);
      syncProcess(root, getLanguage(host));
      root.classList.add('ib-problem-premium-ready');
    });
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhance();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-phase', 'lang', 'data-language']
  });
  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  schedule();
})();