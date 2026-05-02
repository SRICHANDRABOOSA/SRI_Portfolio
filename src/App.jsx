import { Dock, Home, Navbar, Welcome } from "#components";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import {
  Contact,
  Finder,
  Image,
  PuterCloud,
  Resume,
  Safari,
  Terminal,
  Text,
} from "#windows";
gsap.registerPlugin(Draggable);

const App = () => {
  return (
    <main>
      <Navbar />
      <Welcome />
      <Dock />

      <Terminal />
      <Safari />
      <Resume />
      <Finder />
      <Text />
      <Image />
      <Contact />
      <PuterCloud />
      <Home />
    </main>
  );
};

export default App;
