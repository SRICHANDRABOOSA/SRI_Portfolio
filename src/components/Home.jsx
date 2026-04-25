import { locations } from "#constants";
import { useGSAP } from "@gsap/react";
import useLocationStore from "#store/location";
import useWindowStore from "#store/window";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { useRef } from "react";

gsap.registerPlugin(Draggable);

const projects = locations.work?.children ?? [];
const Home = () => {
  const homeRef = useRef(null);
  const openWindow = useWindowStore((state) => state.openWindow);
  const setActiveLocation = useLocationStore((state) => state.setActiveLocation);

  const openFolderFromHome = (project) => {
    if (project?.kind !== "folder") return;

    setActiveLocation(project);
    openWindow("finder", project);
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
  }, []);

  return (
    <section id="home" ref={homeRef}>
      <ul>
        {projects.map((project) => (
          <li
            key={project.id}
            className={`group folder ${project.windowPosition ?? ""}`}
            onClick={() => openFolderFromHome(project)}
          >
            <img src="/images/folder.png" alt={project.name} />
            <p>{project.name}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Home;
