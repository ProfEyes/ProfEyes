import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  message?: string;
  isReady?: boolean;
  onLoadComplete?: () => void;
}

export function LoadingScreen({ message, isReady = false, onLoadComplete }: LoadingScreenProps) {
  // Array de pontos para o grid
  const gridDots = Array.from({ length: 40 }).map((_, i) => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`
  }));

  // Ícones de moedas para animar
  const coinIcons = [
    { id: 1, image: '/bitcoin.png', top: '15%', left: '20%', size: 32, delay: 0.2, duration: 15 },
    { id: 2, image: '/ethereum.png', top: '75%', left: '80%', size: 24, delay: 1.5, duration: 18 },
    { id: 3, image: '/litecoin.png', top: '45%', left: '70%', size: 20, delay: 0.8, duration: 17 },
    { id: 4, image: '/ripple.png', top: '25%', left: '85%', size: 16, delay: 2.2, duration: 16 },
    { id: 5, image: '/binance.png', top: '65%', left: '15%', size: 28, delay: 1.0, duration: 19 },
    { id: 6, image: '/ethereum-black.png', top: '35%', left: '25%', size: 26, delay: 0.5, duration: 16 },
    { id: 7, image: '/pepe.png', top: '18%', left: '55%', size: 22, delay: 1.8, duration: 18 },
    { id: 8, image: '/tether.png', top: '62%', left: '40%', size: 24, delay: 0.7, duration: 15 },
    { id: 9, image: '/solana.png', top: '85%', left: '70%', size: 30, delay: 1.2, duration: 20 },
    { id: 10, image: '/dogecoin.png', top: '40%', left: '10%', size: 26, delay: 0.4, duration: 17 },
  ];

  return (
    <AnimatePresence mode="wait">
      {!isReady && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#000000] z-[9999]"
        >
          <style>
            {`          
              .logo-text {
                font-family: 'Mollen', sans-serif;
                font-weight: 800;
                letter-spacing: -0.08em;
                color: white;
                text-shadow: none;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                filter: none;
                font-size: 38px;
                background: linear-gradient(to bottom, 
                  rgba(255, 255, 255, 0.95) 0%,
                  rgba(240, 240, 240, 0.9) 100%
                );
                background-size: 100% 100%;
                -webkit-background-clip: text;
                background-clip: text;
                text-fill-color: transparent;
                -webkit-text-fill-color: transparent;
                position: relative;
                width: 100%;
                white-space: nowrap;
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                overflow: visible;
                padding: 0 10px;
              }
              
              .logo-text-wrapper {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                overflow: visible;
                white-space: nowrap;
                width: 100%;
                max-width: 90vw;
                margin: 0 auto;
                text-align: center;
              }
              
              .logo-text span {
                display: inline-block;
              }
              
              @keyframes surge {
                0% {
                  opacity: 0;
                  transform: scale(0.95);
                }
                100% {
                  opacity: 1;
                  transform: scale(1);
                }
              }
              
              @keyframes logoFadeIn {
                0% {
                  opacity: 0;
                  transform: translateY(8px);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              
              @keyframes textShine {
                0%, 100% {
                  background-position: left top;
                  text-shadow: none;
                }
                50% {
                  background-position: right bottom;
                  text-shadow: none;
                }
              }
              
              .logo-text::after {
                content: '';
                position: absolute;
                bottom: -5px;
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 1px;
                background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.8), transparent);
                opacity: 0.9;
                animation: linePulse 3s infinite alternate ease-in-out;
              }
              
              .logo-subtitle-container {
                margin-top: 12px;
                text-align: center;
              }
              
              .logo-subtitle {
                font-family: 'Inter', sans-serif;
                font-weight: 400;
                letter-spacing: 0.06em;
                color: rgba(255, 255, 255, 0.75);
                font-size: 12px;
                text-transform: uppercase;
                position: relative;
                opacity: 0;
                overflow: hidden;
                white-space: nowrap;
                animation: typing-effect 5.5s steps(40, end) 0.3s forwards;
              }
              
              @keyframes typing-effect {
                0% {
                  width: 0;
                  opacity: 1;
                  border-right: 2px solid rgba(255, 255, 255, 0.9);
                }
                80% {
                  width: 100%;
                  opacity: 1;
                  border-right: 2px solid rgba(255, 255, 255, 0.9);
                }
                100% {
                  width: 100%;
                  opacity: 1;
                  border-right: 0px solid transparent;
                }
              }
              
              @keyframes blink-caret {
                from, to { border-color: transparent }
                50% { border-color: rgba(255, 255, 255, 0.8) }
              }
              
              @keyframes subtitleGlow {
                0% {
                  color: rgba(255, 255, 255, 0.6);
                }
                100% {
                  color: rgba(255, 255, 255, 0.9);
                }
              }
              
              @keyframes letter-appear {
                0% {
                  opacity: 0;
                  transform: translateY(10px);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              
              @keyframes slide-in {
                0% {
                  opacity: 0;
                  transform: translateX(-20px);
                }
                100% {
                  opacity: 1;
                  transform: translateX(0);
                }
              }
              
              @keyframes scale-in {
                0% {
                  opacity: 0;
                  transform: scale(1.5);
                }
                100% {
                  opacity: 1;
                  transform: scale(1);
                }
              }
              
              .loader-container {
                margin-top: 45px;
                position: relative;
                width: 36px;
                height: 36px;
              }
              
              .spinner {
                border: 1.5px solid rgba(255, 255, 255, 0.08);
                border-top: 1.5px solid rgba(255, 255, 255, 0.9);
                border-radius: 50%;
                width: 100%;
                height: 100%;
                animation: spin 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                box-shadow: 0 0 15px rgba(255, 255, 255, 0.03);
              }
              
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              
              .color-shift-overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(130deg, 
                  rgba(0, 0, 0, 0.97) 0%, 
                  rgba(2, 2, 2, 0.95) 25%, 
                  rgba(0, 0, 0, 0.97) 50%, 
                  rgba(2, 2, 2, 0.95) 75%, 
                  rgba(0, 0, 0, 0.97) 100%);
                opacity: 1;
                z-index: -2;
                animation: colorShift 15s infinite alternate ease-in-out;
              }
              
              @keyframes colorShift {
                0% {
                  filter: hue-rotate(0deg);
                }
                33% {
                  filter: hue-rotate(5deg);
                }
                66% {
                  filter: hue-rotate(-5deg);
                }
                100% {
                  filter: hue-rotate(0deg);
                }
              }
              
              .ambient-light {
                position: absolute;
                border-radius: 50%;
                filter: blur(70px);
                opacity: 0.02;
                z-index: -1;
              }
              
              .light-blue {
                width: 350px;
                height: 350px;
                background: radial-gradient(circle, rgba(30, 30, 30, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
                top: 30%;
                left: 25%;
                animation: floating 18s infinite alternate;
              }
              
              .light-gold {
                width: 400px;
                height: 400px;
                background: radial-gradient(circle, rgba(255, 215, 120, 0.08) 0%, rgba(0, 0, 0, 0) 75%);
                top: 60%;
                left: 65%;
                animation: floating 20s 2s infinite alternate-reverse;
              }
              
              .light-purple {
                width: 320px;
                height: 320px;
                background: radial-gradient(circle, rgba(180, 120, 255, 0.07) 0%, rgba(0, 0, 0, 0) 70%);
                top: 70%;
                left: 30%;
                animation: floating 22s 1s infinite alternate;
              }

              .light-green {
                width: 280px;
                height: 280px;
                background: radial-gradient(circle, rgba(100, 220, 120, 0.08) 0%, rgba(0, 0, 0, 0) 65%);
                top: 25%;
                left: 65%;
                animation: floating 19s 3s infinite alternate;
              }
              
              .light-red {
                width: 250px;
                height: 250px;
                background: radial-gradient(circle, rgba(220, 95, 95, 0.06) 0%, rgba(0, 0, 0, 0) 70%);
                top: 80%;
                left: 15%;
                animation: floating 21s 0.5s infinite alternate-reverse;
              }
              
              .light-teal {
                width: 300px;
                height: 300px;
                background: radial-gradient(circle, rgba(80, 220, 200, 0.07) 0%, rgba(0, 0, 0, 0) 68%);
                top: 40%;
                left: 45%;
                animation: floating 23s 2.5s infinite alternate;
              }
              
              @keyframes floating {
                0% {
                  transform: translate(0, 0);
                }
                50% {
                  transform: translate(-60px, 40px);
                }
                100% {
                  transform: translate(-80px, -50px);
                }
              }
              
              .luxury-particle {
                position: absolute;
                background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.1));
                opacity: 0;
                border-radius: 50%;
                filter: blur(0.5px);
                animation: glimmer 8s infinite ease;
              }
              
              .particle-sm {
                width: 1px;
                height: 1px;
              }
              
              .particle-md {
                width: 1.5px;
                height: 1.5px;
              }
              
              .particle-lg {
                width: 2px;
                height: 2px;
              }
              
              @keyframes glimmer {
                0%, 100% {
                  opacity: 0;
                }
                50% {
                  opacity: 0.6;
                }
              }
              
              .decorative-dot {
                position: absolute;
                width: 1.5px;
                height: 1.5px;
                background: rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                animation: dotFloat 30s infinite ease-in-out;
              }
              
              @keyframes dotFloat {
                0% {
                  transform: translate(0, 0) scale(1);
                }
                25% {
                  transform: translate(40px, 30px) scale(1.5);
                }
                50% {
                  transform: translate(60px, -20px) scale(1);
                }
                75% {
                  transform: translate(20px, -40px) scale(1.5);
                }
                100% {
                  transform: translate(0, 0) scale(1);
                }
              }
              
              .diamond-pattern {
                position: absolute;
                width: 80px;
                height: 80px;
                border: 1px solid rgba(255, 255, 255, 0.03);
                transform: rotate(45deg);
                opacity: 0.1;
                animation: diamondFloat 40s infinite linear;
              }
              
              @keyframes diamondFloat {
                0% {
                  transform: rotate(45deg) translate(0, 0) scale(1);
                }
                25% {
                  transform: rotate(60deg) translate(40px, 20px) scale(1.2);
                }
                50% {
                  transform: rotate(45deg) translate(60px, 40px) scale(0.8);
                }
                75% {
                  transform: rotate(30deg) translate(20px, 60px) scale(1.2);
                }
                100% {
                  transform: rotate(45deg) translate(0, 0) scale(1);
                }
              }

              .candle {
                position: absolute;
                width: 2px;
                height: 8px;
                background: rgba(255, 255, 255, 0.08);
                opacity: 0.25;
                transform-origin: center;
                animation: candleFloat 35s infinite ease-in-out;
              }
              
              @keyframes candleFloat {
                0% {
                  transform: translate(0, 0) scaleY(1);
                }
                33% {
                  transform: translate(30px, -20px) scaleY(1.5);
                }
                66% {
                  transform: translate(-30px, 20px) scaleY(0.7);
                }
                100% {
                  transform: translate(0, 0) scaleY(1);
                }
              }
              
              .candle-green {
                background: rgba(100, 220, 120, 0.15);
              }
              
              .candle-red {
                background: rgba(220, 95, 95, 0.15);
              }
              
              .candle-wick {
                position: absolute;
                width: 0.5px;
                height: 4px;
                background: rgba(255, 255, 255, 0.15);
                left: 50%;
                transform: translateX(-50%);
              }
              
              .wick-top {
                top: -4px;
              }
              
              .wick-bottom {
                bottom: -4px;
              }
              
              .market-symbol {
                position: absolute;
                font-family: 'Inter', sans-serif;
                font-size: 9px;
                color: rgba(255, 255, 255, 0.1);
                font-weight: 300;
                animation: symbolFloat 40s infinite ease-in-out;
              }
              
              @keyframes symbolFloat {
                0% {
                  transform: translate(0, 0) scale(1);
                }
                25% {
                  transform: translate(60px, 30px) scale(1.5);
                }
                50% {
                  transform: translate(20px, 60px) scale(1.2);
                }
                75% {
                  transform: translate(-30px, 20px) scale(0.8);
                }
                100% {
                  transform: translate(0, 0) scale(1);
                }
              }
              
              .trend-line {
                position: absolute;
                height: 1px;
                background: linear-gradient(to right, transparent, currentColor, transparent);
                opacity: 0.05;
                animation: lineFloat 45s infinite ease-in-out;
              }
              
              @keyframes lineFloat {
                0%, 100% {
                  transform: rotate(-10deg) translate(0, 0);
                }
                33% {
                  transform: rotate(-12deg) translate(10px, -5px);
                }
                66% {
                  transform: rotate(-8deg) translate(-10px, 5px);
                }
              }
              
              .trend-up {
                color: rgba(100, 220, 120, 0.5);
                transform: rotate(-10deg);
              }
              
              .trend-down {
                color: rgba(220, 95, 95, 0.5);
                transform: rotate(10deg);
                animation-name: lineFloatDown;
              }
              
              @keyframes lineFloatDown {
                0%, 100% {
                  transform: rotate(10deg) translate(0, 0);
                }
                33% {
                  transform: rotate(12deg) translate(-10px, 5px);
                }
                66% {
                  transform: rotate(8deg) translate(10px, -5px);
                }
              }
              
              .trend-neutral {
                color: rgba(255, 255, 255, 0.5);
                animation-name: lineFloatNeutral;
              }
              
              @keyframes lineFloatNeutral {
                0%, 100% {
                  transform: rotate(0deg) translate(0, 0);
                }
                33% {
                  transform: rotate(2deg) translate(10px, 5px);
                }
                66% {
                  transform: rotate(-2deg) translate(-10px, -5px);
                }
              }
              
              .crypto-icon {
                position: absolute;
                width: 16px;
                height: 16px;
                opacity: 0.2;
                filter: saturate(0.8) brightness(1.5);
                animation: floatCrypto 20s infinite linear;
              }
              
              @keyframes floatCrypto {
                0% {
                  transform: translate(0, 0) rotate(0deg) scale(1);
                }
                25% {
                  transform: translate(80px, -60px) rotate(90deg) scale(1.2);
                }
                50% {
                  transform: translate(0, -120px) rotate(180deg) scale(1);
                }
                75% {
                  transform: translate(-80px, -60px) rotate(270deg) scale(0.8);
                }
                100% {
                  transform: translate(0, 0) rotate(360deg) scale(1);
                }
              }
              
              .currency-ticker {
                position: absolute;
                font-family: 'Inter', sans-serif;
                font-size: 10px;
                font-weight: 500;
                letter-spacing: 0.05em;
                background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.07), transparent);
                color: rgba(255, 255, 255, 0.4);
                padding: 2px 8px;
                border-radius: 4px;
                opacity: 0;
                animation: tickerFloat 30s infinite ease-in-out;
              }
              
              @keyframes tickerFloat {
                0%, 100% {
                  opacity: 0;
                  transform: translate(0, 0);
                }
                10% {
                  opacity: 0.7;
                  transform: translate(0, 0) scale(1);
                }
                30% {
                  opacity: 0.9;
                  transform: translate(80px, -40px) scale(1.1);
                }
                50% {
                  opacity: 0.9;
                  transform: translate(120px, 0) scale(1);
                }
                70% {
                  opacity: 0.7;
                  transform: translate(40px, 40px) scale(0.9);
                }
                90% {
                  opacity: 0.3;
                  transform: translate(0, 0);
                }
              }
              
              .value-pulse {
                position: absolute;
                font-family: 'Inter', sans-serif;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.25);
                opacity: 0;
                animation: valueFloat 20s infinite ease-in-out;
              }
              
              @keyframes valueFloat {
                0%, 100% {
                  opacity: 0;
                  transform: scale(0.9) translate(0, 0);
                }
                10% {
                  opacity: 0.5;
                  transform: scale(0.95) translate(20px, -20px);
                }
                40% {
                  opacity: 0.9;
                  transform: scale(1.2) translate(60px, -40px);
                }
                60% {
                  opacity: 0.9;
                  transform: scale(1.2) translate(40px, -20px);
                }
                90% {
                  opacity: 0.5;
                  transform: scale(0.95) translate(0, 0);
                }
              }
              
              .value-up {
                color: rgba(100, 220, 120, 0.35);
              }
              
              .value-down {
                color: rgba(220, 95, 95, 0.35);
              }
              
              .grid-dot {
                position: absolute;
                width: 1px;
                height: 1px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                animation: gridDotFloat 30s infinite linear;
              }
              
              @keyframes gridDotFloat {
                0% {
                  transform: translate(0, 0) scale(1);
                }
                25% {
                  transform: translate(30px, 30px) scale(2);
                }
                50% {
                  transform: translate(60px, 0) scale(1);
                }
                75% {
                  transform: translate(30px, -30px) scale(2);
                }
                100% {
                  transform: translate(0, 0) scale(1);
                }
              }

              .line-chart {
                position: absolute;
                height: 1px;
                background: linear-gradient(to right, 
                  transparent, 
                  rgba(100, 100, 100, 0.15), 
                  rgba(50, 50, 50, 0.15), 
                  rgba(80, 80, 80, 0.15), 
                  transparent);
                width: 100px;
                transform-origin: center;
                opacity: 0.2;
                animation: chartMove 15s infinite ease-in-out;
              }
              
              @keyframes chartMove {
                0%, 100% {
                  transform: scaleX(1) translateY(0) rotate(0deg);
                  opacity: 0.1;
                }
                25% {
                  transform: scaleX(1.5) translateY(-10px) rotate(2deg);
                  opacity: 0.5;
                }
                50% {
                  transform: scaleX(0.8) translateY(15px) rotate(-2deg);
                  opacity: 0.5;
                }
                75% {
                  transform: scaleX(1.3) translateY(-8px) rotate(1deg);
                  opacity: 0.3;
                }
              }
              
              .price-block {
                position: absolute;
                font-family: 'Inter', sans-serif;
                font-size: 9px;
                background: rgba(255, 255, 255, 0.02);
                color: rgba(255, 255, 255, 0.3);
                padding: 3px 6px;
                border-radius: 3px;
                opacity: 0;
                animation: priceAppear 12s infinite ease-in-out;
              }
              
              @keyframes priceAppear {
                0%, 100% {
                  opacity: 0;
                  transform: translateY(10px) scale(0.9);
                }
                10%, 90% {
                  opacity: 0.7;
                  transform: translateY(0) scale(1);
                }
                50% {
                  opacity: 0.9;
                  transform: translateY(-15px) scale(1.1);
                }
              }

              @keyframes fadeIn {
                to {
                  opacity: 1;
                }
              }

              @keyframes linePulse {
                0% {
                  width: 40px;
                  opacity: 0.5;
                }
                100% {
                  width: 80px;
                  opacity: 0.8;
                }
              }

              @keyframes floatIcon {
                0% {
                  transform: translate(0, 0) rotate(0deg);
                }
                25% {
                  transform: translate(30px, -20px) rotate(5deg);
                }
                50% {
                  transform: translate(0px, -40px) rotate(0deg);
                }
                75% {
                  transform: translate(-30px, -20px) rotate(-5deg);
                }
                100% {
                  transform: translate(0, 0) rotate(0deg);
                }
              }
              
              .crypto-float {
                position: absolute;
                filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.3));
                z-index: 1;
                opacity: 0.7;
                animation: floatIcon infinite ease-in-out;
              }

              .crypto-symbol {
                position: absolute;
                font-family: 'Inter', sans-serif;
                font-size: 14px;
                font-weight: 700;
                color: rgba(255, 255, 255, 0.15);
                z-index: 0;
                animation: symbolPulse 10s infinite alternate ease-in-out;
              }
              
              @keyframes symbolPulse {
                0% {
                  opacity: 0.1;
                  transform: scale(0.9);
                }
                50% {
                  opacity: 0.2;
                  transform: scale(1);
                }
                100% {
                  opacity: 0.1;
                  transform: scale(0.9);
                }
              }
            `}
          </style>
          
          {/* Sobreposição com mudança de cor sutil */}
          <div className="color-shift-overlay"></div>
          
          {/* Efeitos de iluminação ambiental */}
          {/* Ícones de criptomoedas em movimento */}
          <div className="crypto-icon" style={{ 
            top: '30%', left: '20%', 
            animationDuration: '20s',
            background: 'radial-gradient(circle, rgba(247, 147, 26, 0.7) 0%, rgba(0, 0, 0, 0) 70%)'
          }}></div>
          <div className="crypto-icon" style={{ 
            top: '25%', left: '70%', 
            animationDuration: '18s', 
            animationDelay: '1s',
            background: 'radial-gradient(circle, rgba(98, 126, 234, 0.7) 0%, rgba(0, 0, 0, 0) 70%)'
          }}></div>
          <div className="crypto-icon" style={{ 
            top: '65%', left: '30%', 
            animationDuration: '22s', 
            animationDelay: '2s',
            background: 'radial-gradient(circle, rgba(15, 157, 125, 0.7) 0%, rgba(0, 0, 0, 0) 70%)'
          }}></div>
          <div className="crypto-icon" style={{ 
            top: '70%', left: '80%', 
            animationDuration: '19s', 
            animationDelay: '3s',
            background: 'radial-gradient(circle, rgba(237, 20, 61, 0.7) 0%, rgba(0, 0, 0, 0) 70%)'
          }}></div>
          <div className="crypto-icon" style={{ 
            top: '45%', left: '85%', 
            animationDuration: '17s', 
            animationDelay: '4s',
            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.7) 0%, rgba(0, 0, 0, 0) 70%)'
          }}></div>
          
          {/* Tickers de moedas que aparecem e desaparecem com movimento */}
          <div className="currency-ticker" style={{ top: '35%', left: '35%', animationDelay: '0s' }}>BTC +2.8%</div>
          <div className="currency-ticker" style={{ top: '55%', left: '25%', animationDelay: '3s' }}>ETH -1.9%</div>
          <div className="currency-ticker" style={{ top: '25%', left: '60%', animationDelay: '6s' }}>XRP +5.2%</div>
          <div className="currency-ticker" style={{ top: '65%', left: '65%', animationDelay: '9s' }}>ADA -3.7%</div>
          <div className="currency-ticker" style={{ top: '45%', left: '55%', animationDelay: '4s' }}>SOL +4.5%</div>
          <div className="currency-ticker" style={{ top: '15%', left: '45%', animationDelay: '7s' }}>DOT -2.3%</div>
          <div className="currency-ticker" style={{ top: '75%', left: '40%', animationDelay: '10s' }}>AVAX +1.8%</div>
          <div className="currency-ticker" style={{ top: '20%', left: '30%', animationDelay: '12s' }}>MATIC +3.9%</div>
          <div className="currency-ticker" style={{ top: '40%', left: '70%', animationDelay: '13s' }}>LINK +4.7%</div>
          <div className="currency-ticker" style={{ top: '80%', left: '30%', animationDelay: '14s' }}>DOGE +6.2%</div>
          <div className="currency-ticker" style={{ top: '60%', left: '80%', animationDelay: '15s' }}>UNI +2.9%</div>
          
          {/* Valores pulsantes com movimento */}
          <div className="value-pulse value-up" style={{ top: '30%', left: '40%', animationDelay: '0s' }}>+$427.90</div>
          <div className="value-pulse value-down" style={{ top: '60%', left: '55%', animationDelay: '2s' }}>-$135.62</div>
          <div className="value-pulse value-up" style={{ top: '20%', left: '50%', animationDelay: '4s' }}>+$892.35</div>
          <div className="value-pulse value-down" style={{ top: '50%', left: '25%', animationDelay: '6s' }}>-$278.41</div>
          <div className="value-pulse value-up" style={{ top: '70%', left: '65%', animationDelay: '8s' }}>+$563.18</div>
          <div className="value-pulse value-up" style={{ top: '15%', left: '25%', animationDelay: '10s' }}>+$389.90</div>
          <div className="value-pulse value-up" style={{ top: '45%', left: '45%', animationDelay: '12s' }}>+$724.65</div>
          <div className="value-pulse value-up" style={{ top: '75%', left: '55%', animationDelay: '14s' }}>+$1,278.30</div>
          <div className="value-pulse value-up" style={{ top: '55%', left: '75%', animationDelay: '16s' }}>+$845.47</div>
          <div className="value-pulse value-up" style={{ top: '25%', left: '75%', animationDelay: '18s' }}>+$512.83</div>
          
          {/* Grid de pontos flutuantes */}
          {gridDots.map((dot, i) => (
            <div 
              key={i} 
              className="grid-dot" 
              style={{ 
                top: dot.top, 
                left: dot.left,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${40 + (i % 20)}s`
              }}
            ></div>
          ))}
          
          {/* Elementos decorativos de luxo flutuantes */}
          <div className="diamond-pattern" style={{ top: '20%', left: '15%', animationDelay: '0s' }}></div>
          <div className="diamond-pattern" style={{ top: '70%', left: '75%', animationDelay: '5s' }}></div>
          <div className="diamond-pattern" style={{ top: '30%', right: '20%', width: '120px', height: '120px', animationDelay: '10s' }}></div>
          
          {/* Elementos de mercado financeiro - Candles flutuantes */}
          <div className="candle candle-green" style={{ top: '25%', left: '22%', height: '12px', animationDelay: '0s' }}>
            <div className="candle-wick wick-top"></div>
            <div className="candle-wick wick-bottom"></div>
          </div>
          <div className="candle candle-red" style={{ top: '25%', left: '26%', height: '8px', animationDelay: '3s' }}>
            <div className="candle-wick wick-top"></div>
            <div className="candle-wick wick-bottom"></div>
          </div>
          <div className="candle candle-green" style={{ top: '25%', left: '30%', height: '10px', animationDelay: '6s' }}>
            <div className="candle-wick wick-top"></div>
            <div className="candle-wick wick-bottom"></div>
          </div>
          
          <div className="candle candle-green" style={{ top: '70%', left: '65%', height: '9px', animationDelay: '2s' }}>
            <div className="candle-wick wick-top"></div>
            <div className="candle-wick wick-bottom"></div>
          </div>
          <div className="candle candle-green" style={{ top: '70%', left: '69%', height: '14px', animationDelay: '5s' }}>
            <div className="candle-wick wick-top"></div>
            <div className="candle-wick wick-bottom"></div>
          </div>
          <div className="candle candle-red" style={{ top: '70%', left: '73%', height: '7px', animationDelay: '8s' }}>
            <div className="candle-wick wick-top"></div>
            <div className="candle-wick wick-bottom"></div>
          </div>
          
          {/* Símbolos de mercado flutuantes */}
          <div className="market-symbol" style={{ top: '40%', left: '15%', animationDelay: '0s' }}>BTCUSD</div>
          <div className="market-symbol" style={{ top: '35%', left: '80%', animationDelay: '5s' }}>EURUSD</div>
          <div className="market-symbol" style={{ top: '75%', left: '20%', animationDelay: '10s' }}>XAUUSD</div>
          <div className="market-symbol" style={{ top: '60%', left: '75%', animationDelay: '15s' }}>NASDAQ</div>
          <div className="market-symbol" style={{ top: '25%', left: '40%', animationDelay: '7s' }}>DAX</div>
          <div className="market-symbol" style={{ top: '65%', left: '45%', animationDelay: '12s' }}>NIKKEI</div>
          
          {/* Linhas de tendência flutuantes */}
          <div className="trend-line trend-up" style={{ top: '45%', left: '10%', width: '60px', animationDelay: '0s' }}></div>
          <div className="trend-line trend-down" style={{ top: '55%', left: '70%', width: '80px', animationDelay: '4s' }}></div>
          <div className="trend-line trend-neutral" style={{ top: '65%', left: '30%', width: '40px', animationDelay: '8s' }}></div>
          <div className="trend-line trend-up" style={{ top: '25%', left: '65%', width: '50px', animationDelay: '12s' }}></div>
          <div className="trend-line trend-down" style={{ top: '35%', left: '30%', width: '70px', animationDelay: '16s' }}></div>
          
          {/* Partículas de luxo */}
          <div className="luxury-particle particle-sm" style={{ top: '20%', left: '30%', animationDelay: '0s' }}></div>
          <div className="luxury-particle particle-md" style={{ top: '35%', left: '70%', animationDelay: '0.7s' }}></div>
          <div className="luxury-particle particle-lg" style={{ top: '55%', left: '25%', animationDelay: '1.5s' }}></div>
          <div className="luxury-particle particle-sm" style={{ top: '65%', left: '60%', animationDelay: '2.2s' }}></div>
          <div className="luxury-particle particle-md" style={{ top: '75%', left: '45%', animationDelay: '3s' }}></div>
          <div className="luxury-particle particle-sm" style={{ top: '40%', left: '20%', animationDelay: '3.7s' }}></div>
          <div className="luxury-particle particle-lg" style={{ top: '30%', left: '55%', animationDelay: '4.5s' }}></div>
          <div className="luxury-particle particle-md" style={{ top: '50%', left: '80%', animationDelay: '5.2s' }}></div>
          <div className="luxury-particle particle-sm" style={{ top: '15%', left: '45%', animationDelay: '6s' }}></div>
          <div className="luxury-particle particle-md" style={{ top: '85%', left: '30%', animationDelay: '6.7s' }}></div>
          
          {/* Pontos decorativos flutuantes */}
          <div className="decorative-dot" style={{ top: '30%', left: '20%', animationDelay: '0s' }}></div>
          <div className="decorative-dot" style={{ top: '25%', left: '25%', animationDelay: '2s' }}></div>
          <div className="decorative-dot" style={{ top: '35%', left: '75%', animationDelay: '4s' }}></div>
          <div className="decorative-dot" style={{ top: '40%', left: '80%', animationDelay: '6s' }}></div>
          <div className="decorative-dot" style={{ top: '60%', left: '30%', animationDelay: '8s' }}></div>
          <div className="decorative-dot" style={{ top: '65%', left: '25%', animationDelay: '10s' }}></div>
          <div className="decorative-dot" style={{ top: '70%', left: '75%', animationDelay: '12s' }}></div>
          <div className="decorative-dot" style={{ top: '75%', left: '80%', animationDelay: '14s' }}></div>
          
          {/* Gráficos de linha animados */}
          <div className="line-chart" style={{ top: '35%', left: '5%', width: '120px', transform: 'rotate(5deg)', animationDelay: '0s' }}></div>
          <div className="line-chart" style={{ top: '60%', left: '10%', width: '150px', transform: 'rotate(-8deg)', animationDelay: '1s' }}></div>
          <div className="line-chart" style={{ top: '30%', left: '60%', width: '150px', transform: 'rotate(-5deg)', animationDelay: '2s' }}></div>
          <div className="line-chart" style={{ top: '15%', left: '40%', width: '90px', transform: 'rotate(8deg)', animationDelay: '3s' }}></div>
          <div className="line-chart" style={{ top: '80%', left: '50%', width: '100px', transform: 'rotate(2deg)', animationDelay: '4s' }}></div>
          <div className="line-chart" style={{ top: '20%', left: '20%', width: '80px', transform: 'rotate(-2deg)', animationDelay: '5s' }}></div>
          <div className="line-chart" style={{ top: '75%', left: '70%', width: '130px', transform: 'rotate(10deg)', animationDelay: '6s' }}></div>
          <div className="line-chart" style={{ top: '40%', left: '85%', width: '110px', transform: 'rotate(-10deg)', animationDelay: '7s' }}></div>
          
          {/* Blocos de preços animados */}
          <div className="price-block" style={{ top: '40%', left: '25%', animationDelay: '0s' }}>BTC/USD 42,873.50</div>
          <div className="price-block" style={{ top: '35%', left: '65%', animationDelay: '2s' }}>ETH/USD 2,958.26</div>
          <div className="price-block" style={{ top: '65%', left: '55%', animationDelay: '4s' }}>XAU/USD 1,957.82</div>
          <div className="price-block" style={{ top: '55%', left: '35%', animationDelay: '6s' }}>EUR/USD 1.0932</div>
          <div className="price-block" style={{ top: '25%', left: '15%', animationDelay: '8s' }}>GBP/USD 1.2754</div>
          <div className="price-block" style={{ top: '45%', left: '75%', animationDelay: '10s' }}>JPY/USD 148.67</div>
          <div className="price-block" style={{ top: '70%', left: '20%', animationDelay: '11s' }}>IBOV 131,865.20</div>
          <div className="price-block" style={{ top: '15%', left: '65%', animationDelay: '12s' }}>S&P500 5,487.54</div>
          <div className="price-block" style={{ top: '30%', left: '45%', animationDelay: '13s' }}>NASDAQ 18,239.40</div>
          
          {/* Ícones adicionais de criptomoedas em movimento */}
          <div className="crypto-icon" style={{ 
            top: '50%', left: '55%', 
            animationDuration: '15s',
            animationDelay: '2s',
            background: 'radial-gradient(circle, rgba(52, 187, 207, 0.7) 0%, rgba(0, 0, 0, 0) 70%)'
          }}></div>
          <div className="crypto-icon" style={{ 
            top: '35%', left: '25%', 
            animationDuration: '12s', 
            animationDelay: '3s',
            background: 'radial-gradient(circle, rgba(195, 136, 255, 0.7) 0%, rgba(0, 0, 0, 0) 70%)'
          }}></div>
          <div className="crypto-icon" style={{ 
            top: '80%', left: '40%', 
            animationDuration: '18s', 
            animationDelay: '4s',
            background: 'radial-gradient(circle, rgba(255, 143, 89, 0.7) 0%, rgba(0, 0, 0, 0) 70%)'
          }}></div>
          <div className="crypto-icon" style={{ 
            top: '20%', left: '80%', 
            animationDuration: '16s',
            animationDelay: '5s',
            background: 'radial-gradient(circle, rgba(133, 219, 139, 0.7) 0%, rgba(0, 0, 0, 0) 70%)'
          }}></div>
          <div className="crypto-icon" style={{ 
            top: '60%', left: '15%', 
            animationDuration: '14s', 
            animationDelay: '6s',
            background: 'radial-gradient(circle, rgba(235, 168, 231, 0.7) 0%, rgba(0, 0, 0, 0) 70%)'
          }}></div>
          
          {/* Elementos de ganho adicionais */}
          <div className="value-pulse value-up" style={{ 
            top: '10%', 
            left: '15%', 
            animationDelay: '5s', 
            fontSize: '13px', 
            fontWeight: 'bold', 
            color: 'rgba(120, 220, 150, 0.55)'
          }}>+$1,543.89</div>
          
          <div className="value-pulse value-up" style={{ 
            top: '85%', 
            left: '60%', 
            animationDelay: '7s', 
            fontSize: '12px', 
            fontWeight: 'bold', 
            color: 'rgba(120, 220, 150, 0.5)'
          }}>+$937.42</div>
          
          <div className="price-block" style={{ 
            top: '50%', 
            left: '15%', 
            animationDelay: '15s',
            background: 'rgba(100, 220, 120, 0.1)'
          }}>PROFIT +$678.25</div>
          
          <div className="price-block" style={{ 
            top: '20%', 
            left: '85%', 
            animationDelay: '9s',
            background: 'rgba(100, 220, 120, 0.1)'
          }}>PROFIT +$1,245.70</div>
          
          <div className="currency-ticker" style={{ 
            top: '90%', 
            left: '45%', 
            animationDelay: '16s',
            background: 'linear-gradient(to right, transparent, rgba(100, 220, 120, 0.2), transparent)',
            color: 'rgba(120, 220, 150, 0.8)'
          }}>SIGNAL +8.4%</div>
          
          <div className="currency-ticker" style={{ 
            top: '5%', 
            left: '55%', 
            animationDelay: '18s',
            background: 'linear-gradient(to right, transparent, rgba(100, 220, 120, 0.2), transparent)',
            color: 'rgba(120, 220, 150, 0.8)'
          }}>SIGNAL +11.2%</div>
          
          {/* Crypto symbols */}
          <div className="crypto-symbol" style={{ top: '20%', left: '40%', fontSize: '24px' }}>BTC</div>
          <div className="crypto-symbol" style={{ top: '70%', left: '60%', fontSize: '22px' }}>ETH</div>
          <div className="crypto-symbol" style={{ top: '40%', left: '80%', fontSize: '20px' }}>LTC</div>
          <div className="crypto-symbol" style={{ top: '80%', left: '30%', fontSize: '18px' }}>XRP</div>
          <div className="crypto-symbol" style={{ top: '30%', left: '10%', fontSize: '21px' }}>BNB</div>
          <div className="crypto-symbol" style={{ top: '50%', left: '30%', fontSize: '19px' }}>PEPE</div>
          <div className="crypto-symbol" style={{ top: '60%', left: '20%', fontSize: '17px' }}>USDT</div>
          <div className="crypto-symbol" style={{ top: '25%', left: '70%', fontSize: '20px' }}>SOL</div>
          <div className="crypto-symbol" style={{ top: '75%', left: '50%', fontSize: '18px' }}>DOGE</div>
          
          {/* Floating crypto icons */}
          {coinIcons.map((coin) => (
            <motion.img
              key={coin.id}
              src={coin.image}
              alt=""
              className="crypto-float"
              style={{
                top: coin.top,
                left: coin.left,
                width: coin.size,
                height: coin.size,
                animationDuration: `${coin.duration}s`,
                animationDelay: `${coin.delay}s`
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ duration: 1, delay: coin.delay }}
            />
          ))}
          
          {/* Custom crypto shapes - símbolos de trading e gráficos */}
          <div 
            className="crypto-float" 
            style={{ 
              top: '30%', 
              left: '30%', 
              width: '30px', 
              height: '30px', 
              animationDuration: '16s',
              animationDelay: '0.5s',
              background: 'radial-gradient(circle, rgba(247, 147, 26, 0.8) 0%, rgba(0, 0, 0, 0) 70%)'
            }}
          ></div>
          
          <div 
            className="crypto-float" 
            style={{ 
              top: '60%', 
              left: '60%', 
              width: '25px', 
              height: '25px', 
              animationDuration: '14s',
              animationDelay: '1.2s',
              background: 'radial-gradient(circle, rgba(98, 126, 234, 0.8) 0%, rgba(0, 0, 0, 0) 70%)'
            }}
          ></div>
          
          <div 
            className="crypto-float" 
            style={{ 
              top: '20%', 
              left: '65%', 
              width: '20px', 
              height: '20px', 
              animationDuration: '18s',
              animationDelay: '0.8s',
              background: 'radial-gradient(circle, rgba(237, 20, 61, 0.8) 0%, rgba(0, 0, 0, 0) 70%)'
            }}
          ></div>
          
          <div 
            className="crypto-float" 
            style={{ 
              top: '70%', 
              left: '25%', 
              width: '22px', 
              height: '22px', 
              animationDuration: '20s',
              animationDelay: '1.5s',
              background: 'radial-gradient(circle, rgba(133, 219, 139, 0.8) 0%, rgba(0, 0, 0, 0) 70%)'
            }}
          ></div>
          
          {/* Novas bolhas extras */}
          <div 
            className="crypto-float" 
            style={{ 
              top: '15%', 
              left: '50%', 
              width: '18px', 
              height: '18px', 
              animationDuration: '17s',
              animationDelay: '1.7s',
              background: 'radial-gradient(circle, rgba(222, 190, 80, 0.7) 0%, rgba(0, 0, 0, 0) 70%)'
            }}
          ></div>
          
          <div 
            className="crypto-float" 
            style={{ 
              top: '85%', 
              left: '40%', 
              width: '24px', 
              height: '24px', 
              animationDuration: '19s',
              animationDelay: '0.9s',
              background: 'radial-gradient(circle, rgba(152, 114, 227, 0.7) 0%, rgba(0, 0, 0, 0) 70%)'
            }}
          ></div>
          
          <div className="flex flex-col items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <motion.div
                className="logo-text-wrapper"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ 
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1]
                }}
                onAnimationComplete={() => {
                  if (onLoadComplete) {
                    onLoadComplete();
                  }
                }}
              >
                <motion.div
                  className="logo-text font-semibold bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 1.2,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  style={{
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.2)',
                    fontWeight: 600
                  }}
                >
                  NP Exclusive Signals
                </motion.div>
              </motion.div>
              
              <div className="logo-subtitle-container">
                <div className="logo-subtitle">Sinais exclusivos para investidores de elite</div>
              </div>
              
              <div className="loader-container">
                <div className="spinner"></div>
              </div>
              
              {message && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="mt-6 text-sm text-white/70"
                >
                  {message}
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 