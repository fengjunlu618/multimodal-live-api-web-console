/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cn from "classnames";
import { useEffect, useRef, useState, useCallback } from "react";
import { RiSidebarFoldLine, RiSidebarUnfoldLine } from "react-icons/ri";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";
import Logger, { LoggerFilterType } from "../logger/Logger";
import "./side-panel.scss";
import { filterOptions } from "./filter-options";
import { voiceOptions } from "./voice-options";
import { modalityOptions } from "./modality-options";
import storage from "../../lib/storage";

const filterOptions = [
  { value: "conversations", label: "Conversations" },
  { value: "tools", label: "Tool Use" },
  { value: "none", label: "All" },
];

export default function SidePanel() {
  const { connected, client, config, setConfig } = useLiveAPIContext();
  const [open, setOpen] = useState(true);
  const loggerRef = useRef<HTMLDivElement>(null);
  const loggerLastHeightRef = useRef<number>(-1);
  const { log, logs } = useLoggerStore();

  // 状态管理
  const [textInput, setTextInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
  } | null>(() => {
    const saved = storage.get('FILTER');
    return saved || { value: "none", label: "全部" };
  });
  
  const [selectedVoice, setSelectedVoice] = useState<{
    value: string;
    label: string;
  }>(() => {
    const saved = storage.get('CONFIG');
    return saved?.voice || { value: "Aoede", label: "Aoede" };
  });

  const [selectedModality, setSelectedModality] = useState<{
    value: string;
    label: string;
  }>(() => {
    const saved = storage.get('CONFIG');
    return saved?.modality || { value: "audio", label: "音频输出" };
  });

  const [volume, setVolume] = useState(() => {
    return storage.get('VOLUME') || 1;
  });

  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 错误处理
  const handleError = useCallback(async (error: Error) => {
    setError(error.message);
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      try {
        await client.connect(config);
      } catch (e) {
        handleError(e);
      }
    }
  }, [client, config, retryCount]);

  // 音量控制
  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    storage.set('VOLUME', value);
    client.setVolume?.(value);
  }, [client]);

  // 配置持久化
  useEffect(() => {
    storage.set('CONFIG', {
      voice: selectedVoice,
      modality: selectedModality,
    });
  }, [selectedVoice, selectedModality]);

  useEffect(() => {
    storage.set('FILTER', selectedOption);
  }, [selectedOption]);

  // 键盘快捷键
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleSubmit();
    }
  }, []);

  const handleSubmit = () => {
    if (!textInput.trim()) return;
    
    try {
      client.send([{ text: textInput }]);
      setTextInput("");
      if (inputRef.current) {
        inputRef.current.innerText = "";
      }
    } catch (e) {
      handleError(e);
    }
  };

  return (
    <div className={`side-panel ${open ? "open" : ""}`}>
      <header className="top">
        <h2>Console</h2>
        <button className="opener" onClick={() => setOpen(!open)}>
          {open ? <RiSidebarFoldLine color="#b4b8bb" /> : <RiSidebarUnfoldLine color="#b4b8bb" />}
        </button>
      </header>

      <section className="indicators">
        <Select
          className="react-select"
          value={selectedOption}
          onChange={(option) => setSelectedOption(option)}
          options={filterOptions}
          isDisabled={!connected}
        />
        <div className={cn("streaming-indicator", { connected })}>
          {connected ? "🔵 Streaming" : "⏸️ Paused"}
        </div>
      </section>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="logger" ref={loggerRef}>
        <Logger filter={selectedOption?.value as LoggerFilterType} />
      </div>

      <div className="input-section">
        <div className="input-controls">
          <Select
            className="react-select modality-select"
            value={selectedModality}
            onChange={(option) => {
              setSelectedModality(option);
              setConfig({
                ...config,
                responseModalities: [option.value],
              });
            }}
            options={modalityOptions}
            isDisabled={!connected}
          />

          {selectedModality.value === "audio" && (
            <>
              <Select
                className="react-select voice-select"
                value={selectedVoice}
                onChange={(option) => {
                  setSelectedVoice(option);
                  setConfig({
                    ...config,
                    speechConfig: { voice: option.value },
                  });
                }}
                options={voiceOptions}
                isDisabled={!connected}
              />
              <div className="volume-control">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  disabled={!connected}
                />
              </div>
            </>
          )}
        </div>

        <div className="input-area">
          <textarea
            ref={inputRef}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            maxLength={1000}
          />
          <button onClick={handleSubmit} disabled={!connected || !textInput.trim()}>
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
