import React, { useState, useRef, useEffect } from "react";
import "./App.css";

function OriginalApp({ projectName, projectId }) {
  const [url, setUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [tool, setTool] = useState("selenium"); // Default tool
  const [selectorType, setSelectorType] = useState("CSS_SELECTOR"); // Default selector type
  const [rows, setRows] = useState([]);
  const [currentRowIndex, setCurrentRowIndex] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const iframeRef = useRef(null);
  

  const toolDescriptions = {
    selenium: "Selenium: Best for dynamic websites and JavaScript-heavy content. (Cons: Slower, resource-heavy)",
    beautifulsoup: "BeautifulSoup: Best for static websites and lightweight scraping. (Cons: No JS support)",
    playwright: "Playwright: Excellent for modern JavaScript-heavy sites. (Cons: Newer, requires more setup)",
    scrapy: "Scrapy: Ideal for large-scale scraping with asynchronous crawling. (Cons: Steeper learning curve)",
    requests_html: "Requests-HTML: Great for lightweight scraping with limited JavaScript support.",
    httpx: "HTTPX: Perfect for API scraping and async tasks. (Cons: No direct HTML parsing)",
  };

  useEffect(() => {
    const loadProjectData = () => {
      const savedData = JSON.parse(localStorage.getItem(`project-${projectId}`)) || {
        url: "",
        tool: "selenium",
        selectorType: "CSS_SELECTOR",
        rows: [],
        generatedCode: "",
      };
  
      console.log("Loaded data from localStorage:", savedData);
      setUrl(savedData.url);
      setTool(savedData.tool);
      setSelectorType(savedData.selectorType);
      setRows(savedData.rows);
      setGeneratedCode(savedData.generatedCode);
    };
  
    loadProjectData();
  }, [projectId]);
  
  

  const saveProjectData = () => {
    const projectData = {
      url,
      tool,
      selectorType,
      rows,
      generatedCode,
    };
  
    console.log("Saving data to localStorage:", projectData);
    localStorage.setItem(`project-${projectId}`, JSON.stringify(projectData));
  };
  

  useEffect(() => {
    const handleMessage = (event) => {
      if (!["http://localhost:3000", "http://localhost:5000"].includes(event.origin)) {
        console.warn("Message from untrusted origin:", event.origin);
        return;
      }

      if (event.data?.type === "SELECTOR_RESPONSE" && event.data.selector) {
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
    setPreviewUrl(`http://localhost:5000/proxy?tool=${tool}&url=${encodeURIComponent(url)}`);
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
      {
        action: "initiateSelection",
        selectorType, // Pass the current selector type
      },
      "*"
    );
  };
  
  const addRow = () => {
    setRows((prevRows) => {
      const updatedRows = [...prevRows, { name: "", selector: "", selectorType }];
      saveProjectData(); // Save immediately
      return updatedRows;
    });
  };
  
  
  const removeRow = (index) => {
    setRows((prevRows) => {
      const updatedRows = prevRows.filter((_, i) => i !== index);
      saveProjectData(); // Save immediately
      return updatedRows;
    });
  };
  
  
  const updateRowName = (index, value) => {
    setRows((prevRows) => {
      const updatedRows = [...prevRows];
      updatedRows[index].name = value;
      saveProjectData(); // Save immediately
      return updatedRows;
    });
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
from ${tool === "selenium" ? "selenium" : tool} import webdriver
${tool === "selenium" ? `
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
` : ""}
# Configure WebDriver
${tool === "selenium" ? `
chrome_options = Options()
chrome_options.add_argument("--headless")  # Run in headless mode
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

driver = webdriver.Chrome(options=chrome_options)` : `
driver = webdriver.${tool === "playwright" ? "playwright" : "http"}()`}
try:
    # Load the URL
    url = "${url}"
    driver.get(url)

    # Extract data using selectors
    data = {}
    ${rows
      .map((row) => {
        let selector = row.selector;
        if (row.selectorType === "XPATH") {
          selector = ensureAbsoluteXPath(row.selector);
        } else if (row.selectorType === "CLASS_NAME") {
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
          <h3>Select Tool</h3>
          <div>
            {Object.keys(toolDescriptions).map((toolKey) => (
              <div className="tooltip" key={toolKey}>
                <label>
                  <input
                    type="radio"
                    name="tool"
                    value={toolKey}
                    checked={tool === toolKey}
                    onChange={(e) => setTool(e.target.value)}
                  />
                  {toolKey.charAt(0).toUpperCase() + toolKey.slice(1)}
                  <span className="tooltiptext">{toolDescriptions[toolKey]}</span>
                </label>
              </div>
            ))}
          </div>

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

          <input
            type="text"
            placeholder="Enter URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ width: "97%", marginBottom: "10px", padding: "8px" }}
          />
          <button
            onClick={handlePreview}
            style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
          >
            Preview Website
          </button>

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
                        value={row.name || ""} // Ensure the Name field is populated
                        onChange={(e) => updateRowName(index, e.target.value)}
                        placeholder="Element Name"
                        className="input-field"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.selector || ""} // Ensure the Selector field is populated
                        onChange={(e) => {
                          const updatedRows = [...rows];
                          updatedRows[index].selector = e.target.value;
                          setRows(updatedRows);
                          saveProjectData(); // Save immediately
                        }}
                        placeholder="CSS Selector / XPath"
                        className="input-field"
                      />
                    </td>
                    <td>{row.selectorType || "CSS_SELECTOR"}</td> {/* Populate Selector Type */}
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

export default OriginalApp;
