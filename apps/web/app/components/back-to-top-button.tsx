'use client';

import { useEffect, useState } from 'react';

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('main section');
      const footer = document.querySelector('footer');
      const scrollY = window.scrollY;

      let showAfterHero = scrollY > 420;
      if (heroSection instanceof HTMLElement) {
        showAfterHero = scrollY > heroSection.offsetHeight - 120;
      }

      let hideNearFooter = false;
      if (footer instanceof HTMLElement) {
        const footerTop = footer.getBoundingClientRect().top;
        hideNearFooter = footerTop <= window.innerHeight - 120;
      }

      setIsVisible(showAfterHero && !hideNearFooter);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <a
      href="#top"
      className={`fixed bottom-6 right-4 z-30 inline-flex h-[46px] items-center gap-2 rounded-full border border-[#e8e8e8] bg-white/72 px-4 text-[14px] text-[#15181d] backdrop-blur-md transition-all duration-300 hover:bg-white hover:text-[#111111] sm:bottom-8 sm:right-6 ${
        isVisible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d9dee4] bg-white text-[#171b21]">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <path
            d="M12 17V7m0 0-4 4m4-4 4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      Back to top
    </a>
  );
}
