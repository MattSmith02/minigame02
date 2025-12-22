// App.tsx
import React, { useState } from "react";
import { generateResponse } from "./myAI";

const App: React.FC = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const handleClick = () => {
    const result = generateResponse(input);
    setOutput(result);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>My AI App</h1>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ width: "300px", padding: "0.5rem", marginRight: "1rem" }}
      />
      <button onClick={handleClick} style={{ padding: "0.5rem 1rem" }}>
        Run AI
      </button>
      {output && (
        <p style={{ marginTop: "1rem" }}>
          <strong>Output:</strong> {output}
        </p>
      )}
    </div>
  );
};

export default App;
