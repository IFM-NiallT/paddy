import os
import json

def rename_category_images(directory, json_file):
    """
    Renames image files using category descriptions from JSON data.
    Can handle both:
    - Adding ID to files that only have description
    - Renaming existing ID files to proper format
    """
    # Load JSON data
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    # Create mappings
    description_to_id = {
        category['Description'].lower().replace(' ', '_'): str(category['ID'])
        for category in data['Data']
    }
    
    id_to_description = {
        str(category['ID']): category['Description'].lower().replace(' ', '_')
        for category in data['Data']
    }
    
    # List all files in directory
    files = os.listdir(directory)
    
    # Filter for jpg files
    jpg_files = [f for f in files if f.endswith('.jpg')]
    
    for filename in jpg_files:
        # Skip the default image
        if filename == '404_default.jpg':
            continue
            
        # Remove .jpg extension for processing
        name_without_ext = filename[:-4]
        
        if '_' in name_without_ext:
            # File already has an ID or description part
            current_id = name_without_ext.split('_')[0]
            if current_id in id_to_description:
                # Has correct ID, just needs proper format
                new_name = f"{current_id}_{id_to_description[current_id]}.jpg"
            else:
                # Might be description only, try to find matching ID
                desc_part = name_without_ext.lower()
                if desc_part in description_to_id:
                    category_id = description_to_id[desc_part]
                    new_name = f"{category_id}_{desc_part}.jpg"
                else:
                    print(f"No matching category found for: {filename}")
                    continue
        else:
            # Try to match with description mapping
            name_to_check = name_without_ext.lower()
            if name_to_check in description_to_id:
                category_id = description_to_id[name_to_check]
                new_name = f"{category_id}_{name_to_check}.jpg"
            else:
                print(f"No matching category found for: {filename}")
                continue
        
        # Full paths
        old_path = os.path.join(directory, filename)
        new_path = os.path.join(directory, new_name)
        
        try:
            # Rename the file
            if filename != new_name:  # Only rename if name is different
                os.rename(old_path, new_path)
                print(f"Renamed: {filename} -> {new_name}")
            else:
                print(f"File already in correct format: {filename}")
        except Exception as e:
            print(f"Error renaming {filename}: {str(e)}")

# Set correct paths
directory_path = "static/img/categories"
json_file_path = "json/categories.json"

# Confirmation prompt
print(f"This will rename all .jpg files in {directory_path} using data from {json_file_path}")
print("Files will be renamed to 'ID_category_description.jpg' format")
confirmation = input("Do you want to continue? (yes/no): ")

if confirmation.lower() == 'yes':
    rename_category_images(directory_path, json_file_path)
    print("Renaming complete!")
else:
    print("Operation cancelled")