(() => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  const navAnchors = navLinks ? Array.from(navLinks.querySelectorAll("a")) : [];

  const closeMenu = () => {
    if (!toggle || !navLinks) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    navLinks.classList.remove("is-open");
  };

  const openMenu = () => {
    if (!toggle || !navLinks) return;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
    navLinks.classList.add("is-open");
  };

  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      if (expanded) closeMenu();
      else openMenu();
    });

    navAnchors.forEach((link) => {
      link.addEventListener("click", () => closeMenu());
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    document.addEventListener("click", (event) => {
      if (!navLinks.classList.contains("is-open")) return;
      if (navLinks.contains(event.target) || toggle.contains(event.target)) return;
      closeMenu();
    });
  }

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const sectionIds = ["home", "apps", "about", "contact"];
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navAnchors.forEach((link) => {
            const href = link.getAttribute("href") || "";
            const active =
              href === `#${id}` ||
              href.endsWith(`index.html#${id}`) ||
              (id === "home" && (href === "index.html" || href.endsWith("/")));
            link.classList.toggle("is-active", active);
          });
        });
      },
      {
        rootMargin: "-40% 0px -50% 0px",
        threshold: 0.01,
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  const path = window.location.pathname.split("/").pop() || "index.html";
  navAnchors.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href === path || (path === "index.html" && href === "#home")) {
      link.classList.add("is-active");
    }
  });

  const revealTargets = document.querySelectorAll("[data-reveal]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (revealTargets.length && !reduceMotion) {
    document.documentElement.classList.add("js");
    const pending = new Set(revealTargets);
    const revealReached = () => {
      const line = window.innerHeight * 0.92;
      pending.forEach((el) => {
        if (el.getBoundingClientRect().top < line) {
          el.classList.add("is-in");
          pending.delete(el);
        }
      });
      if (pending.size) return;
      window.removeEventListener("scroll", revealReached);
      window.removeEventListener("resize", revealReached);
    };
    revealReached();
    window.addEventListener("scroll", revealReached, { passive: true });
    window.addEventListener("resize", revealReached, { passive: true });
  }

  const initShotGallery = (gallery) => {
    const track = gallery.querySelector("[data-track]");
    const viewport = gallery.querySelector("[data-viewport]");
    const slides = Array.from(gallery.querySelectorAll(".shot-gallery__slide"));
    const prevBtn = gallery.querySelector("[data-prev]");
    const nextBtn = gallery.querySelector("[data-next]");
    const dotsWrap = gallery.querySelector("[data-dots]");
    const status = gallery.querySelector("[data-status]");

    if (!track || !viewport || slides.length === 0) return;

    let index = 0;
    let dragX = 0;
    let startX = 0;
    let dragging = false;
    let activePointer = null;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const metrics = () => {
      const styles = getComputedStyle(gallery);
      const slideRatio = parseFloat(styles.getPropertyValue("--shot-slide")) || 0.78;
      const gap = parseFloat(styles.getPropertyValue("--shot-gap")) || 18;
      const viewportW = viewport.clientWidth;
      const slideW = viewportW * slideRatio;
      const centerOffset = (viewportW - slideW) / 2;
      return { slideW, gap, centerOffset, viewportW };
    };

    const trackX = () => {
      const { slideW, gap, centerOffset } = metrics();
      return -index * (slideW + gap) + centerOffset + dragX;
    };

    const renderDots = () => {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = "";
      slides.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "shot-gallery__dot" + (i === index ? " is-active" : "");
        dot.setAttribute("aria-label", `Go to screenshot ${i + 1}`);
        if (i === index) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
        dot.addEventListener("click", () => goTo(i));
        dotsWrap.appendChild(dot);
      });
    };

    const update = (animate = true) => {
      if (!animate || prefersReducedMotion) {
        track.style.transition = "none";
      } else {
        track.style.transition = "";
      }
      track.style.transform = `translate3d(${trackX()}px, 0, 0)`;
      slides.forEach((slide, i) => {
        const isActive = i === index;
        const isPrev = i === index - 1;
        const isNext = i === index + 1;
        slide.classList.toggle("is-active", isActive);
        slide.classList.toggle("is-prev", isPrev);
        slide.classList.toggle("is-next", isNext);
        slide.setAttribute("aria-hidden", isActive ? "false" : "true");
      });
      if (status) {
        status.textContent = `Screenshot ${index + 1} of ${slides.length}`;
      }
      if (dotsWrap) {
        Array.from(dotsWrap.children).forEach((dot, i) => {
          dot.classList.toggle("is-active", i === index);
          if (i === index) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
      }
    };

    const goTo = (nextIndex, animate = true) => {
      const total = slides.length;
      index = ((nextIndex % total) + total) % total;
      dragX = 0;
      update(animate);
    };

    const onPointerDown = (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      activePointer = event.pointerId;
      startX = event.clientX;
      dragX = 0;
      viewport.classList.add("is-dragging");
      track.style.transition = "none";
      viewport.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event) => {
      if (!dragging || event.pointerId !== activePointer) return;
      dragX = event.clientX - startX;
      track.style.transform = `translate3d(${trackX()}px, 0, 0)`;
    };

    const endDrag = (event) => {
      if (!dragging || (event && event.pointerId !== activePointer)) return;
      dragging = false;
      activePointer = null;
      viewport.classList.remove("is-dragging");
      const threshold = Math.min(70, metrics().viewportW * 0.14);
      if (dragX <= -threshold) goTo(index + 1);
      else if (dragX >= threshold) goTo(index - 1);
      else goTo(index);
    };

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    viewport.addEventListener("lostpointercapture", endDrag);

    prevBtn?.addEventListener("click", () => goTo(index - 1));
    nextBtn?.addEventListener("click", () => goTo(index + 1));

    gallery.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index + 1);
      }
    });

    window.addEventListener("resize", () => update(false), { passive: true });

    renderDots();
    update(false);
    requestAnimationFrame(() => update(false));
  };

  document.querySelectorAll("[data-shot-gallery]").forEach(initShotGallery);
})();
