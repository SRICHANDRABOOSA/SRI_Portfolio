import { WindowControls } from "#components";
import WindowWrapper from "#hoc/WindowWrapper";
import { Download } from "lucide-react";

const resumePath = "/files/Resume.pdf";

const Resume = () => {
  return (
    <>
      <div id="window-header">
        <WindowControls target={"resume"} />
        <h2>Resume.pdf</h2>

        <a
          href={resumePath}
          download
          className="cursor-pointer"
          title="Download Resume"
        >
          <Download className="icon" />
        </a>
      </div>
      <object
        data={resumePath}
        type="application/pdf"
        className="w-[82vw] max-w-4xl h-[78vh] bg-white"
      >
        <a href={resumePath} download className="block p-6 text-blue-600">
          Download Resume.pdf
        </a>
      </object>
    </>
  );
};

const ResumeWindow = WindowWrapper(Resume, "resume");
export default ResumeWindow;
