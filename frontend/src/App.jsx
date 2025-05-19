import React from "react";
import './App.css';

function App() {
  return (
    <>
      <h1>Mausam – Your Weather Buddy 🌤️</h1>
      <df-messenger
        intent="WELCOME"
        chat-title="mausam"
        agent-id="9f948bfb-99dd-4a58-9d67-36f7e45b3584"
        language-code="en"
      ></df-messenger>
    </>
  );
}

export default App;
