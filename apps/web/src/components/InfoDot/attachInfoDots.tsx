import { createRoot, type Root } from 'react-dom/client';
import { InfoDot, type InfoDotPlacement } from './InfoDot';
import { infoTips, type InfoKey } from '../../content/infoTips';
import './InfoDot.css';

type DotEntry = {
  root: Root;
  mount: HTMLElement;
};

const registry = new WeakMap<HTMLElement, DotEntry>();

function isPlacement(value: unknown): value is InfoDotPlacement {
  return value === 'top' || value === 'bottom' || value === 'left' || value === 'right';
}

function isInfoKey(value: string | null | undefined): value is InfoKey {
  return Boolean(value && value in infoTips);
}

function collectHosts(target?: ParentNode): HTMLElement[] {
  const hosts: HTMLElement[] = [];

  if (typeof document === 'undefined') {
    return hosts;
  }

  if (!target) {
    document.querySelectorAll<HTMLElement>('[data-info]').forEach((element) => hosts.push(element));
    return hosts;
  }

  if (target instanceof HTMLElement && target.dataset.info) {
    hosts.push(target);
  }

  if ('querySelectorAll' in target) {
    target.querySelectorAll<HTMLElement>('[data-info]').forEach((element) => {
      if (!hosts.includes(element)) {
        hosts.push(element);
      }
    });
  }

  return hosts;
}

export function attachInfoDots(target?: ParentNode) {
  if (typeof window === 'undefined') {
    return;
  }

  const hosts = collectHosts(target);

  hosts.forEach((element) => {
    const key = element.dataset.info;
    if (!isInfoKey(key)) {
      return;
    }

    const placementAttr = element.dataset.infoPlacement ?? element.dataset.infoPos;
    const placement = isPlacement(placementAttr) ? placementAttr : undefined;

    const existing = registry.get(element);

    if (existing) {
      existing.root.render(<InfoDot id={key} placement={placement} />);
      return;
    }

    const mount = document.createElement('span');
    mount.className = 'info-dot__mount';

    if (placement === 'left') {
      element.insertBefore(mount, element.firstChild);
    } else {
      element.appendChild(mount);
    }

    const root = createRoot(mount);
    root.render(<InfoDot id={key} placement={placement} />);
    registry.set(element, { root, mount });
  });
}
