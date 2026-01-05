import React, { useEffect, useState } from "react";
import "./App.css";

const OPEN_WEATHER_KEY = import.meta.env.VITE_OPEN_WEATHER_KEY;

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [theme, setTheme] = useState("sunny");

  /* 🌍 REAL WEATHER THEME */
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;

      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPEN_WEATHER_KEY}`
      );
      const data = await res.json();

      const weather = data.weather[0].main.toLowerCase();
      const hour = new Date().getHours();

      if (hour >= 19 || hour <= 5) setTheme("night");
      else if (weather.includes("rain")) setTheme("rainy");
      else if (weather.includes("cloud")) setTheme("cloudy");
      else setTheme("sunny");
    });
  }, []);

  /* 🔊 AUTO TTS FOR BOT REPLIES */
  useEffect(() => {
    const df = document.querySelector("df-messenger");
    if (!df) return;

    df.addEventListener("df-response-received", (e) => {
      if (!voiceEnabled) return;

      const msg = e.detail.response.queryResult.fulfillmentText;
      if (!msg) return;

      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = "en-US";
      utterance.rate = 1;
      speechSynthesis.speak(utterance);
    });
  }, [voiceEnabled]);

  /* 🎙️ VOICE INPUT */
  const startVoice = () => {
    if (!voiceEnabled) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      const df = document.querySelector("df-messenger");
      const shadow = df.shadowRoot;
      const input = shadow.querySelector("input");
      const send = shadow.querySelector("button");

      input.value = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      send.click();
    };
  };

  return (
    <div className={`app ${theme} ${darkMode ? "dark" : ""}`}>
      {/* 💎 GLASS HERO */}
      <div className="hero">
        <h1>Mausam 🌦️</h1>
        <p>Your AI weather companion</p>

        <div className="actions">
          <button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>

          <button
            className={voiceEnabled ? "active" : ""}
            onClick={() => setVoiceEnabled(!voiceEnabled)}
          >
            🔊 Voice {voiceEnabled ? "ON" : "OFF"}
          </button>

          <button onClick={startVoice}>🎙 Ask by Voice</button>
        </div>
      </div>

      {/* 🤖 CHATBOT */}
      <df-messenger
        intent="WELCOME"
        chat-title="Mausam"
        agent-id="9f948bfb-99dd-4a58-9d67-36f7e45b3584"
        language-code="en"
      ></df-messenger>
    </div>
  );
}

export default App;
