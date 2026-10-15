"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { featuredWork, heroCards, moreWork, projectDescriptions } from "../data/portfolio";

function splitWords(text) {
  return text.split(" ").map((word, index, words) => ({
    word,
    hasSpace: index < words.length - 1,
  }));
}

function createSpring(stiffness = 0.05, damping = 0.8) {
  return {
    current: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    update(delta = 1) {
      for (const axis of ["x", "y"]) {
        let force = this.target[axis] - this.current[axis];
        force *= stiffness;
        force *= delta;
        this.velocity[axis] *= damping;
        this.velocity[axis] += force;
        this.current[axis] += this.velocity[axis];
        this.current[axis] = Math.round(this.current[axis] * 100) / 100;
      }
    },
  };
}

const slugFromHref = (href) => href.replace(/^\//, "").toLowerCase();

const projectDetailItems = [...featuredWork, ...moreWork].map((project) => ({
  title: project.detailTitle ?? project.title,
  href: project.href,
  slug: slugFromHref(project.href),
  description: project.detailDescription ?? project.description ?? projectDescriptions[project.title] ?? "EditMaktab uchun tayyorlanadigan video montaj yo'nalishi.",
  media: project.media?.length ? project.media : project.items?.length ? project.items.map((item) => item.src) : [project.src],
}));

const findProjectBySlug = (slug) => {
  if (!slug) return null;
  const normalized = String(slug).toLowerCase();
  return projectDetailItems.find((project) => project.slug === normalized) ?? null;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mapRange = (value, inMin, inMax, outMin, outMax, shouldClamp = false) => {
  const input = shouldClamp ? clamp(value, inMin, inMax) : value;
  return ((input - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
};
const lerp = (from, to, amount) => from * (1 - amount) + to * amount;
const damp = (from, to, amount, delta) => lerp(from, to, 1 - Math.exp(-0.9 * delta));

function useInView(ref, threshold = 0) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, { threshold });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return inView;
}


const isVideoSrc = (src) => /\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(src);

function imageDimensions(src, fallback = 620) {
  const match = src.match(/-(\d+)x(\d+)\.[a-z0-9]+(?:\?|$)/i);
  if (!match) return { width: fallback, height: fallback };
  return { width: Number(match[1]), height: Number(match[2]) };
}

function InlineVideo({ src, className, detail = false, width, height }) {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [isReady, setIsReady] = useState(!detail);

  const play = () => {
    const video = videoRef.current;
    if (!video) return;
    const request = video.play();
    if (request?.catch) request.catch(() => setPaused(true));
  };

  const toggle = () => {
    const video = videoRef.current;
    if (!video || !detail || !isReady) return;

    if (video.paused) {
      setPaused(false);
      play();
    } else {
      video.pause();
      setPaused(true);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (detail) {
      video.muted = false;
      video.volume = 1;
      return undefined;
    }

    video.muted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [detail, src]);

  const markReady = () => {
    if (!detail) return;
    setIsReady(true);
    setPaused(false);
    play();
  };

  const video = (
    <video
      ref={videoRef}
      className={className}
      src={src}
      width={width}
      height={height}
      autoPlay={!detail}
      muted={!detail}
      loop={!detail}
      playsInline
      preload={detail ? "auto" : "metadata"}
      controls={false}
      data-paused={paused}
      data-ready={isReady}
      onClick={detail ? toggle : undefined}
      onLoadStart={detail ? () => setIsReady(false) : undefined}
      onCanPlay={detail ? markReady : undefined}
      onPlaying={detail ? () => setIsReady(true) : undefined}
      onWaiting={detail ? () => setIsReady(false) : undefined}
      aria-label={detail ? "Videoni pauza yoki davom ettirish" : undefined}
    />
  );

  if (!detail) return video;

  return (
    <>
      {video}
      <span className={styles.videoLoadingIndicator} data-hidden={isReady} aria-hidden="true">
        <span />
      </span>
    </>
  );
}

function MediaVisual({ src, className, width, height, priority = false, loading = "lazy", detail = false }) {
  if (isVideoSrc(src)) {
    return <InlineVideo src={src} className={className} detail={detail} width={width} height={height} />;
  }

  return (
    <Image
      src={src}
      alt=""
      width={width}
      height={height}
      className={className}
      priority={priority}
      loading={priority ? undefined : loading}
      unoptimized
      draggable={false}
    />
  );
}

function TextBlock({ title, description }) {
  return (
    <div className={styles.textBlock}>
      <h4 className={styles.textBlockTitle}>{title}</h4>
      <p className={styles.textBlockDescription}>{description}</p>
    </div>
  );
}

function FeaturedCarousel({ openProject }) {
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const slideMetrics = useRef({ rootWidth: 300, slideWidth: 100, step: 116, totalWidth: featuredWork.length * 116 });
  const slides = useRef(featuredWork.map((item, index) => ({ item, originalOffset: index * 116, offset: 0 })));
  const pointer = useRef({ isDown: false, didDrag: false, x: 0, y: 0, movementX: 0, startX: 0, startY: 0, startTime: 0 });
  const velocityRef = useRef(0);
  const offsetRef = useRef(0);
  const didInitCarousel = useRef(false);
  const frameRef = useRef(0);
  const [state, setState] = useState({ offset: 0, slideOffsets: featuredWork.map(() => 0), slideWidth: 100, centerPadding: 100 });
  const inView = useInView(rootRef, 0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;

    const updateMetrics = () => {
      const firstSlide = track.children[0];
      const slideWidth = firstSlide ? firstSlide.clientWidth : 100;
      const rootWidth = root.clientWidth || 300;
      const step = slideWidth + 16;
      const totalWidth = Math.max(step * featuredWork.length, step);
      const previousMetrics = slideMetrics.current;
      const previousCenterPadding = (previousMetrics.rootWidth - previousMetrics.slideWidth) * 0.5;
      const centerPadding = (rootWidth - slideWidth) * 0.5;

      if (!didInitCarousel.current) {
        offsetRef.current = -centerPadding;
        didInitCarousel.current = true;
      } else if (previousMetrics.step) {
        const centeredIndex = Math.round((offsetRef.current + previousCenterPadding) / previousMetrics.step);
        offsetRef.current = centeredIndex * step - centerPadding;
      }

      slideMetrics.current = { rootWidth, slideWidth, step, totalWidth };
      slides.current.forEach((slide, index) => {
        slide.originalOffset = step * index;
      });

      const centerOffset = offsetRef.current + centerPadding;
      const nextSlideOffsets = slides.current.map((slide) => {
        const wrapOffset = Math.round((centerOffset - slide.originalOffset) / totalWidth) * totalWidth;
        slide.offset = Number.isFinite(wrapOffset) ? wrapOffset : 0;
        return slide.offset;
      });

      setState({
        offset: offsetRef.current,
        slideOffsets: nextSlideOffsets,
        slideWidth,
        centerPadding,
      });
    };

    updateMetrics();
    const resizeObserver = new ResizeObserver(updateMetrics);
    resizeObserver.observe(root);
    resizeObserver.observe(track);
    window.addEventListener("resize", updateMetrics);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !inView) return;

    const animate = () => {
      const metrics = slideMetrics.current;
      const pointerState = pointer.current;

      if (pointerState.isDown) velocityRef.current = pointerState.movementX;

      velocityRef.current *= 0.85;
      offsetRef.current -= velocityRef.current;

      const centerOffset = offsetRef.current + (metrics.rootWidth - metrics.slideWidth) * 0.5;
      const nextSlideOffsets = slides.current.map((slide) => {
        const wrapOffset = Math.round((centerOffset - slide.originalOffset) / metrics.totalWidth) * metrics.totalWidth;
        slide.offset = Number.isFinite(wrapOffset) ? wrapOffset : 0;
        return slide.offset;
      });

      setState({
        offset: offsetRef.current,
        slideOffsets: nextSlideOffsets,
        slideWidth: metrics.slideWidth,
        centerPadding: (metrics.rootWidth - metrics.slideWidth) * 0.5,
      });

      pointerState.movementX = 0;
      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [inView]);

  const settle = () => {
    const metrics = slideMetrics.current;
    const centerPadding = (metrics.rootWidth - metrics.slideWidth) * 0.5;
    velocityRef.current *= 2;
    const projected = offsetRef.current + centerPadding - (velocityRef.current * 0.85) / (1 - 0.85);
    const target = Math.round(projected / metrics.step) * metrics.step - centerPadding;
    velocityRef.current = (target - offsetRef.current) * (1 - 0.85) * (1 / 0.85) * -1;
  };

  const nudge = (direction) => {
    const metrics = slideMetrics.current;
    const centerPadding = (metrics.rootWidth - metrics.slideWidth) * 0.5;
    const target = (Math.round((offsetRef.current + centerPadding) / metrics.step) + direction) * metrics.step - centerPadding;
    velocityRef.current = (target - offsetRef.current) * (1 - 0.85) * (1 / 0.85) * -1;
  };

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointer.current.isDown = true;
    pointer.current.didDrag = false;
    pointer.current.x = event.clientX;
    pointer.current.y = event.clientY;
    pointer.current.startX = event.clientX;
    pointer.current.startY = event.clientY;
    pointer.current.startTime = performance.now();
    pointer.current.movementX = 0;
  };

  const onPointerMove = (event) => {
    if (!pointer.current.isDown) return;
    const movementX = event.clientX - pointer.current.x;
    const totalMove = Math.hypot(event.clientX - pointer.current.startX, event.clientY - pointer.current.startY);
    pointer.current.movementX = movementX;
    pointer.current.didDrag = pointer.current.didDrag || totalMove > 8;
    pointer.current.x = event.clientX;
    pointer.current.y = event.clientY;
  };

  const onPointerUp = (event) => {
    if (!pointer.current.isDown) return;
    pointer.current.isDown = false;
    const elapsed = performance.now() - pointer.current.startTime;
    const moved = Math.hypot(event.clientX - pointer.current.startX, event.clientY - pointer.current.startY);

    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (elapsed < 100 && moved < 10) {
      const width = window.innerWidth;
      const direction = event.clientX > width * 0.75 ? 1 : event.clientX < width * 0.25 ? -1 : 0;
      nudge(direction);
      return;
    }

    settle();
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.carousel} ${styles.carouselCurve}`}
      data-inview={inView}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        "--carousel-gap": 16,
        "--carousel-offset": state.offset,
        "--slide-width": state.slideWidth,
        "--center-padding": state.centerPadding,
      }}
    >
      <div ref={trackRef} className={styles.carouselTrack}>
        {featuredWork.map((item, index) => (
          <div
            key={item.href}
            className={styles.carouselSlide}
            style={{ "--slide-offset": state.slideOffsets[index] ?? 0, "--slide-idx": index }}
          >
            <span className={styles.carouselMediaClip}>
              <MediaVisual
                src={item.src}
                width={item.width ?? imageDimensions(item.src, 720).width}
                height={item.height ?? imageDimensions(item.src, 720).height}
                className={styles.carouselImage}
              />
            </span>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                if (pointer.current.didDrag) return;
                openProject(item.href);
              }}
            >
              {item.title}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, openProject }) {
  const ref = useRef(null);
  const inView = useInView(ref, 0);

  const visibleItems = project.items.length > 1 ? project.items.slice(0, 2).reverse() : project.items.slice(0, 1);

  return (
    <button
      type="button"
      ref={ref}
      onClick={() => openProject(project.href)}
      className={styles.project}
      aria-label={project.title}
      data-inview={inView}
      data-stack-count={Math.min(project.items.length, 2)}
    >
      {visibleItems.map((item, index) => (
        <div
          key={`${project.title}-${index}`}
          className={styles.projectImage}
          style={{
            "--rotation": item.rotation,
            "--posX": item.posX,
            "--posY": item.posY,
          }}
        >
          <div className={styles.projectMedia}>
            <div className={styles.projectShadow} />
            <MediaVisual
              src={item.src}
              width={item.width ?? imageDimensions(item.src).width}
              height={item.height ?? imageDimensions(item.src).height}
              className={styles.projectImg}
            />
          </div>
        </div>
      ))}
    </button>
  );
}

function ProjectPageOverlay({ project, closeProject }) {
  const titleWords = useMemo(() => splitWords(project?.title ?? ""), [project?.title]);

  useEffect(() => {
    if (!project) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeProject();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [project, closeProject]);

  if (!project) return null;

  const onBackdropClick = (event) => {
    if (!event.target.closest(`.${styles.projectPageModal}`)) closeProject();
  };

  return (
    <div className={styles.projectPage} onClick={onBackdropClick}>
      <div className={styles.projectPageModal} data-media-count={project.media.length}>
        <div className={styles.projectPageHeader}>
          <button type="button" className={`${styles.button} ${styles.modalCloseButton}`} onClick={closeProject} aria-label="Yopish">
            ×
          </button>
        </div>

        <div className={styles.projectPageMain}>
          <div className={styles.projectPageHead}>
            <h2 className={`${styles.projectPageTitle} ${styles.headlineCondensed}`} aria-label={project.title}>
              {titleWords.map(({ word, hasSpace }, index) => (
                <span key={`${word}-${index}`}>
                  <span className={styles.word} style={{ "--delay": index }} aria-hidden>
                    {word}
                  </span>
                  {hasSpace && <span className={styles.space} aria-hidden />}
                </span>
              ))}
            </h2>
            <p className={styles.projectPageDescription}>{project.description}</p>
          </div>

          <div className={styles.projectPageGrid}>
            {project.media.map((src, index) => (
              <div key={`${project.slug}-${index}`} className={styles.projectPageImage}>
                <MediaVisual
                  src={src}
                  width={imageDimensions(src).width}
                  height={imageDimensions(src).height}
                  className={styles.projectPageImg}
                  detail={isVideoSrc(src)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer({ footerRef, footerElementRef, titleRef }) {
  const year = new Date().getFullYear();
  const footerTitleLines = [
    {
      key: "desktop-earning",
      tone: "small",
      visibilityClass: styles.footerTitleDesktopOnly,
      content: (
        <>
          Birinchi <span className={styles.footerAmountAccent}>500$</span> ishlab topish
        </>
      ),
    },
    {
      key: "mobile-earning-start",
      tone: "small",
      visibilityClass: styles.footerTitleMobileOnly,
      content: (
        <>
          Birinchi <span className={styles.footerAmountAccent}>500$</span>
        </>
      ),
    },
    {
      key: "mobile-earning-end",
      tone: "small",
      visibilityClass: styles.footerTitleMobileOnly,
      content: "ishlab topish",
    },
    { key: "roadmap", text: "Yo‘l xaritasini", tone: "small" },
    { key: "cta", text: "oling", tone: "large" },
  ];

  return (
    <>
      <div ref={footerRef} className={styles.intersectionPhantom} />
      <footer ref={footerElementRef} className={styles.footer}>
        <p ref={titleRef} className={styles.footerTitle}>
          {footerTitleLines.map((line) => (
            <span
              key={line.key}
              className={`${styles.footerTitleLine} ${line.tone === "large" ? styles.footerTitleLineLarge : styles.footerTitleLineSmall} ${line.visibilityClass ?? ""}`}
            >
              {line.content ?? line.text}
            </span>
          ))}
        </p>
        <a href="https://telegram.dog/editmaktab500bot?start=auto" target="_blank" rel="noopener noreferrer" className={`${styles.ctaButton} ${styles.footerCta}`}>
          YO‘L XARITASINI OLISH
        </a>
        <small className={styles.footerSubtitle}>All rights reserved {year} EditMaktab</small>
      </footer>
    </>
  );
}

export default function Home({ initialSlug = null } = {}) {
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef(null);
  const heroImageRefs = useRef([]);
  const footerRef = useRef(null);
  const footerElementRef = useRef(null);
  const footerTitleRef = useRef(null);
  const cardsRef = useRef([]);
  const pointerRef = useRef({ x: 0, y: 0, movementX: 0, movementY: 0, hasPosition: false });
  const scrollYRef = useRef(0);
  const smoothFooterYRef = useRef(0);
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const activeProject = useMemo(() => findProjectBySlug(activeSlug), [activeSlug]);

  const titleWords = useMemo(() => splitWords("Videomontaj — 90 kunda"), []);
  const subtitleLines = useMemo(
    () => [
      { key: "desktop-earning", visibilityClass: styles.subtitleDesktopOnly, words: splitWords("Birinchi $500 ishlab topish") },
      { key: "desktop-roadmap", visibilityClass: styles.subtitleDesktopOnly, words: splitWords("Yo‘l xaritasini oling") },
      { key: "compact-earning-start", visibilityClass: styles.subtitleCompactOnly, words: splitWords("Birinchi $500") },
      { key: "compact-earning-end", visibilityClass: styles.subtitleCompactOnly, words: splitWords("ishlab topish") },
      { key: "compact-roadmap", visibilityClass: styles.subtitleCompactOnly, words: splitWords("Yo‘l xaritasini oling") },
    ],
    []
  );

  const openProject = (href) => {
    const slug = slugFromHref(href);
    if (!findProjectBySlug(slug)) return;

    setActiveSlug(slug);
    if (window.location.pathname !== `/${slug}`) {
      window.history.pushState({ projectModal: slug }, "", `/${slug}`);
    }
  };

  const closeProject = () => {
    setActiveSlug(null);
    if (window.location.pathname !== "/") {
      window.history.pushState(null, "", "/");
    }
  };

  useEffect(() => {
    const syncFromLocation = () => {
      const slug = window.location.pathname.replace(/^\//, "").toLowerCase();
      setActiveSlug(findProjectBySlug(slug) ? slug : null);
    };

    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 100);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    cardsRef.current = heroCards.map((card) => {
      const spring = createSpring();
      spring.current.x = spring.target.x = card.offsetX;
      spring.current.y = spring.target.y = card.offsetY;
      window.setTimeout(() => {
        spring.target.x = 0;
        spring.target.y = 0;
      }, 100);

      return { x: 0, y: 0, velocity: { x: 0, y: 0 }, spring };
    });

    const updateCenters = () => {
      const heroRect = heroRef.current?.getBoundingClientRect();

      heroImageRefs.current.forEach((element, index) => {
        if (!element || !cardsRef.current[index]) return;

        const rect = element.getBoundingClientRect();
        const width = rect.width > 2 ? rect.width : element.offsetWidth;
        const height = rect.height > 2 ? rect.height : element.offsetHeight;
        const left = rect.width > 2 ? rect.left : (heroRect?.left ?? 0) + element.offsetLeft;
        const top = rect.height > 2 ? rect.top : (heroRect?.top ?? 0) + element.offsetTop;

        cardsRef.current[index].x = left + width * 0.5;
        cardsRef.current[index].y = top + scrollYRef.current + height * 0.5;
      });
    };

    const setCardVars = (element, card) => {
      element.style.setProperty("--offsetX", card.spring.current.x.toFixed(3));
      element.style.setProperty("--offsetY", card.spring.current.y.toFixed(3));
      element.style.setProperty("--velocity", (card.spring.velocity.x - card.spring.velocity.y).toFixed(5));
    };

    const onPointerMove = (event) => {
      const pointer = pointerRef.current;

      if (!pointer.hasPosition) {
        pointer.hasPosition = true;
        pointer.movementX = 0;
        pointer.movementY = 0;
      } else {
        pointer.movementX = event.clientX - pointer.x;
        pointer.movementY = event.clientY - pointer.y;
      }

      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    let ignorePointerUntil = 0;

    const onScroll = () => {
      scrollYRef.current = window.scrollY;
      ignorePointerUntil = performance.now() + 180;
      pointerRef.current.movementX = 0;
      pointerRef.current.movementY = 0;
      pointerRef.current.hasPosition = false;
      updateCenters();
    };

    let frame = 0;
    let previousTimestamp = 0;
    const animate = (timestamp = 0) => {
      const delta = previousTimestamp > 0 ? ((timestamp - previousTimestamp) * 60) / 1000 : 1;
      previousTimestamp = timestamp;
      const pointer = pointerRef.current;
      const cards = cardsRef.current;

      cards.forEach((card, index) => {
        const velocityDecay = Math.pow(0.9, delta);
        card.velocity.x *= velocityDecay;
        card.velocity.y *= velocityDecay;
        card.spring.current.x += card.velocity.x * delta;
        card.spring.current.y += card.velocity.y * delta;
        card.spring.update(delta);

        const canUsePointer = pointer.hasPosition && timestamp >= ignorePointerUntil;
        const offsetX = canUsePointer ? ((pointer.x - card.x) / window.innerWidth) * 2 : 2;
        const offsetY = canUsePointer ? ((pointer.y + scrollYRef.current - card.y) / window.innerHeight) * 2 : 2;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        const multiplier = canUsePointer ? Math.max(0, Math.pow(1 - distance * 0.72, 6)) * 0.42 : 0;

        card.velocity.x += clamp(pointer.movementX, -80, 80) * multiplier;
        card.velocity.y += clamp(pointer.movementY, -80, 80) * multiplier;
        card.spring.current.x = clamp(card.spring.current.x, -120, 120);
        card.spring.current.y = clamp(card.spring.current.y, -120, 120);

        const element = heroImageRefs.current[index];
        if (element) setCardVars(element, card);
      });

      pointer.movementX = 0;
      pointer.movementY = 0;

      frame = window.requestAnimationFrame(animate);
    };

    updateCenters();
    window.setTimeout(updateCenters, 500);
    window.setTimeout(updateCenters, 1200);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateCenters);
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateCenters);
    };
  }, []);

  useEffect(() => {
    const phantom = footerRef.current;
    const footer = footerElementRef.current;
    const title = footerTitleRef.current;
    if (!phantom || !footer || !title) return;

    let frame = 0;
    let previousTimestamp = 0;
    const animateFooter = (timestamp = 0) => {
      const delta = previousTimestamp > 0 ? ((timestamp - previousTimestamp) * 60) / 1000 : 1;
      previousTimestamp = timestamp;
      const height = window.innerHeight;
      const phantomTop = phantom.offsetTop;
      const scaleStart = phantomTop - height;
      const titleBottom = title.offsetTop + title.clientHeight;

      smoothFooterYRef.current = damp(smoothFooterYRef.current, window.scrollY, 0.9, delta);

      const offsetY = mapRange(smoothFooterYRef.current, scaleStart, phantomTop, height - titleBottom, 0, true);
      const scaleY = mapRange(smoothFooterYRef.current, scaleStart, phantomTop, 0, 1);

      footer.style.setProperty("--offsetY", offsetY.toFixed(3));
      footer.style.setProperty("--scaleY", scaleY.toFixed(5));

      frame = window.requestAnimationFrame(animateFooter);
    };

    smoothFooterYRef.current = window.scrollY;
    frame = window.requestAnimationFrame(animateFooter);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <main className={styles.main}>
        <div ref={heroRef} className={`${styles.hero} ${mounted ? styles.mounted : ""}`} data-mounted={mounted}>
          <div className={styles.heroMid}>
            <h1 className={`${styles.title} ${styles.headlineCondensed}`} aria-label="Videomontaj — 90 kunda">
              <span className={styles.titleLine}>
                {titleWords.map(({ word, hasSpace }, index) => (
                  <span key={word}>
                    <span className={styles.word} style={{ "--delay": index }} aria-hidden>
                      {word}
                    </span>
                    {hasSpace && <span className={styles.space} aria-hidden />}
                  </span>
                ))}
              </span>
            </h1>

            <div className={styles.heroImages}>
              {heroCards.map((card, index) => (
                <div
                  key={`${card.price}-${index}`}
                  ref={(element) => {
                    heroImageRefs.current[index] = element;
                  }}
                  className={styles.heroImage}
                  style={{
                    "--delay": index,
                    "--offsetX": card.offsetX,
                    "--offsetY": card.offsetY,
                    "--velocity": 0,
                  }}
                >
                  <div className={styles.shadow} />
                  <span className={styles.heroPrice}>{card.price}</span>
                  <MediaVisual
                    src={card.src}
                    width={400}
                    height={400}
                    className={styles.img}
                    priority
                  />
                </div>
              ))}
            </div>

            <h2 className={`${styles.subtitle} ${styles.headlineCondensed}`} aria-label="Birinchi $500 ishlab topish. Yo‘l xaritasini oling">
              {subtitleLines.map((line, lineIndex) => (
                <span key={line.key} className={`${styles.subtitleLine} ${line.visibilityClass}`}>
                  {line.words.map(({ word, hasSpace }, wordIndex) => {
                    const delay = lineIndex + wordIndex + 2;

                    return (
                      <span key={`${line.key}-${word}-${wordIndex}`}>
                        <span
                          className={styles.word}
                          style={{ "--delay": delay }}
                          aria-hidden
                        >
                          {word.includes("$500") ? (
                            <>
                              <span className={styles.heroAmountAccent}>$500</span>
                              {word.replace("$500", "")}
                            </>
                          ) : (
                            word
                          )}
                        </span>
                        {hasSpace && <span className={styles.space} aria-hidden />}
                      </span>
                    );
                  })}
                </span>
              ))}
            </h2>

            <a href="https://telegram.dog/editmaktab500bot?start=auto" target="_blank" rel="noopener noreferrer" className={`${styles.ctaButton} ${styles.heroCta}`}>
              YO‘L XARITASINI OLISH
            </a>
          </div>
        </div>

        <div className={styles.indexPageSection}>
          <section id="roadmap" className={styles.indexPageProject}>
            <TextBlock title="90 kun montajni o‘rganib" description="Shunday ishlarni qila olasiz!" />
            <FeaturedCarousel openProject={openProject} />
          </section>

          <section className={styles.indexPageProject}>
            <TextBlock title="Talabalar ishlari" description="Bu buyurtmalar uchun $30-$100 to‘lanadi" />
            <div className={styles.grid}>
              {moreWork.map((project) => (
                <ProjectCard key={project.href} project={project} openProject={openProject} />
              ))}
            </div>
          </section>
        </div>
      </main>

      <ProjectPageOverlay project={activeProject} closeProject={closeProject} />
      <Footer footerRef={footerRef} footerElementRef={footerElementRef} titleRef={footerTitleRef} />
    </>
  );
}
