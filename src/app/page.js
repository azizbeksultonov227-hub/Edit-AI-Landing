"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function ClaudeIcon() {
  return (
    <svg className={styles.heroPriceIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#D97757" d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
    </svg>
  );
}

function HiggsfieldIcon() {
  return <Image className={`${styles.heroPriceIcon} ${styles.heroPriceLogo}`} src="/icons/higgsfield.png" alt="Higgsfield" width={96} height={96} unoptimized />;
}

function GoogleIcon() {
  return (
    <svg className={styles.heroPriceIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function PremiereProIcon() {
  return (
    <svg className={styles.heroPriceIcon} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" fill="#9999FF" />
      <path fill="#00005B" d="M10.15 8.42a2.93 2.93 0 00-1.18-.2 13.9 13.9 0 00-1.09.02v3.36l.39.02h.53c.39 0 .78-.06 1.15-.18.32-.09.6-.28.82-.53.21-.25.31-.59.31-1.03a1.45 1.45 0 00-.93-1.46zM19.75.3H4.25A4.25 4.25 0 000 4.55v14.9c0 2.35 1.9 4.25 4.25 4.25h15.5c2.35 0 4.25-1.9 4.25-4.25V4.55C24 2.2 22.1.3 19.75.3zm-7.09 11.65c-.4.56-.96.98-1.61 1.22-.68.25-1.43.34-2.25.34l-.5-.01-.43-.01v3.21a.12.12 0 01-.11.14H5.82c-.08 0-.12-.04-.12-.13V6.42c0-.07.03-.11.1-.11l.56-.01.76-.02.87-.02.91-.01c.82 0 1.5.1 2.06.31.5.17.96.45 1.34.82.32.32.57.71.73 1.14.15.42.23.85.23 1.3 0 .86-.2 1.57-.6 2.13zm6.82-3.15v1.95c0 .08-.05.11-.16.11a4.35 4.35 0 00-1.92.37c-.19.09-.37.21-.51.37v5.1c0 .1-.04.14-.13.14h-1.97a.14.14 0 01-.16-.12v-5.58l-.01-.75-.02-.78c0-.23-.02-.45-.04-.68a.1.1 0 01.07-.11h1.78c.1 0 .18.07.2.16a3.03 3.03 0 01.13.92c.3-.35.67-.64 1.08-.86a3.1 3.1 0 011.52-.39c.07-.01.13.04.14.11v.04z" />
    </svg>
  );
}

const heroIcons = { claude: ClaudeIcon, google: GoogleIcon, higgsfield: HiggsfieldIcon, premiere: PremiereProIcon };

function ToolIcons({ tools }) {
  return tools.map((name, index) => {
    const Icon = heroIcons[name];
    return (
      <span key={name} className={styles.heroPriceGroup}>
        {index > 0 && <span className={styles.heroPricePlus} aria-hidden="true">+</span>}
        <Icon />
      </span>
    );
  });
}

function HeroLabel({ card }) {
  if (card.icons?.length) {
    return (
      <span className={styles.heroPrice} data-icon="" aria-label={card.price}>
        <ToolIcons tools={card.icons} />
      </span>
    );
  }

  return <span className={styles.heroPrice}>{card.price}</span>;
}

function TextBlock({ title, description, large = false }) {
  return (
    <div className={styles.textBlock}>
      <h4 className={`${styles.textBlockTitle} ${large ? styles.textBlockTitleLarge : ""}`}>{title}</h4>
      {description && <p className={styles.textBlockDescription}>{description}</p>}
    </div>
  );
}

// Even count per set keeps the zigzag aligned when the loop wraps
const reelSet = featuredWork.length % 2 ? [...featuredWork, ...featuredWork] : featuredWork;
const REEL_SETS = reelSet.length >= 8 ? 2 : 4;
const REEL_SPEED = 0.45; // px per 60fps frame, drifting left to right

function AiReels() {
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const slotRefs = useRef([]);
  const inView = useInView(rootRef, 0);
  const [active, setActive] = useState(null);
  const reels = useMemo(
    () => Array.from({ length: REEL_SETS }, (_, set) => reelSet.map((item, index) => ({ ...item, key: `${set}-${index}` }))).flat(),
    []
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !inView) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const springs = slotRefs.current.map(() => ({ spring: createSpring(), velocity: { x: 0, y: 0 } }));
    const pointer = { x: 0, y: 0, movementX: 0, movementY: 0, hasPosition: false };
    let setWidth = track.scrollWidth / REEL_SETS;
    let offset = 0;
    let frame = 0;
    let previousTimestamp = 0;

    const measure = () => {
      setWidth = track.scrollWidth / REEL_SETS;
    };

    const onPointerMove = (event) => {
      if (pointer.hasPosition) {
        pointer.movementX = event.clientX - pointer.x;
        pointer.movementY = event.clientY - pointer.y;
      }
      pointer.hasPosition = true;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    const onScroll = () => {
      pointer.hasPosition = false;
      pointer.movementX = 0;
      pointer.movementY = 0;
    };

    const animate = (timestamp = 0) => {
      const delta = previousTimestamp > 0 ? Math.min(((timestamp - previousTimestamp) * 60) / 1000, 3) : 1;
      previousTimestamp = timestamp;

      if (!reduceMotion && setWidth > 0) {
        offset = (offset + REEL_SPEED * delta) % setWidth;
        track.style.transform = `translate3d(${(offset - setWidth).toFixed(2)}px, 0, 0)`;
      }

      slotRefs.current.forEach((element, index) => {
        const card = springs[index];
        if (!element || !card) return;

        const velocityDecay = Math.pow(0.9, delta);
        card.velocity.x *= velocityDecay;
        card.velocity.y *= velocityDecay;
        card.spring.current.x += card.velocity.x * delta;
        card.spring.current.y += card.velocity.y * delta;
        card.spring.update(delta);

        if (pointer.hasPosition) {
          const rect = element.getBoundingClientRect();
          const offsetX = ((pointer.x - (rect.left + rect.width * 0.5)) / window.innerWidth) * 2;
          const offsetY = ((pointer.y - (rect.top + rect.height * 0.5)) / window.innerHeight) * 2;
          const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
          const multiplier = Math.max(0, Math.pow(1 - distance * 0.72, 6)) * 0.42;
          card.velocity.x += clamp(pointer.movementX, -80, 80) * multiplier;
          card.velocity.y += clamp(pointer.movementY, -80, 80) * multiplier;
        }

        card.spring.current.x = clamp(card.spring.current.x, -120, 120);
        card.spring.current.y = clamp(card.spring.current.y, -120, 120);
        element.style.setProperty("--offsetX", card.spring.current.x.toFixed(3));
        element.style.setProperty("--offsetY", card.spring.current.y.toFixed(3));
        element.style.setProperty("--velocity", (card.spring.velocity.x - card.spring.velocity.y).toFixed(5));
      });

      pointer.movementX = 0;
      pointer.movementY = 0;
      frame = window.requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(track);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [inView]);

  const open = (reel, index) => {
    const slot = slotRefs.current[index];
    if (!slot) return;
    const from = slot.getBoundingClientRect();
    setActive((current) => current ?? { reel, index, from, phase: "opening" });
  };

  const close = () => {
    setActive((current) => {
      if (!current || current.phase === "closing") return current;
      const slot = slotRefs.current[current.index];
      return { ...current, phase: "closing", from: slot ? slot.getBoundingClientRect() : current.from };
    });
  };

  return (
    <div ref={rootRef} className={styles.reels} data-inview={inView}>
      <div ref={trackRef} className={styles.reelsTrack}>
        {reels.map((reel, index) => (
          <button
            key={reel.key}
            type="button"
            className={styles.reel}
            onClick={() => open(reel, index)}
            aria-label={reel.title}
            data-picked={active?.index === index}
            tabIndex={index < featuredWork.length ? 0 : -1}
          >
            <span
              ref={(element) => {
                slotRefs.current[index] = element;
              }}
              className={styles.reelMedia}
            >
              <MediaVisual src={reel.src} width={reel.width} height={reel.height} className={styles.reelVideo} />
            </span>
            {reel.tools?.length > 0 && (
              <span className={styles.reelTag}>
                <ToolIcons tools={reel.tools} />
              </span>
            )}
          </button>
        ))}
      </div>

      {active && <ReelFocus active={active} close={close} onClosed={() => setActive(null)} />}
    </div>
  );
}

function ReelFocus({ active, close, onClosed }) {
  const [shown, setShown] = useState(false);
  const { reel, from, phase } = active;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(() => setShown(true)));
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close);
    };
  }, [close]);

  const height = Math.min(from.height * 1.55, window.innerHeight * 0.82);
  const width = height * (from.width / from.height);
  const focused = shown && phase === "opening";
  const box = focused
    ? { left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2, width, height }
    : { left: from.left, top: from.top, width: from.width, height: from.height };

  return (
    <div
      className={styles.reelFocus}
      data-focused={focused}
      onClick={(event) => {
        if (!event.target.closest(`.${styles.reelFocusMedia}`)) close();
      }}
    >
      <div
        className={styles.reelFocusMedia}
        style={box}
        onTransitionEnd={(event) => {
          if (phase === "closing" && event.propertyName === "width") onClosed();
        }}
      >
        <MediaVisual src={reel.media[0]} width={reel.width} height={reel.height} className={styles.reelVideo} detail />
      </div>
    </div>
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
      key: "desktop-ai",
      visibilityClass: styles.footerTitleDesktopOnly,
      content: (
        <>
          <span className={styles.footerAmountAccent}>AI</span> bilan videomontaj
        </>
      ),
    },
    {
      key: "desktop-weeks",
      visibilityClass: styles.footerTitleDesktopOnly,
      content: (
        <>
          qilishni <span className={styles.footerAmountAccent}>3 haftada</span>
        </>
      ),
    },
    {
      key: "mobile-ai",
      visibilityClass: styles.footerTitleMobileOnly,
      content: (
        <>
          <span className={styles.footerAmountAccent}>AI</span> bilan
        </>
      ),
    },
    { key: "mobile-montage", visibilityClass: styles.footerTitleMobileOnly, text: "videomontaj" },
    { key: "mobile-doing", visibilityClass: styles.footerTitleMobileOnly, text: "qilishni" },
    {
      key: "mobile-weeks",
      visibilityClass: styles.footerTitleMobileOnly,
      content: <span className={styles.footerAmountAccent}>3 haftada</span>,
    },
    { key: "teach", text: "o‘rgatamiz!" },
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
          BOSHLASH
        </a>
        <small className={styles.footerSubtitle}>All rights reserved {year} EditMaktab</small>
      </footer>
    </>
  );
}

