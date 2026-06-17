import React, { useEffect, useState } from "react";
import { getImagePath } from "../utils/imageExtractor.js";

/**
 * HorizontalSlideshow
 * Props:
 * - currentImageId: number|null
 * - className: optional extra classes
 */
export default function HorizontalSlideshow({ currentImageId = null, className = "" }) {
  const [visibleId, setVisibleId] = useState(currentImageId);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (currentImageId === null) return;
    if (currentImageId === visibleId) return;
    // Trigger transition: briefly clear then show new image to allow CSS transition
    setVisibleId(null);
    const t = setTimeout(() => {
      setVisibleId(currentImageId);
      setAnimKey((k) => k + 1);
    }, 80);
    return () => clearTimeout(t);
  }, [currentImageId]);

  if (!visibleId) {
    return (
      <div className={`flex overflow-hidden w-full h-[400px] justify-center items-center ${className}`}>
        <div className="text-gray-400">Visuals will appear here</div>
      </div>
    );
  }

  const src = getImagePath(visibleId) || "";

  return (
    <div className={`flex overflow-hidden w-full h-[400px] justify-center items-center ${className}`}>
      <img
        key={`hs-${animKey}`}
        src={src}
        alt={`Slide ${visibleId}`}
        draggable={false}
        className="max-w-full max-h-full object-contain transition-opacity duration-300 ease-in-out"
        onLoad={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onError={(e) => {
          console.warn(`HorizontalSlideshow: image not found ${src}`);
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}
