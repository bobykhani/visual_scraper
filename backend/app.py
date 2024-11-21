from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import logging
from fake_useragent import UserAgent
from selenium.webdriver.support.ui import WebDriverWait

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})  # Adjust CORS as needed

logging.basicConfig(level=logging.INFO)

@app.route('/')
def home():
    return "Welcome to the Visual Web Scraper API!"

@app.route('/proxy', methods=['GET'])
def proxy():
    url = request.args.get('url')
    if not url:
        return "URL parameter is missing", 400

    try:
        # Configure Selenium WebDriver
        chrome_options = Options()
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option("useAutomationExtension", False)

        # Add user-agent
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.110 Safari/537.36"
        chrome_options.add_argument(f"user-agent={user_agent}")

        driver = webdriver.Chrome(options=chrome_options)

        # Load the page
        driver.get(url)

        # Wait until the page is fully loaded
        WebDriverWait(driver, 30).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )

        # Inject JavaScript into the HTML
        # Inject JavaScript into the rendered HTML
        injected_script = """
        <script>
            console.log('Injected script is running.');

            window.addEventListener('message', function(event) {
                console.log('Message received:', event.data);

                if (event.data.action === 'initiateSelection') {
                    console.log('Selection mode activated.');
                    document.body.style.cursor = 'crosshair';

                    document.addEventListener('mouseover', function(e) {
                        e.target.style.outline = '2px solid red';
                    });

                    document.addEventListener('mouseout', function(e) {
                        e.target.style.outline = '';
                    });

                    document.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        const getDomPath = (el) => {
                            if (!el) return '';
                            let stack = [];
                            while (el.parentNode !== null) {
                                let sibCount = 0;
                                let sibIndex = 0;
                                for (let i = 0; i < el.parentNode.childNodes.length; i++) {
                                    let sib = el.parentNode.childNodes[i];
                                    if (sib.nodeName === el.nodeName) {
                                        if (sib === el) sibIndex = sibCount;
                                        sibCount++;
                                    }
                                }
                                let nodeName = el.nodeName.toLowerCase();
                                if (el.id) {
                                    stack.unshift(`${nodeName}#${el.id}`);
                                    break;
                                } else if (sibCount > 1) {
                                    stack.unshift(`${nodeName}:nth-of-type(${sibIndex + 1})`);
                                } else {
                                    stack.unshift(nodeName);
                                }
                                el = el.parentNode;
                            }
                            return stack.join(' > ');
                        };

                        const selector = getDomPath(e.target);
                        console.log('Computed selector:', selector);

                        window.parent.postMessage({ type: 'SELECTOR_RESPONSE', selector }, '*');
                        document.body.style.cursor = 'default';
                    });
                }
            });
        </script>
        """

        # Replace </body> with the injected JavaScript
        rendered_html = driver.page_source.replace("</body>", f"{injected_script}</body>")


        # Inject the script into the rendered HTML
        modified_html = rendered_html.replace("</body>", f"{injected_script}</body>")

        driver.quit()
        return Response(modified_html, content_type="text/html")

    except Exception as e:
        logging.error(f"Error proxying request: {e}")
        return str(e), 500


@app.route('/scrape', methods=['POST'])
def scrape():
    data = request.get_json()
    url = data.get('url')

    selector = data.get('selector')

    if not url or not selector:
        return jsonify({"error": "URL or selector is missing"}), 400

    try:
        # Configure Selenium WebDriver
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in headless mode
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        driver = webdriver.Chrome(options=chrome_options)

        # Load the page
        driver.get(url)
        driver.implicitly_wait(10)  # Wait for the element to load

                # Wait for the document.readyState to be 'complete'
        WebDriverWait(driver, 30).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        logging.info("Page fully loaded.")

        # Wait for a specific element that indicates full content has loaded
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "body"))  # Adjust selector if needed
        )
        logging.info("Page content loaded successfully.")

        # Find elements matching the selector
        elements = driver.find_elements(By.CSS_SELECTOR, selector)
        results = [el.text for el in elements]

        driver.quit()
        return jsonify(results)

    except Exception as e:
        logging.error(f"Scrape error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
