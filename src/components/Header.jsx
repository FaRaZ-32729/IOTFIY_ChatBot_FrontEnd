import React from "react";
import { HiOutlineSparkles } from "react-icons/hi2";
import { IoNuclearOutline } from "react-icons/io5";
import "./Header.css";

export default function Header() {
  return (
    <header className="header glass" id="app-header">
      <div className="header__inner">
        <div className="header__brand">
          <div className="header__logo">
            <IoNuclearOutline className="header__logo-icon" />
            <div className="header__logo-glow" />
          </div>
          <div className="header__titles">
            <h1 className="header__title">IoTFIY Chatbot</h1>
            <p className="header__subtitle">Voice-First · Nucleus Distribution</p>
          </div>
        </div>
      </div>
    </header>
  );
}
