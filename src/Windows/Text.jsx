import { WindowControls } from "#components";
import WindowWrapper from "#hoc/WindowWrapper";
import useWindowStore from "#store/window";

const Text = () => {
  const data = useWindowStore((state) => state.windows.txtfile.data);

  if (!data) return null;

  const { name, image, subtitle, description } = data;

  return (
    <>
      <div id="window-header">
        <WindowControls target="txtfile" />
        <h2 className="window-drag-handle">{name}</h2>
      </div>

      <div className="p-5 space-y-4 bg-white max-h-[70vh] overflow-y-auto">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-24 h-24 rounded-lg object-cover object-center"
          />
        ) : null}

        {subtitle ? (
          <p className="text-base font-semibold">{subtitle}</p>
        ) : null}

        {Array.isArray(description)
          ? description.map((paragraph, index) => (
              <p key={index} className="text-sm text-gray-700 leading-relaxed">
                {paragraph}
              </p>
            ))
          : null}
      </div>
    </>
  );
};

const TextWindow = WindowWrapper(Text, "txtfile");

export default TextWindow;