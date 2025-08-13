# Udyam Registration Form Scraper

This project contains Python scripts using Playwright to scrape the Udyam Registration website form fields, validation patterns, and structure.

## Features

- **Comprehensive Field Extraction**: Captures all input fields, labels, types, attributes (name, id, type, maxlength, required, pattern, placeholder, aria attributes)
- **Dynamic Content Handling**: Simulates user interactions to reveal OTP fields and other dynamic elements
- **Validation Pattern Detection**: Extracts validation rules and regex patterns from form elements
- **Multi-Step Navigation**: Attempts to navigate through different steps of the form
- **Structured Output**: Saves data in JSON format with detailed field information
- **Summary Reports**: Generates human-readable markdown reports

## Setup

1. **Create and activate virtual environment**:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   playwright install
   ```

## Usage

### Basic Scraper
```bash
python udyam_scraper.py
```

### Enhanced Scraper (Recommended)
```bash
python enhanced_udyam_scraper.py
```

## Output Files

The scrapers create a `scraped/` folder with the following files:

- **`schema.json`** / **`enhanced_schema.json`**: Complete JSON structure with all field data
- **`scraping_report.md`**: Human-readable summary report

## JSON Schema Structure

```json
{
  "url": "https://udyamregistration.gov.in/UdyamRegistration.aspx",
  "scraped_at": "2025-08-12 21:47:08",
  "steps": [
    {
      "id": 1,
      "title": "Step Title",
      "fields": [
        {
          "tag": "input",
          "type": "text",
          "name": "field_name",
          "id": "field_id",
          "class": "css_classes",
          "placeholder": "placeholder_text",
          "maxlength": "12",
          "required": false,
          "pattern": "regex_pattern",
          "label": "Associated Label",
          "validation_info": {},
          "visible": true,
          "enabled": true,
          "options": []  // For select elements
        }
      ],
      "field_count": 4
    }
  ]
}
```

## Field Attributes Captured

- **Basic Attributes**: tag, type, name, id, class, placeholder, maxlength, minlength, required, pattern, value, title, autocomplete
- **Validation Attributes**: min, max, step, validation_info
- **ARIA Attributes**: aria-label, aria-required, aria-describedby, aria-invalid
- **State Information**: visible, enabled, readonly
- **Associated Data**: label, options (for select elements)

## Key Features

### 1. Dynamic Content Handling
- Fills form fields with test data to trigger dynamic elements
- Clicks OTP buttons to reveal additional fields
- Waits for AJAX responses and dynamic content loading

### 2. Validation Pattern Extraction
- Captures HTML5 validation patterns
- Extracts ASP.NET validator information
- Identifies custom validation rules from JavaScript

### 3. Multi-Step Navigation
- Attempts to navigate through form steps
- Handles different navigation patterns (buttons, links, tabs)
- Captures fields from multiple form pages

### 4. Comprehensive Reporting
- JSON output for programmatic use
- Markdown reports for human review
- Field statistics and distribution analysis

## Throttling and Safety

- Built-in delays between actions to avoid being blocked
- Realistic browser user-agent and viewport settings
- Error handling with meaningful debug output
- Non-headless mode for transparency and debugging

## Troubleshooting

1. **No fields found**: The website might have anti-bot protection or require specific user interactions
2. **Timeout errors**: Increase wait times in the script or check internet connection
3. **Browser issues**: Ensure Playwright browsers are properly installed with `playwright install`

## Notes

- The scraper uses dummy data (like test Aadhaar numbers) for form interactions
- Some dynamic content may require real OTP verification which the scraper cannot complete
- The website structure may change over time, requiring script updates
- Always respect the website's robots.txt and terms of service

## Files

- `udyam_scraper.py`: Basic scraper implementation
- `enhanced_udyam_scraper.py`: Advanced scraper with better error handling and reporting
- `requirements.txt`: Python dependencies
- `scraped/`: Output directory for JSON and report files