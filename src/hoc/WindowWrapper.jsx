import useWindowStore from "#store/window";
import { useGSAP } from "@gsap/react";
import { useLayoutEffect } from "react";
import { useRef } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";

gsap.registerPlugin(Draggable);

const WindowWrapper = (Component, windowKey) => {
  const Wrapped = (props) => {
    const { focusWindow, windows } = useWindowStore();
    const windowState = windows[windowKey];
    const ref = useRef(null);

    useGSAP(() => {
      const el = ref.current;
      if (!el) return;

      if (windowState?.isOpen && !windowState?.isMaximized) {
        el.style.opacity = "1";
        el.style.transform = "translateY(0px)";

        const dragHandle =
          el.querySelector(".window-drag-handle") ??
          el.querySelector("#window-header") ??
          el;

        const [draggable] = Draggable.create(el, {
          type: "x,y",
          trigger: dragHandle,
          bounds: "body",
          onPress: (event) => {
            if (event?.target?.closest("#window-controls")) {
              return false;
            }

            focusWindow(windowKey);
          },
        });

        return () => {
          draggable?.kill();
        };
      }
    }, [windowState?.isOpen, windowState?.isMaximized]);

    useLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;

      const visible = windowState?.isOpen && !windowState?.isMinimized;
      el.style.display = visible ? "block" : "none";

      if (windowState?.isMaximized) {
        gsap.set(el, { x: 0, y: 0 });
      }

      if (visible) {
        gsap.fromTo(
          el,
          { scale: 0.8, opacity: 0, y: 40 },
          { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
        );
      }
    }, [
      windowState?.isOpen,
      windowState?.isMinimized,
      windowState?.isMaximized,
    ]);

    return (
      <section
        id={windowKey}
        ref={ref}
        style={{
          zIndex: windowState?.zIndex ?? 0,
          width: windowState?.isMaximized ? "100vw" : undefined,
          height: windowState?.isMaximized ? "100vh" : undefined,
          top: windowState?.isMaximized ? 0 : undefined,
          left: windowState?.isMaximized ? 0 : undefined,
          borderRadius: windowState?.isMaximized ? 0 : undefined,
        }}
        className="absolute"
        onMouseDown={() => focusWindow(windowKey)}
      >
        <Component {...props} />
      </section>
    );
  };

  Wrapped.displayName = `WindowWrapper(${Component.displayName || Component.name || "Component"})`;

  return Wrapped;
};

export default WindowWrapper;
