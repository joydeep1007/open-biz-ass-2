import asyncio
import json
import os
from playwright.async_api import async_playwright
import time

class RealCredentialsScraper:
    def __init__(self):
        self.url = "https://udyamregistration.gov.in/UdyamRegistration.aspx"
        self.aadhaar_number = "539146184333"
        self.name = "Joydeep De"
        self.scraped_data = {
            "url": self.url,
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "steps": []
        }
    
    async def extract_field_data(self, page, element):
        """Extract comprehensive field data from an element"""
        try:
            field_data = {}
            
            # Basic attributes
            field_data['tag'] = await element.evaluate('el => el.tagName.toLowerCase()')
            field_data['type'] = await element.get_attribute('type') or ''
            field_data['name'] = await element.get_attribute('name') or ''
            field_data['id'] = await element.get_attribute('id') or ''
            field_data['class'] = await element.get_attribute('class') or ''
            field_data['placeholder'] = await element.get_attribute('placeholder') or ''
            field_data['maxlength'] = await element.get_attribute('maxlength') or ''
            field_data['minlength'] = await element.get_attribute('minlength') or ''
            field_data['required'] = await element.get_attribute('required') is not None
            field_data['pattern'] = await element.get_attribute('pattern') or ''
            field_data['value'] = await element.get_attribute('value') or ''
            field_data['title'] = await element.get_attribute('title') or ''
            field_data['autocomplete'] = await element.get_attribute('autocomplete') or ''
            
            # Additional validation attributes
            field_data['min'] = await element.get_attribute('min') or ''
            field_data['max'] = await element.get_attribute('max') or ''
            field_data['step'] = await element.get_attribute('step') or ''
            
            # ARIA attributes
            field_data['aria_label'] = await element.get_attribute('aria-label') or ''
            field_data['aria_required'] = await element.get_attribute('aria-required') or ''
            field_data['aria_describedby'] = await element.get_attribute('aria-describedby') or ''
            field_data['aria_invalid'] = await element.get_attribute('aria-invalid') or ''
            
            # Get associated label
            field_data['label'] = await self.get_comprehensive_label(page, element, field_data['id'])
            
            # For select elements, get options
            if field_data['tag'] == 'select':
                field_data['options'] = await self.get_select_options(element)
            
            # Check if element is visible and enabled
            field_data['visible'] = await element.is_visible()
            field_data['enabled'] = await element.is_enabled()
            field_data['readonly'] = await element.get_attribute('readonly') is not None
            
            # Extract validation patterns
            field_data['validation_rules'] = await self.extract_validation_patterns(page, field_data['id'], field_data['name'])
            
            return field_data
            
        except Exception as e:
            print(f"Error extracting field data: {e}")
            return None
    
    async def get_comprehensive_label(self, page, element, element_id):
        """Get label using multiple strategies"""
        try:
            # Strategy 1: Direct label with 'for' attribute
            if element_id:
                label = await page.query_selector(f'label[for="{element_id}"]')
                if label:
                    text = await label.inner_text()
                    if text.strip():
                        return text.strip()
            
            # Strategy 2: Parent label
            parent_label = await element.query_selector('xpath=ancestor::label[1]')
            if parent_label:
                text = await parent_label.inner_text()
                if text.strip():
                    return text.strip()
            
            # Strategy 3: Look for text in surrounding elements
            label_text = await element.evaluate('''
                el => {
                    // Look in parent containers for label text
                    let parent = el.parentElement;
                    let attempts = 0;
                    
                    while (parent && attempts < 5) {
                        // Get all text content and split by common separators
                        const textContent = parent.textContent || '';
                        const lines = textContent.split(/[\\n\\r]+/).map(line => line.trim()).filter(line => line);
                        
                        for (let line of lines) {
                            // Skip if it's just the element's own value or common words
                            if (line && line.length > 3 && line.length < 200 && 
                                !line.includes('ctl00') && 
                                !line.includes('javascript') &&
                                !line.includes('function') &&
                                line !== el.value &&
                                line !== el.placeholder) {
                                
                                // Check if it looks like a label
                                if (line.includes('Number') || line.includes('Name') || 
                                    line.includes('Type') || line.includes('PAN') ||
                                    line.includes('DOB') || line.includes('Organisation') ||
                                    line.includes('Entrepreneur') || line.includes('Holder') ||
                                    line.includes(':') || line.includes('*') ||
                                    /^\\d+\\./.test(line) || line.includes('आधार') ||
                                    line.includes('उद्यमी') || line.includes('संगठन')) {
                                    return line;
                                }
                            }
                        }
                        
                        parent = parent.parentElement;
                        attempts++;
                    }
                    
                    return '';
                }
            ''')
            
            return label_text.strip() if label_text else ''
            
        except Exception as e:
            print(f"Error getting comprehensive label: {e}")
            return ''
    
    async def get_select_options(self, select_element):
        """Extract options from select element"""
        try:
            options = []
            option_elements = await select_element.query_selector_all('option')
            
            for option in option_elements:
                option_data = {
                    'value': await option.get_attribute('value') or '',
                    'text': await option.inner_text(),
                    'selected': await option.get_attribute('selected') is not None
                }
                options.append(option_data)
            
            return options
            
        except Exception as e:
            print(f"Error getting select options: {e}")
            return []
    
    async def extract_validation_patterns(self, page, element_id, element_name):
        """Extract validation patterns from the page"""
        try:
            validation_rules = {}
            
            # Look for ASP.NET validators
            if element_id:
                validators = await page.query_selector_all(f'span[controltovalidate="{element_id}"]')
                for validator in validators:
                    validator_id = await validator.get_attribute('id') or ''
                    error_message = await validator.get_attribute('errormessage') or ''
                    
                    if 'RequiredField' in validator_id:
                        validation_rules['required'] = error_message or 'Required field'
                    elif 'RegularExpression' in validator_id:
                        pattern = await validator.get_attribute('validationexpression') or ''
                        validation_rules['pattern'] = pattern
                        validation_rules['pattern_message'] = error_message
                    elif 'Range' in validator_id:
                        min_val = await validator.get_attribute('minimumvalue') or ''
                        max_val = await validator.get_attribute('maximumvalue') or ''
                        validation_rules['range'] = f"{min_val}-{max_val}"
            
            return validation_rules
            
        except Exception as e:
            print(f"Error extracting validation patterns: {e}")
            return {}
    
    async def scrape_all_visible_fields(self, page, step_id, step_title):
        """Scrape all visible form fields comprehensively"""
        print(f"\n{'='*60}")
        print(f"SCRAPING STEP {step_id}: {step_title}")
        print(f"{'='*60}")
        
        fields = []
        
        # Get all form elements
        form_elements = await page.query_selector_all('input, select, textarea, button')
        visible_elements = []
        
        # Filter visible elements
        for element in form_elements:
            try:
                if await element.is_visible():
                    element_type = await element.get_attribute('type') or ''
                    if element_type != 'hidden':
                        visible_elements.append(element)
            except:
                continue
        
        print(f"Total visible form elements found: {len(visible_elements)}")
        print(f"{'No.':<4} {'Tag':<8} {'Type':<12} {'Name':<35} {'Label':<40}")
        print("-" * 100)
        
        for i, element in enumerate(visible_elements):
            try:
                element_id = await element.get_attribute('id') or ''
                element_name = await element.get_attribute('name') or ''
                element_type = await element.get_attribute('type') or ''
                element_tag = await element.evaluate('el => el.tagName.toLowerCase()')
                
                # Skip accessibility widgets
                skip_terms = ['uwaw', 'accessibility', 'widget', 'speak', 'cursor', 'invert', 'reset']
                if any(skip_term in element_id.lower() or skip_term in element_name.lower() 
                       for skip_term in skip_terms):
                    continue
                
                field_data = await self.extract_field_data(page, element)
                if field_data:
                    fields.append(field_data)
                    
                    # Clean display names
                    display_name = field_data['name'].replace('ctl00$ContentPlaceHolder1$', '') if field_data['name'] else 'N/A'
                    display_label = field_data['label'][:38] + '...' if len(field_data['label']) > 38 else field_data['label']
                    
                    print(f"{len(fields):<4} {field_data['tag']:<8} {field_data['type']:<12} {display_name:<35} {display_label:<40}")
            
            except Exception as e:
                print(f"Error processing element {i}: {e}")
                continue
        
        print("-" * 100)
        print(f"Total fields captured: {len(fields)}")
        
        step_data = {
            "id": step_id,
            "title": step_title,
            "fields": fields,
            "field_count": len(fields)
        }
        
        return step_data
    
    async def fill_aadhaar_form(self, page):
        """Fill the Aadhaar form with real credentials"""
        try:
            print(f"\n🔄 Filling Aadhaar form with your credentials...")
            
            # Fill Aadhaar number
            aadhaar_input = await page.query_selector('#ctl00_ContentPlaceHolder1_txtadharno')
            if aadhaar_input and await aadhaar_input.is_visible():
                await aadhaar_input.fill('')  # Clear first
                await aadhaar_input.fill(self.aadhaar_number)
                print(f"✅ Filled Aadhaar number: {self.aadhaar_number}")
                await page.wait_for_timeout(1000)
            else:
                print("❌ Aadhaar input field not found")
                return False
            
            # Fill name
            name_input = await page.query_selector('#ctl00_ContentPlaceHolder1_txtownername')
            if name_input and await name_input.is_visible():
                await name_input.fill('')  # Clear first
                await name_input.fill(self.name)
                print(f"✅ Filled name: {self.name}")
                await page.wait_for_timeout(1000)
            else:
                print("❌ Name input field not found")
                return False
            
            # Check declaration checkbox
            checkbox = await page.query_selector('#ctl00_ContentPlaceHolder1_chkDecarationA')
            if checkbox and await checkbox.is_visible():
                await checkbox.check()
                print("✅ Checked declaration checkbox")
                await page.wait_for_timeout(1000)
            else:
                print("❌ Declaration checkbox not found")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Error filling Aadhaar form: {e}")
            return False
    
    async def request_otp(self, page):
        """Click the OTP request button"""
        try:
            print(f"\n🔄 Requesting OTP...")
            
            # Find and click OTP button
            otp_button = await page.query_selector('#ctl00_ContentPlaceHolder1_btnValidateAadhaar')
            if otp_button and await otp_button.is_visible() and await otp_button.is_enabled():
                await otp_button.click()
                print("✅ Clicked 'Validate & Generate OTP' button")
                await page.wait_for_timeout(3000)
                return True
            else:
                print("❌ OTP button not found or not clickable")
                return False
            
        except Exception as e:
            print(f"❌ Error requesting OTP: {e}")
            return False
    
    async def wait_for_manual_otp_entry(self, page):
        """Wait for user to manually enter OTP and proceed"""
        try:
            print(f"\n{'='*60}")
            print("⏳ WAITING FOR MANUAL OTP ENTRY")
            print(f"{'='*60}")
            print("📱 Please check your mobile phone for the OTP")
            print("✋ Enter the OTP in the browser window")
            print("🔄 The script will automatically detect when you proceed to the next page")
            print("⏰ Waiting up to 5 minutes for OTP verification...")
            print(f"{'='*60}")
            
            # Wait for page content to change (indicating successful OTP verification)
            start_time = time.time()
            timeout = 300  # 5 minutes
            
            initial_content = await page.evaluate('document.body.innerText')
            
            while time.time() - start_time < timeout:
                await page.wait_for_timeout(2000)  # Check every 2 seconds
                
                current_content = await page.evaluate('document.body.innerText')
                current_url = page.url
                
                # Check if content changed significantly (indicating navigation to next step)
                if ('PAN Verification' in current_content or 
                    'Type of Organisation' in current_content or
                    'successfully verified' in current_content.lower() or
                    len(current_content) != len(initial_content)):
                    
                    print("✅ Page content changed - OTP verification appears successful!")
                    print(f"Current URL: {current_url}")
                    return True
                
                # Show progress
                elapsed = int(time.time() - start_time)
                remaining = timeout - elapsed
                if elapsed % 30 == 0:  # Show progress every 30 seconds
                    print(f"⏳ Still waiting... {remaining} seconds remaining")
            
            print("⏰ Timeout reached - proceeding with current page state")
            return False
            
        except Exception as e:
            print(f"❌ Error waiting for OTP: {e}")
            return False
    
    async def scrape_website(self):
        """Main scraping function with real credentials and manual OTP"""
        async with async_playwright() as p:
            # Launch browser in non-headless mode so user can interact
            browser = await p.chromium.launch(
                headless=False, 
                slow_mo=500,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--start-maximized'
                ]
            )
            
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080}
            )
            
            page = await context.new_page()
            
            try:
                print(f"🌐 Navigating to {self.url}")
                await page.goto(self.url, wait_until='domcontentloaded', timeout=60000)
                await page.wait_for_timeout(5000)
                
                # Step 1: Scrape initial Aadhaar verification page
                step1_data = await self.scrape_all_visible_fields(page, 1, "Initial Aadhaar Verification Page")
                if step1_data:
                    self.scraped_data["steps"].append(step1_data)
                
                # Step 2: Fill form with real credentials
                form_filled = await self.fill_aadhaar_form(page)
                if not form_filled:
                    print("❌ Failed to fill Aadhaar form")
                    return
                
                # Step 3: Request OTP
                otp_requested = await self.request_otp(page)
                if not otp_requested:
                    print("❌ Failed to request OTP")
                    return
                
                # Step 4: Wait for manual OTP entry
                otp_verified = await self.wait_for_manual_otp_entry(page)
                
                # Step 5: Scrape the page after OTP verification (should be PAN verification page)
                await page.wait_for_timeout(3000)
                
                if otp_verified:
                    step2_data = await self.scrape_all_visible_fields(page, 2, "PAN Verification & Business Details Page")
                else:
                    step2_data = await self.scrape_all_visible_fields(page, 2, "Post-OTP Page State")
                
                if step2_data:
                    self.scraped_data["steps"].append(step2_data)
                
                # Take final screenshot
                await page.screenshot(path='scraped/real_credentials_final.png', full_page=True)
                print(f"\n📸 Screenshot saved to scraped/real_credentials_final.png")
                
                print(f"\n🎉 Scraping completed successfully!")
                print(f"📊 Total steps captured: {len(self.scraped_data['steps'])}")
                
            except Exception as e:
                print(f"❌ Error during scraping: {e}")
                import traceback
                traceback.print_exc()
            
            finally:
                print(f"\n⏳ Keeping browser open for 10 seconds for final review...")
                await page.wait_for_timeout(10000)
                await browser.close()
    
    def save_to_json(self):
        """Save scraped data to JSON file"""
        try:
            os.makedirs('scraped', exist_ok=True)
            
            output_file = os.path.join('scraped', 'real_credentials_schema.json')
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(self.scraped_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n💾 Data saved to {output_file}")
            
            # Create detailed report
            self.create_detailed_report()
            
        except Exception as e:
            print(f"❌ Error saving to JSON: {e}")
    
    def create_detailed_report(self):
        """Create a comprehensive report"""
        try:
            report_file = os.path.join('scraped', 'real_credentials_report.md')
            
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write("# Real Credentials Udyam Registration Scraping Report\n\n")
                f.write(f"**URL:** {self.scraped_data['url']}\n")
                f.write(f"**Scraped at:** {self.scraped_data['scraped_at']}\n")
                f.write(f"**Aadhaar Used:** {self.aadhaar_number}\n")
                f.write(f"**Name Used:** {self.name}\n")
                f.write(f"**Total Steps:** {len(self.scraped_data['steps'])}\n\n")
                
                total_fields = 0
                for step in self.scraped_data['steps']:
                    f.write(f"## Step {step['id']}: {step['title']}\n\n")
                    f.write(f"**Fields Found:** {step['field_count']}\n\n")
                    total_fields += step['field_count']
                    
                    if step['fields']:
                        f.write("### Detailed Field Information\n\n")
                        f.write("| # | Field Name | Type | Label | Placeholder | Max Length | Validation |\n")
                        f.write("|---|------------|------|-------|-------------|------------|------------|\n")
                        
                        for i, field in enumerate(step['fields'], 1):
                            name = field['name'].replace('ctl00$ContentPlaceHolder1$', '') if field['name'] else 'N/A'
                            field_type = field['type'] or field['tag']
                            label = field['label'][:30] + '...' if len(field['label']) > 30 else field['label']
                            placeholder = field['placeholder'][:20] + '...' if len(field['placeholder']) > 20 else field['placeholder']
                            maxlength = field['maxlength'] or 'N/A'
                            validation = ', '.join([k for k in field.get('validation_rules', {}).keys()]) or 'None'
                            
                            f.write(f"| {i} | {name} | {field_type} | {label} | {placeholder} | {maxlength} | {validation} |\n")
                        
                        # Add select options
                        select_fields = [f for f in step['fields'] if f['tag'] == 'select' and f.get('options')]
                        if select_fields:
                            f.write("\n### Dropdown/Select Options\n\n")
                            for field in select_fields:
                                f.write(f"**{field['label'] or field['name']}:**\n")
                                for option in field['options']:
                                    f.write(f"- `{option['value']}`: {option['text']}\n")
                                f.write("\n")
                    
                    f.write("\n")
                
                f.write(f"## Summary\n\n")
                f.write(f"- **Total Fields Captured:** {total_fields}\n")
                f.write(f"- **Steps Successfully Scraped:** {len(self.scraped_data['steps'])}\n")
                
                if len(self.scraped_data['steps']) >= 2:
                    f.write("- ✅ **Successfully reached PAN verification page**\n")
                else:
                    f.write("- ⚠ **Only initial page captured - OTP verification may have failed**\n")
                
                f.write("\n### Field Distribution by Type\n\n")
                field_types = {}
                for step in self.scraped_data['steps']:
                    for field in step['fields']:
                        ftype = field['type'] or field['tag']
                        field_types[ftype] = field_types.get(ftype, 0) + 1
                
                for ftype, count in sorted(field_types.items()):
                    f.write(f"- **{ftype}**: {count}\n")
            
            print(f"📋 Detailed report saved to {report_file}")
            
        except Exception as e:
            print(f"❌ Error creating report: {e}")

async def main():
    print("🚀 Starting Real Credentials Udyam Registration Scraper")
    print("=" * 60)
    print("This scraper will:")
    print("1. Navigate to the Udyam Registration website")
    print("2. Fill your Aadhaar number and name automatically")
    print("3. Request OTP")
    print("4. Wait for you to manually enter the OTP")
    print("5. Continue scraping after OTP verification")
    print("=" * 60)
    
    scraper = RealCredentialsScraper()
    await scraper.scrape_website()
    scraper.save_to_json()

if __name__ == "__main__":
    asyncio.run(main())