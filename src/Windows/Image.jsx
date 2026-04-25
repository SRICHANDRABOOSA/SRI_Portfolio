import { WindowControls } from "#components";
import WindowWrapper from "#hoc/WindowWrapper";
import useWindowStore from "#store/window";

const Image = () => {
  const data = useWindowStore((state) => state.windows.imgfile.data);

  if (!data) return null;

  const { name, imageUrl, image, subtitle, description } = data;
  const source = imageUrl ?? image;

  return (
    <>
      <div id="window-header">
        <WindowControls target="imgfile" />
        <h2 className="window-drag-handle">{name}</h2>
      </div>

      <div className="p-5 space-y-4 bg-white max-h-[70vh] overflow-y-auto">
        {source ? (
          <img
            src={source}
            alt={name}
            className="w-full max-h-[50vh] rounded-lg object-contain object-center"
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

const ImageWindow = WindowWrapper(Image, "imgfile");

export default ImageWindow;