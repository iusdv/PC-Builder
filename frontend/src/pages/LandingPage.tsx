import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

function usePrefersReducedMotion() {
  return useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
}

type LandingImageProps = {
  sources: string[];
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
};

function LandingImage({ sources, alt, className, loading = 'lazy' }: LandingImageProps) {
  const [broken, setBroken] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);

  const src = sources[sourceIndex] ?? '';

  if (broken) {
    return (
      <div
        aria-label={alt}
        className={[
          'landing-image landing-image-fallback',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onLoad={() => {
        // If ScrollTrigger is active, image loading can affect layout measurements.
        try {
          ScrollTrigger.refresh();
        } catch {
          // ignore
        }
      }}
      onError={() => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((i) => Math.min(i + 1, sources.length - 1));
          return;
        }

        setBroken(true);
      }}
      className={['landing-image', className].filter(Boolean).join(' ')}
    />
  );
}

export default function LandingPage() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const navigate = useNavigate();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const globalScrollHintRef = useRef<HTMLDivElement | null>(null);

  const sectionsRef = useRef<Array<HTMLElement | null>>([]);
  sectionsRef.current = [];

  const images = useMemo(
    () => [
      {
        // front
        sources: ['/landing/WhitePCfront.jpeg'],
        alt: 'Front view of the white PC build',
      },
      {
        // frontside
        sources: ['/landing/WhitePCfrontside.jpeg'],
        alt: 'Front-side view of the white PC build',
      },
      {
        // backside
        sources: ['/landing/WhitePCbacksidejpeg.jpeg'],
        alt: 'Back-side view of the white PC build',
      },
      {
        // back
        sources: ['/landing/WhitePCback.jpeg'],
        alt: 'Back view of the white PC build',
      },
    ],
    [],
  );

  useLayoutEffect(() => {
    if (prefersReducedMotion) return;
    if (!rootRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    // Normalizes wheel/touch scrolling so scroll triggers don't "hang" depending on cursor position.
    const normalizer = (ScrollTrigger as any).normalizeScroll?.(true);

    const ctx = gsap.context(() => {
      const hero = heroRef.current;
      if (!hero) return;

      const globalHint = globalScrollHintRef.current;
      if (globalHint) {
        gsap.set(globalHint, { opacity: 0, y: 8, scale: 0.985 });
        gsap.to(globalHint, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power2.out', delay: 0.5 });
      }

      const heroTitle = hero.querySelector('[data-hero-title]');
      const heroSub = hero.querySelector('[data-hero-sub]');
      const heroCtas = hero.querySelector('[data-hero-ctas]');
      const heroArt = hero.querySelector('[data-hero-art]');

      gsap.set([heroTitle, heroSub, heroCtas], { opacity: 0, y: 14 });
      gsap.set(heroArt, { opacity: 0, y: 20, rotate: -0.4, scale: 0.98 });

      gsap
        .timeline({ defaults: { ease: 'power2.out' } })
        .to(heroTitle, { opacity: 1, y: 0, duration: 0.8 })
        .to(heroSub, { opacity: 1, y: 0, duration: 0.7 }, '-=0.45')
        .to(heroCtas, { opacity: 1, y: 0, duration: 0.65 }, '-=0.45')
        .to(heroArt, { opacity: 1, y: 0, duration: 0.9, rotate: 0, scale: 1 }, '-=0.65');

      ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: '+=110%',
        pin: true,
        pinSpacing: true,
        scrub: 0.8,
        animation: gsap
          .timeline()
          .to(heroArt, { y: -18, scale: 1.02, ease: 'none' }, 0)
          .to(heroTitle, { y: -8, ease: 'none' }, 0)
          .to(heroSub, { opacity: 0.82, ease: 'none' }, 0),
      });

      const sections = sectionsRef.current.filter(Boolean) as HTMLElement[];
      for (const section of sections) {
        const title = section.querySelector('[data-section-title]');
        const body = section.querySelector('[data-section-body]');
        const art = section.querySelector('[data-section-art]');

        gsap.set([title, body], { opacity: 0, y: 18 });
        gsap.set(art, { opacity: 0, y: 22, scale: 0.985 });

        gsap
          .timeline({
            scrollTrigger: {
              trigger: section,
              start: 'top 72%',
              end: 'bottom 52%',
              scrub: 0.6,
            },
          })
          .to(title, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 0)
          .to(body, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 0.1)
          .to(art, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 0.05);
      }

      const final = rootRef.current?.querySelector('[data-final]') as HTMLElement | null;
      if (final) {
        const cta = final.querySelector('[data-final-cta]');
        gsap.set(cta, { opacity: 0, y: 16, scale: 0.99 });

        gsap
          .timeline({
            scrollTrigger: {
              trigger: final,
              start: 'top 70%',
              end: 'bottom bottom',
              scrub: 0.55,
            },
          })
          .to(cta, { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: 'power2.out' });

        if (globalHint) {
          ScrollTrigger.create({
            trigger: final,
            start: 'top 70%',
            onEnter: () => gsap.to(globalHint, { opacity: 0, y: 10, duration: 0.35, ease: 'power2.out' }),
            onLeaveBack: () => gsap.to(globalHint, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }),
          });
        }
      }
    }, rootRef);

    return () => {
      try {
        normalizer?.kill?.();
      } catch {
        // ignore
      }
      ctx.revert();
    };
  }, [prefersReducedMotion]);

  return (
    <div ref={rootRef} className="landing-root">
      <div className="landing-bg" aria-hidden="true" />
      <div className="landing-vignette" aria-hidden="true" />
      <div className="landing-pattern" aria-hidden="true" />

      <div ref={globalScrollHintRef} className="landing-global-scrollhint" aria-hidden="true">
        <span className="landing-global-dot" />
        <span className="landing-global-text">Scroll</span>
        <span className="landing-global-chevron" />
      </div>

      <header ref={heroRef} className="landing-hero">
        <div className="landing-container landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-pill">Mix. Match. Build.</div>
            <h1 data-hero-title className="landing-title">
              Build your dream setup.
            </h1>
            <p data-hero-sub className="landing-subtitle">
              Pick parts that fit, stay within budget, and share builds with a simple link.
            </p>

            <div data-hero-ctas className="landing-ctas">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/builder')}
              >
                Start building
              </button>
              <Link to="/select/cpu" className="btn btn-secondary">
                Browse parts
              </Link>
              <div className="landing-scrollhint" aria-hidden="true">
                <span className="landing-dot" />
                Scroll
              </div>
            </div>
          </div>

          <div data-hero-art className="landing-hero-art">
            <div className="landing-frame">
              <LandingImage sources={images[0].sources} alt={images[0].alt} loading="eager" />
              <div className="landing-glow" aria-hidden="true" />
            </div>
          </div>
        </div>
      </header>

      <main>
        <section
          ref={(el) => {
            sectionsRef.current.push(el);
          }}
          className="landing-section"
        >
          <div className="landing-container landing-section-grid">
            <div>
              <h2 data-section-title className="landing-h2">
                Pick and choose with confidence.
              </h2>
              <p data-section-body className="landing-p">
                Browse by category, compare prices, and keep everything organized in one build.
              </p>

              <div className="landing-feature-grid" aria-hidden="true">
                <div className="landing-feature">
                  <div className="landing-feature-title">Compatibility</div>
                  <div className="landing-feature-body">Surface issues early.</div>
                </div>
                <div className="landing-feature">
                  <div className="landing-feature-title">Budget</div>
                  <div className="landing-feature-body">Track totals as you go.</div>
                </div>
                <div className="landing-feature">
                  <div className="landing-feature-title">Share</div>
                  <div className="landing-feature-body">Send a clean build link.</div>
                </div>
              </div>
            </div>

            <div data-section-art className="landing-frame">
              <LandingImage sources={images[1].sources} alt={images[1].alt} />
              <div className="landing-glow" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section
          ref={(el) => {
            sectionsRef.current.push(el);
          }}
          className="landing-section"
        >
          <div className="landing-container landing-section-grid landing-section-grid-rev">
            <div>
              <h2 data-section-title className="landing-h2">
                Make it yours.
              </h2>
              <p data-section-body className="landing-p">
                From clean minimal builds to full RGB showcases — mix and match parts until it feels right.
              </p>

              <div className="landing-mini-list">
                <div className="landing-mini">CPU • GPU • Motherboard</div>
                <div className="landing-mini">Case • Cooling • Storage</div>
                <div className="landing-mini">RAM • PSU • Extras</div>
              </div>
            </div>

            <div data-section-art className="landing-frame">
              <LandingImage sources={images[3].sources} alt={images[3].alt} />
              <div className="landing-glow" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section
          ref={(el) => {
            sectionsRef.current.push(el);
          }}
          className="landing-section"
        >
          <div className="landing-container landing-section-grid">
            <div>
              <h2 data-section-title className="landing-h2">
                Clean cables. Clean plan.
              </h2>
              <p data-section-body className="landing-p">
                Save the builds you love and come back later — no clutter, just the setups that matter.
              </p>
            </div>

            <div data-section-art className="landing-frame">
              <LandingImage sources={images[2].sources} alt={images[2].alt} />
              <div className="landing-glow" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section data-final className="landing-final">
          <div className="landing-container">
            <div data-final-cta className="landing-final-card">
              <div className="landing-pill">Ready?</div>
              <h2 className="landing-h2" style={{ marginTop: 10 }}>
                Start building your PC.
              </h2>
              <p className="landing-p">
                Jump straight into the builder and assemble a setup you’re proud of.
              </p>

              <div className="landing-final-actions">
                <button className="btn btn-primary" onClick={() => navigate('/builder')}>
                  Start building your PC
                </button>
                <Link to="/select/cpu" className="btn btn-secondary">
                  Browse parts
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-row">
          <div className="text-sm" style={{ color: 'var(--muted)' }}>
            PC Builder
          </div>
        </div>
      </footer>
    </div>
  );
}
