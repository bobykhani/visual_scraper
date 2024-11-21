from playwright.sync_api import sync_playwright

def scrape_page(url, selector):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)
        elements = page.query_selector_all(selector)
        data = [el.text_content() for el in elements]
        browser.close()
        return data

url = "https://example.com"
selector = "h1"
print(scrape_page(url, selector))
