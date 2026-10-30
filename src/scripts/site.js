const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('[data-menu-toggle]');

if (header && menuToggle) {
  menuToggle.addEventListener('click', () => {
    const open = header.getAttribute('data-open') === 'true';
    header.setAttribute('data-open', String(!open));
    menuToggle.setAttribute('aria-expanded', String(!open));
    menuToggle.setAttribute('aria-label', open ? 'Abrir menu' : 'Fechar menu');
  });

  header.querySelectorAll('.nav a').forEach((link) => {
    link.addEventListener('click', () => {
      header.setAttribute('data-open', 'false');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

const filters = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('[data-category]')];

filters.forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.getAttribute('data-filter');
    filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    cards.forEach((card) => {
      card.hidden = value !== 'all' && card.getAttribute('data-category') !== value;
    });
  });
});

const track = document.querySelector('[data-shelf-track]');

if (track) {
  let down = false;
  let moved = false;
  let startX = 0;
  let startScroll = 0;

  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    down = true;
    moved = false;
    startX = event.clientX;
    startScroll = track.scrollLeft;
    track.classList.add('is-dragging');
  });

  track.addEventListener('pointermove', (event) => {
    if (!down) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 6) moved = true;
    track.scrollLeft = startScroll - delta;
  });

  const endDrag = () => {
    down = false;
    track.classList.remove('is-dragging');
  };

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('pointerleave', endDrag);
  track.addEventListener(
    'click',
    (event) => {
      if (!moved) return;
      event.preventDefault();
      moved = false;
    },
    true,
  );

  document.querySelector('[data-shelf-prev]')?.addEventListener('click', () => {
    track.scrollBy({ left: -Math.min(track.clientWidth * 0.8, 520), behavior: 'smooth' });
  });

  document.querySelector('[data-shelf-next]')?.addEventListener('click', () => {
    track.scrollBy({ left: Math.min(track.clientWidth * 0.8, 520), behavior: 'smooth' });
  });
}

const revealItems = [...document.querySelectorAll('[data-reveal]')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );
  revealItems.forEach((item) => {
    item.classList.add('reveal-ready');
    observer.observe(item);
  });
}

document.querySelectorAll('[data-copy-email]').forEach((button) => {
  button.addEventListener('click', async () => {
    const email = button.getAttribute('data-email') ?? '';
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(email);
      button.textContent = 'Copiado';
    } catch {
      button.textContent = email;
    }
    window.setTimeout(() => {
      button.textContent = original;
    }, 2000);
  });
});

document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});
