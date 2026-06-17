import React, { useRef, useState, useEffect } from "react";
import { HiPlay, HiPause } from "react-icons/hi2";
import { IoVolumeHighOutline } from "react-icons/io5";
import "./AudioPlayer.css";

export default function AudioPlayer({ audioUrl }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audio.currentTime = pct * audio.duration;
  };

  const formatSec = (s) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  /* Generate pseudo-waveform bars */
  const bars = Array.from({ length: 28 }, (_, i) => {
    const h = 12 + Math.sin(i * 0.7) * 10 + Math.cos(i * 1.3) * 6;
    const filled = progress > (i / 28) * 100;
    return { height: Math.max(6, h), filled };
  });

  return (
    <div className={`audio-player ${playing ? "audio-player--playing" : ""}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <button
        className="audio-player__btn"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        id="audio-play-toggle"
      >
        {playing ? <HiPause /> : <HiPlay />}
      </button>

      <div className="audio-player__waveform" onClick={handleSeek}>
        {bars.map((bar, i) => (
          <span
            key={i}
            className={`audio-player__bar ${bar.filled ? "audio-player__bar--filled" : ""}`}
            style={{ height: `${bar.height}px` }}
          />
        ))}
      </div>

      <div className="audio-player__time">
        <IoVolumeHighOutline className="audio-player__vol-icon" />
        <span>{formatSec(duration)}</span>
      </div>
    </div>
  );
}
