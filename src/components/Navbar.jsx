import dayjs from "dayjs";
import { navIcons, navLinks } from "#constants";
import useWindowStore from "#store/window";

const Navbar = () => {
  const openWindow = useWindowStore((state) => state.openWindow);

  const handleNavClick = (type) => {
    openWindow(type);
  };

  return (
    <nav>
      <div>
        <img src="/images/logo.svg" alt="logo" />
        <p className="font-bold">Srichandra's Portfolio</p>

        <ul>
          {navLinks.map(({ id, name, type }) => (
            <li key={id}>
              <button type="button" onClick={() => handleNavClick(type)}>
                {name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <ul>
          {navIcons.map(({ id, img }) => (
            <li key={id}>
              <img src={img} className="icon" alt={`icon-${id}`} />
            </li>
          ))}
        </ul>

        <time>{dayjs().format("ddd MMM D h:mm A")}</time>
      </div>
    </nav>
  );
};

export default Navbar;
