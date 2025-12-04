import { useEffect } from "react";
import "./App.css";

function App() {
  useEffect(() => {
    subscribeFromMain();
    subscribeFromChild();
  }, []);

  function subscribeFromMain() {
    window?.mainRendererMain?.sendToRender("sendToRender", (res) => {
      console.log("[renderer] from main:", res);
    });
  }

  function subscribeFromChild() {
    window?.mainRendererMain?.getFromChild("childToRender", (res) => {
      console.log("[renderer] from child:", res);
    });
  }

  function sendToMain() {
    window?.mainRendererMain?.sendToMain("sendToMain", {
      message: "message sent from renderer to main",
    });
  }

  function invokeMain() {
    window?.mainRendererMain
      ?.invokeToMain("invokeToMain", "Hi from renderer")
      .then((res) => {
        console.log("[renderer] invokeToMain result:", res);
      })
      .catch((err) => {
        console.error("[renderer] invokeToMain error:", err);
      });
  }

  function sendToChild() {
    window?.mainRendererMain?.sendToChild("sendToChild", {
      message: "message from renderer to child",
    });
  }

  function askChild() {
    window?.mainRendererMain
      ?.askedToChild("askToChild", "Hi from renderer (askToChild)")
      .then((res) => {
        console.log("[renderer] askToChild result:", res);
      })
      .catch((err) => {
        console.error("[renderer] askToChild error:", err);
      });
  }

  return (
    <>
      <div>
        <h3>Main ↔ Renderer</h3>
        <button onClick={sendToMain}>Send to main</button>
        <button onClick={invokeMain}>Invoke main</button>
      </div>

      <hr />

      <div>
        <h3>Renderer ↔ Child (via main)</h3>
        <button onClick={sendToChild}>Send to child</button>
        <button onClick={askChild}>Ask child</button>
      </div>
    </>
  );
}

export default App;
