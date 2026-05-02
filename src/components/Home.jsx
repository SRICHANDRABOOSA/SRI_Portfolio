import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { useRef } from "react";
import useFileSystemStore from "#store/fileSystem";
import useLocationStore from "#store/location";
import useWindowStore from "#store/window";

gsap.registerPlugin(Draggable);

const Home = () => {
  const homeRef = useRef(null);
  const desktopItems = useFileSystemStore((state) => state.desktopItems);
  const setActiveLocation = useLocationStore((state) => state.setActiveLocation);
  const openWindow = useWindowStore((state) => state.openWindow);

  const openDesktopItem = (item) => {
    if (item.kind !== "folder") return;

    setActiveLocation(item);
    openWindow("finder");
  };

  useGSAP(() => {
    const root = homeRef.current;
    if (!root) return;

    const folders = root.querySelectorAll(".folder");
    const draggables = [];
    const PADDING = 8;

    const getViewportBounds = (element) => ({
      minX: PADDING,
      minY: PADDING,
      maxX: window.innerWidth - element.offsetWidth - PADDING,
      maxY: window.innerHeight - element.offsetHeight - PADDING,
    });

    folders.forEach((folder) => {
      const [dragInstance] = Draggable.create(folder, {
        type: "x,y",
        bounds: getViewportBounds(folder),
        edgeResistance: 0.8,
      });

      draggables.push(dragInstance);
    });

    return () => {
      draggables.forEach((dragInstance) => dragInstance?.kill());
    };
  }, [desktopItems]);

  return (
    <section id="home" ref={homeRef}>
      <ul>
        {desktopItems.map((item) => (
          <li
            key={item.id}
            className={`group folder ${item.desktopPosition ?? ""}`}
            onClick={() => openDesktopItem(item)}
          >
            <img src={item.icon} alt={item.name} />
            <p>{item.name}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Home;
