import React, { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const [url, setUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectorType, setSelectorType] = useState("CSS_SELECTOR"); // Default selector type
  const [rows, setRows] = useState([]);
  const [currentRowIndex, setCurrentRowIndex] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const iframeRef = useRef(null);

  const projectName = "Test Project 1";

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
    // Update the selectorType for the row dynamically
    const updatedRows = [...rows];
    updatedRows[rowIndex].selectorType = selectorType;
    setRows(updatedRows);

    setCurrentRowIndex(rowIndex);
    iframe.contentWindow.postMessage(
      { action: "initiateSelection", selectorType },
      "http://localhost:5000"
    );
  };

  const addRow = () => {
    setRows([...rows, { name: "", selector: "", selectorType }]);
  };

  const removeRow = (index) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
  };

  const updateRowName = (index, value) => {
    const updatedRows = [...rows];
    updatedRows[index].name = value;
    setRows(updatedRows);
  };

  const ensureAbsoluteXPath = (xpath) => {
    if (xpath.startsWith("/") && !xpath.startsWith("/html")) {
      return `/html${xpath}`;
    }
    if (!xpath.startsWith("/")) {
      return `/html/${xpath}`;
    }
    return xpath;
  };
  
  const ensureClassNameAsCssSelector = (className) => {
    return className.trim().replace(/\s+/g, "."); // Replace spaces with dots
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

driver = webdriver.Chrome(options=chrome_options)

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
        let selector = row.selector;
        if (row.selectorType === "XPATH") {
          // Ensure absolute XPath
          selector = ensureAbsoluteXPath(row.selector);
        } else if (row.selectorType === "CLASS_NAME") {
          // Convert class name with spaces into valid CSS selector
          selector = ensureClassNameAsCssSelector(row.selector);
        }
        return `
    elements = driver.find_elements(By.${row.selectorType}, "${selector}")
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
  
  

  const saveToFile = () => {
    if (!generatedCode) {
      alert("No code to save! Generate Python code first.");
      return;
    }
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "scraper.py"; // Default filename
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copyToClipboard = () => {
    if (!generatedCode) {
      alert("No code to copy! Generate Python code first.");
      return;
    }
    navigator.clipboard.writeText(generatedCode).then(() => {
      alert("Code copied to clipboard!");
    }).catch(() => {
      alert("Failed to copy code to clipboard.");
    });
  };

  return (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <h1>Visual Scraper</h1>
          <p>Project Name: <strong>{projectName}</strong></p>
        </div>
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
          <button
            onClick={handlePreview}
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
          >
            Preview Website
          </button>

          {/* Selector Type Section */}
          <h3>Select Selector Type</h3>
          <div>
            <label>
              <input
                type="radio"
                name="selectorType"
                value="CSS_SELECTOR"
                checked={selectorType === "CSS_SELECTOR"}
                onChange={(e) => setSelectorType(e.target.value)}
              />
              CSS Selector
            </label>
            <br />
            <label>
              <input
                type="radio"
                name="selectorType"
                value="XPATH"
                checked={selectorType === "XPATH"}
                onChange={(e) => setSelectorType(e.target.value)}
              />
              XPath
            </label>
            <br />
            <label>
              <input
                type="radio"
                name="selectorType"
                value="CLASS_NAME"
                checked={selectorType === "CLASS_NAME"}
                onChange={(e) => setSelectorType(e.target.value)}
              />
              Class Name
            </label>
            <br />
            <label>
              <input
                type="radio"
                name="selectorType"
                value="ID"
                checked={selectorType === "ID"}
                onChange={(e) => setSelectorType(e.target.value)}
              />
              ID
            </label>
            <br />
            <label>
              <input
                type="radio"
                name="selectorType"
                value="TAG_NAME"
                checked={selectorType === "TAG_NAME"}
                onChange={(e) => setSelectorType(e.target.value)}
              />
              Tag Name
            </label>
          </div>

          <button
            onClick={addRow}
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
          >
            Add Row
          </button>
          <button
            onClick={generatePythonCode}
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
          >
            Generate Python Code
          </button>
          <button
            onClick={saveToFile}
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
          >
            Save Python File
          </button>
          <button
            onClick={copyToClipboard}
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
          >
            Copy to Clipboard
          </button>
          <button
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
            disabled
          >
            Schedule Trigger
          </button>
          <button
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
            disabled
          >
            Run Now
          </button>
          <button
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
            disabled
          >
            Logs
          </button>
          <button
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
            disabled
          >
            Connect to Database
          </button>
          <button
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
            disabled
          >
            Logout
          </button>
        </div>
        <div className="right-panel">
          <div className="iframe-container">
            <h2>Website Preview</h2>
            {previewUrl && (
              <iframe
                src={previewUrl}
                ref={iframeRef}
                title="Website Preview"
                style={{ width: "100%", height: "100%" }}
                allow="clipboard-read; clipboard-write"
              ></iframe>
            )}
          </div>
          <div className="table-container">
            <h2>Element Table</h2>
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Selector</th>
                  <th>Selector Type</th>
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
                        className="input-field"
                      />
                    </td>
                    <td>{row.selector || <span className="placeholder-text">No Selector</span>}</td>
                    <td>{row.selectorType}</td>
                    <td>
                      <button
                        onClick={() => enableElementSelection(index)}
                        className="select-button"
                      >
                        Select
                      </button>
                      <button
                        onClick={() => removeRow(index)}
                        className="remove-button"
                      >
                        Remove Row
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
