import { AprilTagDisplay } from "./features/apriltag/AprilTagDisplay";
import { RecorderApp } from "./features/recorder/RecorderApp";

function App() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("show") === "apriltag") {
    return <AprilTagDisplay />;
  }
  return <RecorderApp />;
}

export default App;
