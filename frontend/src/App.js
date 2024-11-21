import React, { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const [url, setUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectorType, setSelectorType] = useState("");
  const [rows, setRows] = useState([]);
  const [currentRowIndex, setCurrentRowIndex] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const iframeRef = useRef(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (!["http://localhost:3000", "http://localhost:5000"].includes(event.origin)) {
        console.warn("Message from untrusted origin:", event.origin);
        return;
      }

      if (event.data?.type === "SELECTOR_RESPONSE" && event.data.selector) {
        console.log(`Selector (${event.data.selectorType}):`, event.data.selector);

        if (currentRowIndex !== null) {
          const updatedRows = [...rows];
          updatedRows[currentRowIndex].selector = event.data.selector;
          setRows(updatedRows);
          setCurrentRowIndex(null);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [rows, currentRowIndex]);

  const handlePreview = () => {
    if (!url) {
      alert("Please enter a valid URL.");
      return;
    }
    setPreviewUrl(`http://localhost:5000/proxy?url=${encodeURIComponent(url)}`);
  };

  const enableElementSelection = (rowIndex) => {
    if (!selectorType) {
      alert("Please select a selector type!");
      return;
    }
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) {
      alert("Preview the website first before selecting elements.");
      return;
    }
    setCurrentRowIndex(rowIndex);
    iframe.contentWindow.postMessage(
      { action: "initiateSelection", selectorType },
      "http://localhost:5000"
    );
  };

  const addRow = () => {
    setRows([...rows, { name: "", selector: "" }]);
  };

  const updateRowName = (index, value) => {
    const updatedRows = [...rows];
    updatedRows[index].name = value;
    setRows(updatedRows);
  };

  const generatePythonCode = () => {
    if (!url || rows.length === 0) {
      alert("Please enter a URL and add at least one element to generate code.");
      return;
    }
  
    const scraperCode = `
  from selenium import webdriver
  from selenium.webdriver.common.by import By
  from selenium.webdriver.chrome.service import Service
  from selenium.webdriver.chrome.options import Options
  
  # Configure Selenium WebDriver
  chrome_options = Options()
  chrome_options.add_argument("--headless")  # Run in headless mode
  chrome_options.add_argument("--no-sandbox")
  chrome_options.add_argument("--disable-dev-shm-usage")
  service = Service("path/to/chromedriver")  # Update this path to your ChromeDriver
  
  driver = webdriver.Chrome(service=service, options=chrome_options)
  
  try:
      # Load the URL
      url = "${url}"
      driver.get(url)
  
      # Wait for the page to load
      driver.implicitly_wait(10)  # Adjust wait time if needed
  
      # Extract data using selectors
      data = {}
      ${rows
        .map((row) => {
          return `
      elements = driver.find_elements(By.CSS_SELECTOR, "${row.selector}")
      data["${row.name}"] = [el.text for el in elements]`;
        })
        .join("\n")}
  
      # Print extracted data
      for key, value in data.items():
          print(f"{key}: {value}")
  
  finally:
      driver.quit()
  `;
  
    setGeneratedCode(scraperCode);
  };
  
  

  const handlePreviewToTableMove = (e) => {
    const rightPanel = document.querySelector(".right-panel");
    const totalHeight = rightPanel.offsetHeight;
    const previewHeight = (e.clientY / totalHeight) * 100;
    const tableHeight = 100 - previewHeight - 1;

    if (previewHeight < 10 || tableHeight < 10) return;

    rightPanel.style.gridTemplateRows = `${previewHeight}% 1% auto`;
  };

  const handleTableToCodeMove = (e) => {
    const rightPanel = document.querySelector(".right-panel");
    const totalHeight = rightPanel.offsetHeight;
    const tableContainer = document.querySelector(".table-container");
    const generatedCode = document.querySelector(".generated-code");
    const tableHeight = (e.clientY / totalHeight) * 100;
    const codeHeight = 100 - tableHeight - 1;

    if (tableHeight < 10 || codeHeight < 10) return;

    tableContainer.style.height = `${tableHeight}%`;
    generatedCode.style.height = `${codeHeight}%`;
  };

  const handleMouseUp = () => {
    window.removeEventListener("mousemove", handlePreviewToTableMove);
    window.removeEventListener("mousemove", handleTableToCodeMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  const handleMouseDown = (type) => {
    if (type === "previewToTable") {
      window.addEventListener("mousemove", handlePreviewToTableMove);
    } else if (type === "tableToCode") {
      window.addEventListener("mousemove", handleTableToCodeMove);
    }
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Visual Scraper with Adjustable Layout</h1>
      </header>
      <div className="content">
        <div className="left-panel">
          <input
            type="text"
            placeholder="Enter URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
          />
          <button onClick={handlePreview} style={{ width: "100%", padding: "10px", marginBottom: "10px" }}>
            Preview Website
          </button>
          <div>
            <h3>Select Selector Type</h3>
            <label>
              <input
                type="radio"
                name="selectorType"
                value="xpath"
                onChange={(e) => setSelectorType(e.target.value)}
              />
              XPath
            </label>
            <br />
            <label>
              <input
                type="radio"
                name="selectorType"
                value="css"
                onChange={(e) => setSelectorType(e.target.value)}
              />
              CSS Selector
            </label>
            <br />
            <label>
              <input
                type="radio"
                name="selectorType"
                value="attribute"
                onChange={(e) => setSelectorType(e.target.value)}
              />
              Attribute Selector
            </label>
          </div>
          <button
            onClick={addRow}
            style={{ width: "100%", padding: "10px", marginTop: "10px" }}
          >
            Add Row
          </button>
          <button
            onClick={generatePythonCode}
            style={{ width: "100%", padding: "10px", marginTop: "10px" }}
          >
            Generate Python Code
          </button>
        </div>
        <div className="right-panel">
          <div className="iframe-container">
            <h2>Website Preview</h2>
            {previewUrl && (
              <iframe
                src={previewUrl}
                ref={iframeRef}
                onLoad={() => console.log('Preview loaded')}
                title="Website Preview"
                style={{ width: "100%", height: "100%" }}
                allow="clipboard-read; clipboard-write"
              ></iframe>
            )}
          </div>
          <div className="divider" onMouseDown={() => handleMouseDown("previewToTable")}></div>
          <div className="table-container">
            <h2>Element Table</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Selector</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRowName(index, e.target.value)}
                        placeholder="Element Name"
                      />
                    </td>
                    <td>{row.selector}</td>
                    <td>
                      <button onClick={() => enableElementSelection(index)}>Select</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divider" onMouseDown={() => handleMouseDown("tableToCode")}></div>
          <div className="generated-code">
            <h2>Generated Python Code</h2>
            <pre>{generatedCode || "Click 'Generate Python Code' to see the output here."}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
