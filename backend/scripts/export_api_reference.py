import os
import sys
import json

# Ensure backend root is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app

def export_api_reference():
    openapi_schema = app.openapi()
    
    docs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "docs"))
    os.makedirs(docs_dir, exist_ok=True)

    json_file = os.path.join(docs_dir, "api-reference.json")
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)

    # Render clean human-readable Markdown reference table grouped by tags
    md_file = os.path.join(docs_dir, "API_REFERENCE.md")
    
    paths = openapi_schema.get("paths", {})

    sections = {
        "Auth": [],
        "Lost Items": [],
        "Found Items": [],
        "Match": [],
        "Admin Panel": [],
        "General": []
    }

    for path, methods in paths.items():
        for method, details in methods.items():
            method_str = method.upper()
            tags = details.get("tags", ["General"])
            tag_name = tags[0] if tags else "General"
            summary = details.get("summary") or details.get("description") or "No description"
            
            # Auth required check
            security = details.get("security", [])
            auth_required = "YES (Admin)" if "Admin" in tag_name else ("YES" if security or "current_user" in str(details) else "NO")

            entry = {
                "method": method_str,
                "path": path,
                "auth": auth_required,
                "description": summary.split("\n")[0]
            }

            if "Auth" in tag_name:
                sections["Auth"].append(entry)
            elif "Lost" in tag_name:
                sections["Lost Items"].append(entry)
            elif "Found" in tag_name:
                sections["Found Items"].append(entry)
            elif "Match" in tag_name:
                sections["Match"].append(entry)
            elif "Admin" in tag_name:
                sections["Admin Panel"].append(entry)
            else:
                sections["General"].append(entry)

    with open(md_file, "w", encoding="utf-8") as f:
        f.write("# 📚 FoundIt Full REST API Reference\n\n")
        f.write("> Auto-generated OpenAPI reference documentation for the FoundIt FastAPI backend.\n\n")

        for sec_name, entries in sections.items():
            if not entries:
                continue
            f.write(f"## {sec_name}\n\n")
            f.write("| Method | Endpoint Path | Auth Required | Description |\n")
            f.write("| :--- | :--- | :---: | :--- |\n")
            for e in entries:
                f.write(f"| `{e['method']}` | `{e['path']}` | {e['auth']} | {e['description']} |\n")
            f.write("\n")

    print(f"✓ Exported OpenAPI JSON schema to: {json_file}")
    print(f"✓ Rendered API Reference Markdown table to: {md_file}")

if __name__ == "__main__":
    export_api_reference()
