import os
import json
from typing import Dict, Tuple, Set

def load_category_mappings(json_file: str) -> list:
    """
    Loads category data from JSON file.
    """
    with open(json_file, 'r') as f:
        data = json.load(f)
    return data.get('Data', [])

def get_image_files(directory: str) -> list[str]:
    """
    Gets all image files from directory.
    """
    files = os.listdir(directory)
    return [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]

def create_category_mappings(categories: list) -> Tuple[Dict[str, str], Dict[str, str], Dict[str, str]]:
    """
    Creates mappings for both ID to description and description to ID.
    """
    id_to_desc = {}  # Maps ID to proper description format
    desc_to_id = {}  # Maps description variations to ID
    raw_desc_to_id = {}  # Maps raw descriptions to ID
    
    for category in categories:
        category_id = str(category['ID'])
        desc = category['Description'].lower().replace(' ', '_')
        raw_desc = category['Description']
        
        # Store the proper format mapping
        id_to_desc[category_id] = desc
        
        # Store various description formats that might be in filenames
        desc_variations = [
            desc,  # normal_format
            desc.replace('_', ''),  # nounderscores
            desc.replace('.', ''),  # nodots
            desc.replace('_', '').replace('.', ''),  # clean
            raw_desc.lower().replace(' ', '_'),  # raw_with_underscores
            raw_desc.lower().replace(' ', ''),  # raw_no_spaces
        ]
        
        for variation in desc_variations:
            desc_to_id[variation] = category_id
            
        # Store raw description mapping
        raw_desc_to_id[raw_desc] = category_id
    
    return id_to_desc, desc_to_id, raw_desc_to_id

def get_file_details(filename: str) -> Tuple[str, str]:
    """
    Gets the name without extension and the extension.
    """
    name_without_ext = os.path.splitext(filename)[0]
    extension = os.path.splitext(filename)[1].lower()
    return name_without_ext, extension

def rename_category_images(directory: str, json_file: str) -> None:
    """
    Renames image files to match template format.
    Handles both ID-only and description-only files.
    """
    try:
        # Load categories and create mappings
        categories = load_category_mappings(json_file)
        id_to_desc, desc_to_id, raw_desc_to_id = create_category_mappings(categories)
        
        # Get all image files
        image_files = get_image_files(directory)
        
        # Track changes
        renamed_count = 0
        skipped_count = 0
        error_count = 0
        processed_files = set()
        
        # Process each file
        for filename in image_files:
            if filename.startswith('404_default'):
                print(f"Skipping default image: {filename}")
                processed_files.add(filename)
                skipped_count += 1
                continue
                
            name_without_ext, extension = get_file_details(filename)
            new_filename = None
            
            # Try to match by ID first
            if name_without_ext in id_to_desc:
                # File has just an ID
                new_filename = f"{name_without_ext}_{id_to_desc[name_without_ext]}.jpg"
            else:
                # Try to match by description
                # First, try with the name as is
                name_lower = name_without_ext.lower()
                if name_lower in desc_to_id:
                    category_id = desc_to_id[name_lower]
                    new_filename = f"{category_id}_{id_to_desc[category_id]}.jpg"
                else:
                    # Try additional variations
                    name_clean = ''.join(c.lower() for c in name_without_ext if c.isalnum())
                    for desc in desc_to_id:
                        desc_clean = ''.join(c for c in desc if c.isalnum())
                        if name_clean == desc_clean:
                            category_id = desc_to_id[desc]
                            new_filename = f"{category_id}_{id_to_desc[category_id]}.jpg"
                            break
            
            if new_filename:
                processed_files.add(filename)
                if filename != new_filename:
                    try:
                        old_path = os.path.join(directory, filename)
                        new_path = os.path.join(directory, new_filename)
                        os.rename(old_path, new_path)
                        print(f"Renamed: {filename} -> {new_filename}")
                        renamed_count += 1
                    except Exception as e:
                        print(f"Error renaming {filename}: {str(e)}")
                        error_count += 1
                else:
                    print(f"File already in correct format: {filename}")
                    skipped_count += 1
        
        # Check for unprocessed files
        unprocessed = set(image_files) - processed_files
        if unprocessed:
            print("\nUnprocessed files:")
            for file in sorted(unprocessed):
                print(f"- {file}")
        
        # Print summary
        print("\nRename Summary:")
        print(f"Successfully renamed: {renamed_count}")
        print(f"Skipped (no changes needed): {skipped_count}")
        print(f"Errors encountered: {error_count}")
        print(f"Unprocessed files: {len(unprocessed)}")
                
    except Exception as e:
        print(f"An error occurred: {str(e)}")

def main():
    # Set correct paths
    directory_path = "static/img/categories"
    json_file_path = "static/json/categories.json"

    # Confirmation prompt
    print(f"This will rename image files in {directory_path}")
    print(f"using data from {json_file_path}")
    print("Files will be renamed to match the Flask template format:")
    print("  <ID>_<description_lowercase_with_underscores>.jpg")
    print("\nThe script will handle these formats:")
    print("  - ID only (e.g., 21487729612688.jpg)")
    print("  - Description only (e.g., adaptor_kits.jpg)")
    print("  - Mixed format (e.g., 21487721498616_hyd._hose.jpg)")
    
    confirmation = input("\nDo you want to continue? (yes/no): ")

    if confirmation.lower() in ('yes', 'y'):
        rename_category_images(directory_path, json_file_path)
    else:
        print("Operation cancelled")

if __name__ == "__main__":
    main()