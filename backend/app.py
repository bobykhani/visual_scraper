from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import logging
from fake_useragent import UserAgent
from playwright.sync_api import sync_playwright
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})  # Adjust CORS as needed

logging.basicConfig(level=logging.INFO)

@app.route('/')
def home():
    return "Welcome to the Visual Web Scraper API!"

@app.route('/proxy', methods=['GET'])
def proxy():
    url = request.args.get('url')
    tool = request.args.get('tool', 'selenium')  # Default to Selenium

    if not url:
        return "URL parameter is missing", 400

    try:
        if tool == "selenium":
            # Use Selenium to fetch the page
            chrome_options = Options()
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--headless")  # Run in headless mode
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")

            driver = webdriver.Chrome(options=chrome_options)
            driver.get(url)

            # Get the page source
            injected_script = f"""
                                <script>
                                window.addEventListener('message', function(event) {{
                                    if (event.data.action === 'initiateSelection') {{
                                    const selectorType = event.data.selectorType;

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

                                        let selector = '';
                                        if (selectorType === 'CSS_SELECTOR') {{
                                        selector = e.target.tagName.toLowerCase();
                                        if (e.target.id) {{
                                            selector += '#' + e.target.id;
                                        }}
                                        if (e.target.className) {{
                                            selector += '.' + e.target.className.split(' ').join('.');
                                        }}
                                        }} else if (selectorType === 'XPATH') {{
                                        const getXPath = (el) => {{
                                            if (el.id) {{
                                            return `//*[@id='${{el.id}}']`;
                                            }}
                                            if (el === document.body) {{
                                            return '/html/body';
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
                                        selector = getXPath(e.target);
                                        }}

                                        window.parent.postMessage(
                                        {{
                                            type: 'SELECTOR_RESPONSE',
                                            selector,
                                            selectorType
                                        }},
                                        '*'
                                        );

                                        document.body.style.cursor = 'default';
                                        document.removeEventListener('mouseover', null);
                                        document.removeEventListener('mouseout', null);
                                        document.removeEventListener('click', null);
                                    }});
                                    }}
                                }});
                                </script>
                                """
            rendered_html = driver.page_source.replace("</body>", f"{injected_script}</body>")

            driver.quit()

        elif tool == "playwright":
            # Use Playwright to fetch the page
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(url)
                # Get the page source
                injected_script = f"""
                                <script>
                                window.addEventListener('message', function(event) {{
                                    if (event.data.action === 'initiateSelection') {{
                                    const selectorType = event.data.selectorType;

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

                                        let selector = '';
                                        if (selectorType === 'CSS_SELECTOR') {{
                                        selector = e.target.tagName.toLowerCase();
                                        if (e.target.id) {{
                                            selector += '#' + e.target.id;
                                        }}
                                        if (e.target.className) {{
                                            selector += '.' + e.target.className.split(' ').join('.');
                                        }}
                                        }} else if (selectorType === 'XPATH') {{
                                        const getXPath = (el) => {{
                                            if (el.id) {{
                                            return `//*[@id='${{el.id}}']`;
                                            }}
                                            if (el === document.body) {{
                                            return '/html/body';
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
                                        selector = getXPath(e.target);
                                        }}

                                        window.parent.postMessage(
                                        {{
                                            type: 'SELECTOR_RESPONSE',
                                            selector,
                                            selectorType
                                        }},
                                        '*'
                                        );

                                        document.body.style.cursor = 'default';
                                        document.removeEventListener('mouseover', null);
                                        document.removeEventListener('mouseout', null);
                                        document.removeEventListener('click', null);
                                    }});
                                    }}
                                }});
                                </script>
                                """
                rendered_html = driver.page_source.replace("</body>", f"{injected_script}</body>")
                browser.close()

        elif tool == "beautifulsoup":
            # Use BeautifulSoup to fetch the page
            response = requests.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            # Get the page source
            injected_script = f"""
                                <script>
                                window.addEventListener('message', function(event) {{
                                    if (event.data.action === 'initiateSelection') {{
                                    const selectorType = event.data.selectorType;

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

                                        let selector = '';
                                        if (selectorType === 'CSS_SELECTOR') {{
                                        selector = e.target.tagName.toLowerCase();
                                        if (e.target.id) {{
                                            selector += '#' + e.target.id;
                                        }}
                                        if (e.target.className) {{
                                            selector += '.' + e.target.className.split(' ').join('.');
                                        }}
                                        }} else if (selectorType === 'XPATH') {{
                                        const getXPath = (el) => {{
                                            if (el.id) {{
                                            return `//*[@id='${{el.id}}']`;
                                            }}
                                            if (el === document.body) {{
                                            return '/html/body';
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
                                        selector = getXPath(e.target);
                                        }}

                                        window.parent.postMessage(
                                        {{
                                            type: 'SELECTOR_RESPONSE',
                                            selector,
                                            selectorType
                                        }},
                                        '*'
                                        );

                                        document.body.style.cursor = 'default';
                                        document.removeEventListener('mouseover', null);
                                        document.removeEventListener('mouseout', null);
                                        document.removeEventListener('click', null);
                                    }});
                                    }}
                                }});
                                </script>
                                """
            # rendered_html = soup.prettify()
            rendered_html = soup.prettify().replace("</body>", f"{injected_script}</body>")

        elif tool == "httpx":
            # Use HTTPX to fetch the page
            import httpx
            with httpx.Client() as client:
                response = client.get(url)
                response.raise_for_status()
                rendered_html = response.text

        elif tool == "requests_html":
            # Use Requests-HTML to fetch the page
            from requests_html import HTMLSession
            session = HTMLSession()
            response = session.get(url)
            response.html.render()  # Render JavaScript
            # Get the page source
            injected_script = f"""
                                <script>
                                window.addEventListener('message', function(event) {{
                                    if (event.data.action === 'initiateSelection') {{
                                    const selectorType = event.data.selectorType;

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

                                        let selector = '';
                                        if (selectorType === 'CSS_SELECTOR') {{
                                        selector = e.target.tagName.toLowerCase();
                                        if (e.target.id) {{
                                            selector += '#' + e.target.id;
                                        }}
                                        if (e.target.className) {{
                                            selector += '.' + e.target.className.split(' ').join('.');
                                        }}
                                        }} else if (selectorType === 'XPATH') {{
                                        const getXPath = (el) => {{
                                            if (el.id) {{
                                            return `//*[@id='${{el.id}}']`;
                                            }}
                                            if (el === document.body) {{
                                            return '/html/body';
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
                                        selector = getXPath(e.target);
                                        }}

                                        window.parent.postMessage(
                                        {{
                                            type: 'SELECTOR_RESPONSE',
                                            selector,
                                            selectorType
                                        }},
                                        '*'
                                        );

                                        document.body.style.cursor = 'default';
                                        document.removeEventListener('mouseover', null);
                                        document.removeEventListener('mouseout', null);
                                        document.removeEventListener('click', null);
                                    }});
                                    }}
                                }});
                                </script>
                                """
            rendered_html = response.html.html.replace("</body>", f"{injected_script}</body>")
        elif tool == "scrapy":
            # Use Scrapy to fetch the page (simplified example)
            from scrapy.http import HtmlResponse
            response = requests.get(url)
            response.raise_for_status()
            # Get the page source
            injected_script = f"""
                                <script>
                                window.addEventListener('message', function(event) {{
                                    if (event.data.action === 'initiateSelection') {{
                                    const selectorType = event.data.selectorType;

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

                                        let selector = '';
                                        if (selectorType === 'CSS_SELECTOR') {{
                                        selector = e.target.tagName.toLowerCase();
                                        if (e.target.id) {{
                                            selector += '#' + e.target.id;
                                        }}
                                        if (e.target.className) {{
                                            selector += '.' + e.target.className.split(' ').join('.');
                                        }}
                                        }} else if (selectorType === 'XPATH') {{
                                        const getXPath = (el) => {{
                                            if (el.id) {{
                                            return `//*[@id='${{el.id}}']`;
                                            }}
                                            if (el === document.body) {{
                                            return '/html/body';
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
                                        selector = getXPath(e.target);
                                        }}

                                        window.parent.postMessage(
                                        {{
                                            type: 'SELECTOR_RESPONSE',
                                            selector,
                                            selectorType
                                        }},
                                        '*'
                                        );

                                        document.body.style.cursor = 'default';
                                        document.removeEventListener('mouseover', null);
                                        document.removeEventListener('mouseout', null);
                                        document.removeEventListener('click', null);
                                    }});
                                    }}
                                }});
                                </script>
                                """
            rendered_html = HtmlResponse(url=url, body=response.content).body.decode()("</body>", f"{injected_script}</body>")

        else:
            return "Invalid tool selected", 400

        return Response(rendered_html, content_type="text/html")

    except Exception as e:
        logging.error(f"Error fetching page with {tool}: {e}")
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
