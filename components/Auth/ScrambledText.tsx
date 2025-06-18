import React, { useEffect, useRef } from "react";
import './ScrambledText.css';
import { gsap } from "gsap";
import { SplitText } from "gsap/all";
import { ScrambleTextPlugin } from "gsap/all";

interface ScrambledTextProps {
  radius?: number;
  duration?: number;
  speed?: number;
  scrambleChars?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

// Make sure GSAP plugins are registered
if (typeof window !== 'undefined') {
  gsap.registerPlugin(SplitText, ScrambleTextPlugin);
}

const ScrambledText: React.FC<ScrambledTextProps> = ({
  radius = 100,
  duration = 1.2,
  speed = 0.5,
  scrambleChars = ".:",
  className = "",
  style = {},
  children,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const charsRef = useRef<HTMLElement[]>([]);
  const splitRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !rootRef.current) return;

    // Initial animation on mount
    const paragraph = rootRef.current.querySelector("p");
    if (!paragraph) return;

    try {
      const split = new SplitText(paragraph, {
        type: "chars",
        charsClass: "char",
      });
      
      charsRef.current = split.chars as HTMLElement[];
      splitRef.current = split;

      charsRef.current.forEach((c) => {
        gsap.set(c, {
          display: "inline-block",
          opacity: 0,
        });

        // Store original content for scramble effect
        if (c instanceof HTMLElement) {
          c.dataset.content = c.innerHTML;
        }
      });

      // Initial animation
      gsap.to(charsRef.current, {
        opacity: 1,
        stagger: 0.02,
        duration: 0.1,
        ease: "power1.inOut",
        onComplete: () => {
          gsap.to(charsRef.current, {
            duration: 1,
            scrambleText: {
              text: "{original}",
              chars: scrambleChars,
              speed,
            },
            ease: "none",
          });
        }
      });

      const handleMove = (e: PointerEvent) => {
        if (!rootRef.current) return;
        
        charsRef.current.forEach((c) => {
          const { left, top, width, height } = c.getBoundingClientRect();
          const dx = e.clientX - (left + width / 2);
          const dy = e.clientY - (top + height / 2);
          const dist = Math.hypot(dx, dy);

          if (dist < radius) {
            gsap.to(c, {
              overwrite: true,
              duration: duration * (1 - dist / radius),
              scrambleText: {
                text: c instanceof HTMLElement && c.dataset.content ? c.dataset.content : "",
                chars: scrambleChars,
                speed,
              },
              ease: "none",
            });
          }
        });
      };

      const el = rootRef.current;
      el.addEventListener("pointermove", handleMove);

      return () => {
        el.removeEventListener("pointermove", handleMove);
        if (splitRef.current) {
          splitRef.current.revert();
        }
      };
    } catch (error) {
      console.error("Error with GSAP SplitText or ScrambleText:", error);
    }
  }, [radius, duration, speed, scrambleChars]);

  // CSS is imported at the top of the file
  
  return (
    <div ref={rootRef} className={`text-block ${className}`}>
      <p>{children}</p>
    </div>
  );
};

export default ScrambledText;
