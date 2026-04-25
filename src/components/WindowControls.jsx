import useWindowStore from "#store/window";

const WindowControls = ({ target }) => {
  const { closeWindow, minimizeWindow, maximizeWindow } = useWindowStore();

  const stopEvent = (event) => {
    event.stopPropagation();
  };

  return (
    <div id="window-controls">
      <button
        type="button"
        className="close"
        onMouseDown={stopEvent}
        onClick={(event) => {
          stopEvent(event);
          closeWindow(target);
        }}
        aria-label="Close window"
      />
      <button
        type="button"
        className="minimize"
        onMouseDown={stopEvent}
        onClick={(event) => {
          stopEvent(event);
          minimizeWindow?.(target);
        }}
        aria-label="Minimize window"
      />
      <button
        type="button"
        className="maximize"
        onMouseDown={stopEvent}
        onClick={(event) => {
          stopEvent(event);
          maximizeWindow?.(target);
        }}
        aria-label="Maximize window"
      />
    </div>
  );
};

export default WindowControls;