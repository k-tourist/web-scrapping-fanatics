import os
import json
import asyncio
import random
import string
import csv
from flask import Flask, request, send_from_directory, jsonify
from playwright.async_api import async_playwright

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Helper Functions
def random_string(length=10):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def csv_to_list(csv_file):
    data = []
    with open(csv_file, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        data = [row for row in reader]
    return data

def list_to_csv(data, filename):
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(data)

# Route Handlers
@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

@app.route('/sites', methods=['GET'])
def get_sites():
    return send_from_directory('.', 'sites.json')

@app.route('/results.csv', methods=['GET'])
def get_results():
    return send_from_directory('.', 'results.csv')

@app.route('/save', methods=['POST'])
def save_json():
    data = request.json
    with open('sites.json', 'w') as f:
        json.dump(data, f)
    return "saved"

@app.route('/savecsv', methods=['POST'])
def save_csv():
    data = request.json
    list_to_csv(data, 'results.csv')
    return "saved"

@app.route('/upload', methods=['POST'])
def upload_csv():
    file = request.files['csv']
    filename = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filename)
    return jsonify(csv_to_list(filename))

async def scrape_page(url):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until="domcontentloaded")
        screenshot_path = f'public/screenshots/{random_string()}.png'
        await page.screenshot(path=screenshot_path)
        await browser.close()
    return screenshot_path

@app.route('/api', methods=['POST'])
def api_scrape():
    data = request.json
    url = data.get('url')
    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400
    
    screenshot_path = asyncio.run(scrape_page(url))
    return jsonify({"status": "success", "image": screenshot_path})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
