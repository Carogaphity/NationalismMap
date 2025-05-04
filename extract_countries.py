import csv
import xml.etree.ElementTree as ET

def extract_svg_data(svg_file_path, csv_output_path):
    # Define default values
    defaults = {
        'stage': 'Unknown',
        'popularity': 'Low',
        'volatility': 'Low',
        'position': 'Center'
    }

    # Open CSV for writing
    with open(csv_output_path, mode='w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['id', 'country', 'stage', 'popularity', 'volatility', 'position']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        # Use iterparse to efficiently process large files
        for event, elem in ET.iterparse(svg_file_path, events=("start",)):
            if elem.tag.endswith('path'):
                country_id = elem.attrib.get('id')
                country_name = elem.attrib.get('title')

                if country_id and country_name:
                    row = {
                        'id': country_id,
                        'country': country_name,
                        **defaults
                    }
                    writer.writerow(row)
            # Prevent memory bloat
            elem.clear()

# Example usage
extract_svg_data('proj/assets/content/world.svg', 'proj/assets/content/countries.csv')
