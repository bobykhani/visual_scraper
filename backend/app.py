from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import logging
from fake_useragent import UserAgent

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})  # Adjust CORS as needed

logging.basicConfig(level=logging.INFO)

@app.route('/')
def home():
    return "Welcome to the Visual Web Scraper API!"

@app.route('/proxy', methods=['GET'])
def proxy():
    url = request.args.get('url')
    selector_type = request.args.get('selectorType', 'CSS_SELECTOR')  # Default to CSS_SELECTOR
    if not url:
        return "URL parameter is missing", 400

    try:
        # Configure Selenium WebDriver
        chrome_options = Options()
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--headless")  # Run in headless mode
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option("useAutomationExtension", False)

        # Add user-agent
        user_agent = UserAgent().random  # Random user agent
        chrome_options.add_argument(f"user-agent={user_agent}")

        driver = webdriver.Chrome(options=chrome_options)
        driver.get(url)

        # Wait until the page is fully loaded
        WebDriverWait(driver, 10).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )

        # Inject JavaScript into the page
        injected_script = f"""
                            <script>
                                console.log('Injected script is running with selectorType: {selector_type}');
                                window.addEventListener('message', function(event) {{
                                    if (event.data.action === 'initiateSelection') {{
                                        const selectedType = event.data.selectorType; // Use this dynamically
                                        document.body.style.cursor = 'crosshair';

                                        document.addEventListener('mouseover', function(e) {{
                                            e.target.style.outline = '2px solid red';
                                        }});

                                        document.addEventListener('mouseout', function(e) {{
                                            e.target.style.outline = '';
                                        }});

                                        document.addEventListener('click', function(e) {{
                                            e.preventDefault();
                                            e.stopPropagation();

                                            const getSelector = (el) => {{
                                                if (!el) return '';
                                                if (selectedType === "CSS_SELECTOR") {{
                                                    let stack = [];
                                                    while (el.parentNode !== null) {{
                                                        let sibCount = 0;
                                                        let sibIndex = 0;
                                                        for (let i = 0; i < el.parentNode.childNodes.length; i++) {{
                                                            let sib = el.parentNode.childNodes[i];
                                                            if (sib.nodeName === el.nodeName) {{
                                                                if (sib === el) sibIndex = sibCount;
                                                                sibCount++;
                                                            }}
                                                        }}
                                                        let nodeName = el.nodeName.toLowerCase();
                                                        if (el.id) {{
                                                            stack.unshift(`${{nodeName}}#${{el.id}}`);
                                                            break;
                                                        }} else if (sibCount > 1) {{
                                                            stack.unshift(`${{nodeName}}:nth-of-type(${{sibIndex + 1}})`);
                                                        }} else {{
                                                            stack.unshift(nodeName);
                                                        }}
                                                        el = el.parentNode;
                                                    }}
                                                    return stack.join(' > ');
                                                }} else if (selectedType === "CLASS_NAME") {{
                                                    return el.className || '';
                                                }} else if (selectedType === "ID") {{
                                                    return el.id || '';
                                                }} else if (selectedType === "TAG_NAME") {{
                                                    return el.tagName || '';
                                                }} else if (selectedType === "XPATH") {{
                                                    const getXPath = (el) => {{
                                                        if (el.id !== '') {{
                                                            return 'id("' + el.id + '")';
                                                        }}
                                                        if (el === document.body) {{
                                                            return el.tagName.toLowerCase();
                                                        }}
                                                        let ix = 0;
                                                        const siblings = el.parentNode.childNodes;
                                                        for (let i = 0; i < siblings.length; i++) {{
                                                            const sibling = siblings[i];
                                                            if (sibling === el) {{
                                                                return getXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                                                            }}
                                                            if (sibling.nodeType === 1 && sibling.tagName === el.tagName) {{
                                                                ix++;
                                                            }}
                                                        }}
                                                    }};
                                                    return getXPath(el);
                                                }}
                                            }};

                                            const selector = getSelector(e.target);
                                            console.log('Computed selector:', selector);

                                            window.parent.postMessage({{ type: 'SELECTOR_RESPONSE', selector, selectorType: selectedType }}, '*');
                                            document.body.style.cursor = 'default';
                                        }});
                                    }}
                                }});
                            </script>
                            """


        # Inject the script into the page
        rendered_html = driver.page_source.replace("</body>", f"{injected_script}</body>")
        driver.quit()
        return Response(rendered_html, content_type="text/html")

    except Exception as e:
        logging.error(f"Error proxying request: {e}")
        return str(e), 500


@app.route('/scrape', methods=['POST'])
def scrape():
    data = request.get_json()
    url = data.get('url')
    selector = data.get('selector')
    selector_type = data.get('selectorType', 'CSS_SELECTOR')  # Default to CSS_SELECTOR

    if not url or not selector or not selector_type:
        return jsonify({"error": "URL, selector, or selector type is missing"}), 400

    try:
        # Configure Selenium WebDriver
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        driver = webdriver.Chrome(options=chrome_options)

        # Load the page
        driver.get(url)
        driver.implicitly_wait(10)

        # Map the selector type to Selenium's By methods
        selector_by_map = {
            "CSS_SELECTOR": By.CSS_SELECTOR,
            "XPATH": By.XPATH,
            "CLASS_NAME": By.CLASS_NAME,
            "ID": By.ID,
            "TAG_NAME": By.TAG_NAME,
        }
        by_method = selector_by_map.get(selector_type, By.CSS_SELECTOR)

        # Find elements matching the selector
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((by_method, selector))
        )
        def ensure_absolute_xpath(xpath):
            if xpath.startswith("/") and not xpath.startswith("/html"):
                return f"/html{xpath}"
            return xpath

        # Example Usage in Script
        xpath = "body/div[1]/p[1]"  # Example
        absolute_xpath = ensure_absolute_xpath(xpath)  # /html/body/div[1]/p[1]
        elements = driver.find_elements(By.XPATH, absolute_xpath)

        results = [el.text for el in elements]

        driver.quit()
        return jsonify(results)

    except Exception as e:
        logging.error(f"Scrape error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
