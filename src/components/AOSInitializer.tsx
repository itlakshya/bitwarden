'use client';

import { useEffect } from "react";
import AOS from "aos";

export default function AOSInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    AOS.init({
      duration: 800,
      once: false,
      easing: 'ease-in-out',
    });
  }, []);

  return <>{children}</>;
} 