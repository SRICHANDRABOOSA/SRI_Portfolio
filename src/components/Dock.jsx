import { dockApps } from "#constants";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import gsap from "gsap";
import useWindowStore from "#store/window.js";
import useLocationStore from "#store/location";
import { trashLocation } from "#store/fileSystem";

const Dock = () => {
  const { openWindow, windows, closeWindow } = useWindowStore();
  const setActiveLocation = useLocationStore((state) => state.setActiveLocation);
  const dockRef = useRef(null);

  useGSAP(() => {
    const dock = dockRef.current;
    if (!dock) return;

    const icons = dock.querySelectorAll(".dock-icon");

    const animateIcon = (mouseX) => {
      const { left } = dock.getBoundingClientRect();

      icons.forEach((icon) => {
        const { left: iconLeft, width: w } = icon.getBoundingClientRect();
        const center = iconLeft - left + w / 2;
        const distance = Math.abs(mouseX - center);

        const intensity = Math.exp(-(distance ** 2.5 / 20000));

        gsap.to(icon, {
          scale: 1 + 0.25 * intensity,
          y: -15 * intensity,
          ease: "power1.out",
          duration: 0.3,
        });
      });
    };

    const handleMouseMove = (e) => {
      const { left } = dock.getBoundingClientRect();

      animateIcon(e.clientX - left);
    };

    const resetIcons = () => {
      icons.forEach((icon) =>
        gsap.to(icon, {
          scale: 1,
          y: 0,
          ease: "power1.out",
          duration: 0.3,
        }),
      );
    };

    dock.addEventListener("mousemove", handleMouseMove);
    dock.addEventListener("mouseleave", resetIcons);

    return () => {
      dock.removeEventListener("mousemove", handleMouseMove);
      dock.removeEventListener("mouseleave", resetIcons);
    };
  }, []);

  const toggleApp = (app) => {
    if (!app.canOpen) return;

    if (app.id === "trash") {
      setActiveLocation(trashLocation);
      openWindow("finder");
      return;
    }

    const window = windows[app.id];

    if (!window) {
      console.warn(`No window found for app id: ${app.id}`);
      return;
    }

    if (window.isOpen && !window.isMinimized) {
      closeWindow(app.id);
    } else {
      openWindow(app.id);
    }
  };
  return (
    <section id="dock">
      <div ref={dockRef} className="dock-container">
        {dockApps.map(({ id, name, icon, canOpen }) => (
          <div key={id} className="relative flex justify-center">
            <button
              type="button"
              className="dock-icon"
              aria-label={name}
              title={name}
              disabled={!canOpen}
              onClick={() => toggleApp({ id, canOpen })}
            >
              <img
                src={`/images/${icon}`}
                alt={`${name}-icon`}
                loading="lazy"
                className={canOpen ? "" : "opacity-60"}
              />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Dock;
