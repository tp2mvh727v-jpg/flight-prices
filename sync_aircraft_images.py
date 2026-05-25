#!/usr/bin/env python3
"""
Auto-generate AIRCRAFT_IMAGES mapping from static/images/aircraft/ filesystem.
Run after build_fleet_library.py completes.
"""
import os, json, re

BASE = os.path.join(os.path.dirname(__file__), 'static', 'images', 'aircraft')
TARGET = os.path.join(os.path.dirname(__file__), 'static', 'js', 'flight-profile.js')
MANIFEST = os.path.join(os.path.dirname(__file__), 'static', 'images', 'aircraft', 'manifest.json')

def scan_images():
    """Scan filesystem and return {model: {airline: [filenames]}}"""
    result = {}
    total = 0
    if not os.path.exists(BASE):
        return result
    
    for model in sorted(os.listdir(BASE)):
        mp = os.path.join(BASE, model)
        if model.startswith('.') or not os.path.isdir(mp):
            continue
        model_data = {}
        for airline in sorted(os.listdir(mp)):
            ap = os.path.join(mp, airline)
            if airline.startswith('.') or not os.path.isdir(ap):
                continue
            images = sorted([f for f in os.listdir(ap) 
                           if not f.startswith('.') and os.path.isfile(os.path.join(ap, f))])
            if images:
                model_data[airline] = images
                total += 1
        if model_data:
            result[model] = model_data
    
    result['_total'] = total
    return result

def escape_js_string(s):
    """Escape single quotes and backslashes for JS string literals."""
    return s.replace('\\', '\\\\').replace("'", "\\'")

def generate_js(mapping):
    """Generate compact JS object literal from mapping dict."""
    lines = []
    lines.append('const AIRCRAFT_IMAGES = {')
    
    total = mapping.pop('_total', 0)
    comment = f'  // Auto-generated from static/images/aircraft/ — {total} model×airline combos'
    lines.append(comment)
    
    for model in sorted(mapping.keys()):
        airlines = mapping[model]
        lines.append(f"  '{model}': {{")
        for airline in sorted(airlines.keys()):
            files = airlines[airline]
            # Escape single quotes in filenames
            escaped = [f"'{escape_js_string(f)}'" for f in files]
            lines.append(f"    '{airline}': [{', '.join(escaped)}],")
        lines.append('  },')
    
    lines.append('};')
    return '\n'.join(lines) + '\n'

def patch_flight_profile(new_js):
    """Replace AIRCRAFT_IMAGES section in flight-profile.js."""
    with open(TARGET, 'r') as f:
        content = f.read()
    
    # Find the AIRCRAFT_IMAGES block
    start_marker = 'const AIRCRAFT_IMAGES = {'
    end_marker = '};'
    
    start_idx = content.find(start_marker)
    if start_idx == -1:
        print("ERROR: Could not find AIRCRAFT_IMAGES in flight-profile.js")
        return False
    
    # Find the matching closing brace
    brace_count = 0
    in_block = False
    end_idx = start_idx
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            brace_count += 1
            in_block = True
        elif content[i] == '}':
            brace_count -= 1
            if in_block and brace_count == 0:
                end_idx = i + 1
                break
    
    # Replace
    new_content = content[:start_idx] + new_js + content[end_idx:]
    
    with open(TARGET, 'w') as f:
        f.write(new_content)
    
    print(f"Patched {TARGET}: replaced AIRCRAFT_IMAGES block")
    return True

if __name__ == '__main__':
    mapping = scan_images()
    total = mapping.get('_total', 0)
    print(f"Scanned {BASE}")
    print(f"Found {total} model×airline combos across {len(mapping)} aircraft types")
    
    # Save manifest JSON
    with open(MANIFEST, 'w') as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False)
    print(f"Saved manifest to {MANIFEST}")
    
    # Generate and patch JS
    js = generate_js(mapping)
    if patch_flight_profile(js):
        print("Done! AIRCRAFT_IMAGES updated.")
    else:
        print("Failed to patch flight-profile.js")
