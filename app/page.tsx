"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Message = {
  role: string;
  text: string;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export default function Dashboard() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [command, setCommand] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "LCARS", text: "Ship computer online. Say computer to activate voice command mode." },
  ]);

  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("VOICE READY");
  const [awaitingCommand, setAwaitingCommand] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [pulse, setPulse] = useState(0);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );

      setDate(
        now.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    };

    updateClock();

    const timer = setInterval(() => {
      updateClock();
      setPulse((p) => (p + 7) % 100);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      if (!("speechSynthesis" in window)) return;

      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      if (!selectedVoice && availableVoices.length > 0) {
        const preferred =
          availableVoices.find((v) => v.name.toLowerCase().includes("tessa")) ||
          availableVoices.find((v) => v.name.toLowerCase().includes("samantha")) ||
          availableVoices.find((v) => v.name.toLowerCase().includes("alex")) ||
          availableVoices[0];

        setSelectedVoice(preferred.name);
      }
    };

    loadVoices();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus("VOICE UNSUPPORTED");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus(awaitingCommand ? "AWAITING COMMAND" : "LISTENING");
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus(awaitingCommand ? "AWAITING COMMAND" : "VOICE READY");
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus("VOICE ERROR");
      addMessage("LCARS", "Voice recognition error. Check microphone access.");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;

      const spoken = transcript.toLowerCase();

      if (!awaitingCommand && spoken.includes("computer")) {
        setAwaitingCommand(true);
        setVoiceStatus("AWAITING COMMAND");
        addMessage("VOICE", transcript);
        addMessage("LCARS", "Yes?");
        speak("Yes?");
        return;
      }

      if (awaitingCommand) {
        setAwaitingCommand(false);
        setVoiceStatus("VOICE READY");
        runCommand(transcript, true);
        return;
      }

      addMessage("VOICE", transcript);
      addMessage("LCARS", "Say computer to activate voice command mode.");
      speak("Say computer to activate voice command mode.");
    };

    recognitionRef.current = recognition;
  }, [awaitingCommand, voices, selectedVoice]);

  const stardate = useMemo(() => {
    const start = new Date("2024-01-01T00:00:00");
    const now = new Date();
    const days = (now.getTime() - start.getTime()) / 86400000;
    return (78240 + days * 0.82).toFixed(1);
  }, [time]);

  const addMessage = (role: string, text: string) => {
    setMessages((prev) => [...prev, { role, text }]);
  };

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = voices.find((v) => v.name === selectedVoice);

      if (voice) utterance.voice = voice;

      utterance.rate = 0.85;
      utterance.pitch = 0.65;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }, 120);
  };

  const isLightCommand = (text: string) => {
    const c = text.toLowerCase();

    return (
      c.includes("lights") ||
      c.includes("red") ||
      c.includes("blue") ||
      c.includes("purple") ||
      c.includes("orange") ||
      c.includes("white") ||
      c.includes("bridge mode") ||
      c.includes("movie mode") ||
      c.includes("alert mode") ||
      c.includes("red alert") ||
      c.includes("dim")
    );
  };

  const localResponse = (text: string) => {
    const c = text.toLowerCase();

    if (c.includes("status")) {
      return "All systems operational. Hue interface is online.";
    }

    if (c.includes("time")) {
      return `Current time is ${new Date().toLocaleTimeString()}.`;
    }

    if (c.includes("date")) {
      return `Current date is ${new Date().toLocaleDateString()}.`;
    }

    if (c.includes("stardate")) {
      return `Current stardate is ${stardate}.`;
    }

    if (c.includes("diagnostic")) {
      return "Running level-one diagnostic. Core interface, command parser, and Hue uplink are nominal.";
    }

    if (c.includes("scan")) {
      return "Passive scan complete. No local anomalies detected.";
    }

    if (c.includes("hello") || c.includes("hi")) {
      return "Greetings, Captain.";
    }

    if (c.includes("help")) {
      return "Available commands include status, diagnostics, scan, time, stardate, office lights on, kitchen lights off, dining lights blue, movie mode, red alert, and dim office to thirty percent.";
    }

    if (c.includes("computer")) {
      return "Computer active. Awaiting command.";
    }

    if (c.includes("silence") || c.includes("stop talking")) {
      window.speechSynthesis?.cancel();
      return "Speech output halted.";
    }

    if (c.includes("shutdown")) {
      return "Command denied. Authorization level insufficient.";
    }

    return "Command not recognized. Type help for available commands.";
  };

  const callLightsApi = async (text: string) => {
    const res = await fetch("/api/lights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command: text }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      return data.message || data.error || "Lighting command failed.";
    }

    if (text.toLowerCase().includes("movie mode")) {
      return "Movie mode engaged.";
    }

    if (text.toLowerCase().includes("red alert")) {
      return "Red alert. Lighting systems adjusted.";
    }

    return "Lighting systems adjusted.";
  };

  const runCommand = async (forcedCommand?: string, fromVoice = false) => {
    const text = (forcedCommand ?? command).trim();
    if (!text) return;

    addMessage(fromVoice ? "VOICE" : "YOU", text);

    let response = "";

    if (isLightCommand(text)) {
      response = await callLightsApi(text);
    } else {
      response = localResponse(text);
    }

    addMessage("LCARS", response);
    speak(response);
    setCommand("");
  };

  const startListening = () => {
    if (!recognitionRef.current || isListening) return;

    try {
      recognitionRef.current.start();
    } catch {
      setVoiceStatus("VOICE BUSY");
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setAwaitingCommand(false);
    setVoiceStatus("VOICE READY");
  };

  const testVoice = () => {
    speak("Voice profile selected. LCARS speech system online.");
  };

  const quickCommands = [
    "status",
    "diagnostics",
    "office lights on",
    "office lights off",
    "dining lights blue",
    "kitchen lights off",
    "movie mode",
    "red alert",
    "dim office 30 percent",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000",
        color: "#f79a67",
        display: "flex",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "94px",
          backgroundColor: "#f79a67",
          borderTopRightRadius: "42px",
          borderBottomRightRadius: "42px",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <SidePill color="#c66aa0" />
          <SidePill color="#6d97c7" />
          <SidePill color="#c89b67" />
          <div
            style={{
              height: "130px",
              borderRadius: "30px",
              backgroundColor: isListening ? "#c66aa0" : "#050505",
              marginTop: "20px",
              border: "3px solid #111",
            }}
          />
        </div>

        <div
          style={{
            color: "#111",
            fontWeight: 900,
            fontSize: "18px",
            letterSpacing: "1px",
          }}
        >
          LCARS
        </div>
      </div>

      <main style={{ flex: 1, padding: "26px 30px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr 230px",
            gap: "14px",
            marginBottom: "18px",
          }}
        >
          <Panel color="#c66aa0" title="ACCESS" />
          <div
            style={{
              backgroundColor: "#f79a67",
              color: "#111",
              borderRadius: "0 0 34px 34px",
              padding: "18px 28px",
              fontSize: "52px",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            LCARS COMMAND
          </div>
          <div style={{ display: "grid", gap: "10px" }}>
            <Panel color="#6d97c7" title="VOICE" center />
            <Panel
              color="#c89b67"
              title={awaitingCommand ? "AWAITING COMMAND" : voiceStatus}
              center
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "230px 1fr 250px",
            gap: "14px",
            marginBottom: "18px",
          }}
        >
          <div style={{ display: "grid", gap: "12px" }}>
            <InfoCard title="TIME" value={time} color="#f79a67" />
            <InfoCard title="STARDATE" value={stardate} color="#c66aa0" />
            <InfoCard title="DATE" value={date} color="#6d97c7" small />
          </div>

          <div
            style={{
              backgroundColor: "#111",
              border: "4px solid #f79a67",
              borderRadius: "34px",
              padding: "22px 26px",
              minHeight: "360px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(to bottom, rgba(247,154,103,0.035) 0px, rgba(247,154,103,0.035) 1px, transparent 2px, transparent 7px)",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              {messages.slice(-10).map((m, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: "12px",
                    fontSize: "18px",
                    opacity: i === messages.slice(-10).length - 1 ? 1 : 0.72,
                  }}
                >
                  <strong>{m.role}:</strong> {m.text}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <StatusCard
              title="CORE"
              value="READY"
              color="#c66aa0"
              meter={`${80 + (pulse % 16)}%`}
            />
            <StatusCard
              title="HUE"
              value="LINKED"
              color="#6d97c7"
              meter={`${70 + (pulse % 20)}%`}
            />
            <StatusCard
              title="AUDIO"
              value={isListening ? "LIVE" : "STANDBY"}
              color="#c89b67"
              meter={`${55 + (pulse % 25)}%`}
            />

            <div
              style={{
                backgroundColor: "#111",
                border: "3px solid #f79a67",
                borderRadius: "24px",
                padding: "14px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 900,
                  marginBottom: "8px",
                }}
              >
                VOICE PROFILE
              </div>

              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "12px",
                  backgroundColor: "#000",
                  color: "#f79a67",
                  border: "2px solid #f79a67",
                  marginBottom: "10px",
                }}
              >
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name}
                  </option>
                ))}
              </select>

              <button
                onClick={testVoice}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "14px",
                  backgroundColor: "#f79a67",
                  color: "#111",
                  border: "none",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                TEST VOICE
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          {quickCommands.map((cmd) => (
            <button
              key={cmd}
              onClick={() => runCommand(cmd)}
              style={{
                backgroundColor: "#f79a67",
                color: "#111",
                border: "none",
                borderRadius: "999px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {cmd.toUpperCase()}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 180px 180px",
            gap: "14px",
          }}
        >
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runCommand();
            }}
            placeholder="Enter command..."
            style={{
              padding: "22px 26px",
              borderRadius: "30px",
              border: "4px solid #f79a67",
              backgroundColor: "#111",
              color: "#f79a67",
              fontSize: "26px",
              outline: "none",
            }}
          />

          <button
            onClick={() => runCommand()}
            style={{
              backgroundColor: "#f79a67",
              color: "#111",
              border: "none",
              borderRadius: "30px",
              fontSize: "24px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            EXEC
          </button>

          <button
            onClick={() => (isListening ? stopListening() : startListening())}
            style={{
              backgroundColor: isListening ? "#c66aa0" : "#6d97c7",
              color: "#111",
              border: "none",
              borderRadius: "30px",
              fontSize: "24px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {isListening ? "STOP" : "LISTEN"}
          </button>
        </div>
      </main>
    </div>
  );
}

function SidePill({ color }: { color: string }) {
  return (
    <div
      style={{
        height: "44px",
        borderRadius: "999px",
        backgroundColor: color,
        marginBottom: "18px",
      }}
    />
  );
}

function Panel({
  color,
  title,
  center = false,
}: {
  color: string;
  title: string;
  center?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: color,
        color: "#111",
        borderRadius: "0 0 28px 28px",
        padding: "18px 20px",
        fontWeight: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: center ? "center" : "flex-start",
      }}
    >
      {title}
    </div>
  );
}

function InfoCard({
  title,
  value,
  color,
  small = false,
}: {
  title: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: color,
        color: "#111",
        borderRadius: "28px",
        padding: "18px 20px",
        fontWeight: 900,
      }}
    >
      <div style={{ fontSize: "14px" }}>{title}</div>
      <div
        style={{
          fontSize: small ? "18px" : "28px",
          marginTop: "8px",
          lineHeight: 1.25,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusCard({
  title,
  value,
  color,
  meter,
}: {
  title: string;
  value: string;
  color: string;
  meter: string;
}) {
  return (
    <div
      style={{
        backgroundColor: color,
        color: "#111",
        borderRadius: "28px",
        padding: "16px 18px",
        fontWeight: 900,
      }}
    >
      <div style={{ fontSize: "14px" }}>{title}</div>
      <div style={{ fontSize: "25px", marginTop: "6px" }}>{value}</div>
      <div
        style={{
          height: "10px",
          backgroundColor: "rgba(0,0,0,0.2)",
          borderRadius: "999px",
          overflow: "hidden",
          marginTop: "12px",
        }}
      >
        <div
          style={{
            width: meter,
            height: "100%",
            backgroundColor: "#111",
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}