const SUBTITLE_ICON = "◆";
const SUBTITLE_MUTED = new Set(["montaj", "qiladi!"]);

export default function Home({ initialSlug = null } = {}) {
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef(null);
  const heroImageRefs = useRef([]);
  const titleRef = useRef(null);
  const heroImagesRef = useRef(null);
  const footerRef = useRef(null);
  const footerElementRef = useRef(null);
  const footerTitleRef = useRef(null);
  const cardsRef = useRef([]);
  const pointerRef = useRef({ x: 0, y: 0, movementX: 0, movementY: 0, hasPosition: false });
  const scrollYRef = useRef(0);
  const smoothFooterYRef = useRef(0);
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const activeProject = useMemo(() => findProjectBySlug(activeSlug), [activeSlug]);

  const titleWords = useMemo(() => splitWords("AI Montaj Kursi"), []);
  const subtitleLines = useMemo(
    () => [
      { key: "idea", words: splitWords("Siz g‘oya qilasiz,") },
      { key: "edit", words: splitWords(`AI ${SUBTITLE_ICON} montaj qiladi!`) },
    ],
    []
  );

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

  // Seat the hero cards (and their labels) just under the title at every width
  useEffect(() => {
    const title = titleRef.current;
    const images = heroImagesRef.current;
    if (!title || !images) return undefined;

    let lift = 0;
    let timeout = 0;
    const fit = () => {
      const tops = heroImageRefs.current
        .filter(Boolean)
        .flatMap((card) => [...card.children].map((child) => child.getBoundingClientRect().top));
      if (!tops.length) return;
      // The title box sits ~0.1em below the letters; aim a few px under the glyphs
      const gap = parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.35 - parseFloat(getComputedStyle(title).fontSize) * 0.1;
      lift = clamp(lift + title.getBoundingClientRect().bottom + gap - Math.min(...tops), -64, 200);
      images.style.setProperty("--hero-lift", `${lift.toFixed(1)}px`);
    };
    const schedule = (delay) => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(fit, delay);
    };
    const onResize = () => schedule(200);

    schedule(1400);
    document.fonts?.ready.then(() => schedule(1400));
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("resize", onResize);
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
            <h1 ref={titleRef} className={`${styles.title} ${styles.headlineCondensed}`} aria-label="AI Montaj Kursi">
              <span className={styles.titleLine}>
                {titleWords.map(({ word, hasSpace }, index) => (
                  <span key={word}>
                    <span className={`${styles.word} ${word === "AI" ? styles.titleAccent : ""}`} style={{ "--delay": index }} aria-hidden>
                      {word}
                    </span>
                    {hasSpace && <span className={styles.space} aria-hidden />}
                  </span>
                ))}
              </span>
            </h1>

            <div ref={heroImagesRef} className={styles.heroImages}>
              {heroCards.map((card, index) => (
                <div
                  key={`${card.price}-${index}`}
                  ref={(element) => {
                    heroImageRefs.current[index] = element;
                  }}
                  className={`${styles.heroImage} ${card.tall ? styles.heroImageTall : ""}`}
                  style={{
                    "--delay": index,
                    "--offsetX": card.offsetX,
                    "--offsetY": card.offsetY,
                    "--velocity": 0,
                  }}
                >
                  <div className={styles.shadow} />
                  <HeroLabel card={card} />
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

            <h2 className={styles.subtitle} aria-label="Siz g‘oya qilasiz, AI montaj qiladi!">
              {subtitleLines.map((line, lineIndex) => (
                <span key={line.key} className={styles.subtitleLine}>
                  {line.words.map(({ word, hasSpace }, wordIndex) => (
                    <span key={`${line.key}-${word}-${wordIndex}`}>
                      <span
                        className={`${styles.word} ${SUBTITLE_MUTED.has(word) ? styles.subtitleMuted : ""}`}
                        style={{ "--delay": lineIndex + wordIndex + 2 }}
                        aria-hidden
                      >
                        {word === SUBTITLE_ICON ? (
                          <span className={styles.subtitleIcon}>
                            <ClaudeIcon />
                          </span>
                        ) : (
                          word
                        )}
                      </span>
                      {hasSpace && <span className={styles.space} aria-hidden />}
                    </span>
                  ))}
                </span>
              ))}
            </h2>

            <a href="https://telegram.dog/editmaktab500bot?start=auto" target="_blank" rel="noopener noreferrer" className={`${styles.ctaButton} ${styles.heroCta}`}>
              BOSHLASH
            </a>
          </div>
        </div>

        <div className={styles.indexPageSection}>
          <section id="roadmap" className={styles.indexPageProject}>
            <TextBlock title="AI da tayyorlangan videolar" large />
            <AiReels />
          </section>

        </div>
      </main>

      <ProjectPageOverlay project={activeProject} closeProject={closeProject} />
      <Footer footerRef={footerRef} footerElementRef={footerElementRef} titleRef={footerTitleRef} />
    </>
  );
}
