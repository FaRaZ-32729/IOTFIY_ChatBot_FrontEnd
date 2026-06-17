import React, { useEffect, useRef, useState } from "react";
import "./ImageSlideshow.css";

// function normalizeImages(images) {
//   if (!Array.isArray(images)) return [];

//   return images
//     .map((item) => {
//       if (!item) return null;
//       if (typeof item === "string") {
//         return { url: item, topic: "", pageNumber: null, pdfName: "" };
//       }

//       if (typeof item === "object") {
//         const rawPath = item.url || item.image_path || "";
//         const url = rawPath
//           ? rawPath.startsWith("/")
//             ? rawPath
//             : `/${rawPath}`
//           : "";
//         return {
//           url,
//           topic: item.topic || "",
//           pageNumber: item.page_number || item.pageNumber || null,
//           pdfName: item.pdf_name || item.pdfName || "",
//           alt: item.alt || "",
//         };
//       }

//       return null;
//     })
//     .filter((entry) => entry && entry.url);
// }

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://chatbotnd.iotfiysolutions.com";

  return images
    .map((item) => {
      if (!item) return null;

      let rawUrl = "";

      if (typeof item === "string") {
        rawUrl = item;
      } else if (typeof item === "object") {
        rawUrl = item.url || item.image_path || "";
      }

      if (!rawUrl) return null;

      // Full URL banao
      let finalUrl = rawUrl;
      if (!rawUrl.startsWith("http")) {
        finalUrl = `${backendUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      }

      return {
        url: finalUrl,
        topic: item.topic || "",
        pageNumber: item.page_number || item.pageNumber || null,
        pdfName: item.pdf_name || item.pdfName || "",
        alt: item.alt || "",
      };
    })
    .filter((entry) => entry && entry.url);
}

/**
 * Horizontal slideshow that:
 * - Shows images in a smooth horizontal carousel.
 * - In fullScreen mode it covers the entire viewport behind the controls.
 * - Auto-advances every `intervalMs` milliseconds.
 * - Supports modal previews with topic metadata.
 */
export default function ImageSlideshow({
  images = [],
  intervalMs = 3500,
  fullScreen = false,
  syncIndex = null,
  enableModal = false,
}) {
  const [index, setIndex] = useState(0);
  const [modalIndex, setModalIndex] = useState(null);
  const timerRef = useRef(null);

  const slides = normalizeImages(images);
  const slidesKey = slides.map((slide) => slide.url).join("|");

  // Reset to first image whenever the image list changes
  useEffect(() => {
    setIndex(0);
  }, [slidesKey]);

  // Sync index externally
  useEffect(() => {
    if (syncIndex !== null && syncIndex >= 0 && syncIndex < slides.length) {
      setIndex(syncIndex);
    }
  }, [syncIndex, slides.length]);

  // Auto-advance
  useEffect(() => {
    if (slides.length <= 1) return undefined;
    if (syncIndex !== null) return undefined;

    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);

    return () => clearInterval(timerRef.current);
  }, [slides.length, intervalMs, syncIndex]);

  useEffect(() => {
    if (modalIndex !== null && modalIndex >= slides.length) {
      setModalIndex(null);
    }
  }, [modalIndex, slides.length]);

  const prev = () => {
    clearInterval(timerRef.current);
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  };

  const next = () => {
    clearInterval(timerRef.current);
    setIndex((i) => (i + 1) % slides.length);
  };

  if (!slides.length) return null;

  const fsClass = fullScreen ? " img-slideshow--fullscreen" : "";

  return (
    <div className={`img-slideshow${fsClass}`} id="image-slideshow" aria-label="Related visuals">
      {/* Slide track */}
      <div
        className="img-slideshow__track"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div key={`${slide.url}-${i}`} className="img-slideshow__slide">
            <img
              src={slide.url}
              alt={slide.alt || `Slide ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
              onClick={() => {
                if (enableModal) setModalIndex(i);
              }}
            />
            {slide.topic && !fullScreen && (
              <div className="img-slideshow__caption">{slide.topic}</div>
            )}
          </div>
        ))}
      </div>

      {/* Prev / Next arrows — only when more than 1 image */}
      {slides.length > 1 && (
        <>
          <button
            className="img-slideshow__arrow img-slideshow__arrow--prev"
            onClick={prev}
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            className="img-slideshow__arrow img-slideshow__arrow--next"
            onClick={next}
            aria-label="Next image"
          >
            ›
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="img-slideshow__dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`img-slideshow__dot${i === index ? " img-slideshow__dot--active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image counter badge */}
      <div className="img-slideshow__counter" aria-hidden>
        {index + 1} / {slides.length}
      </div>

      {/* Modal preview */}
      {enableModal && modalIndex !== null && slides[modalIndex] && (
        <div className="img-slideshow__modal" role="dialog" aria-modal="true">
          <button
            className="img-slideshow__modal-backdrop"
            onClick={() => setModalIndex(null)}
            aria-label="Close image preview"
          />
          <div className="img-slideshow__modal-content">
            <button
              className="img-slideshow__modal-close"
              onClick={() => setModalIndex(null)}
              aria-label="Close image preview"
            >
              ×
            </button>
            <img src={slides[modalIndex].url} alt={slides[modalIndex].alt || "Related image"} />
            <div className="img-slideshow__modal-meta">
              <div className="img-slideshow__modal-title">
                {slides[modalIndex].topic || "Related visual"}
              </div>
              <div className="img-slideshow__modal-sub">
                {[slides[modalIndex].pdfName, slides[modalIndex].pageNumber ? `Page ${slides[modalIndex].pageNumber}` : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
