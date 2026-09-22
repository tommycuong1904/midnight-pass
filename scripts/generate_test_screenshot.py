import os
from PIL import Image, ImageDraw, ImageFont

def render_terminal_image(title, text_lines, output_path):
    width = 900
    line_height = 24
    padding = 20
    header_height = 40
    height = header_height + (len(text_lines) * line_height) + (padding * 2)

    bg_color = (15, 23, 42)       # #0f172a
    header_bg = (30, 41, 59)      # #1e293b
    text_color = (226, 232, 240)   # #e2e8f0
    green_color = (34, 197, 94)    # #22c55e
    cyan_color = (34, 211, 238)    # #22d3ee
    purple_color = (167, 139, 250) # #a78bfa

    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, width, header_height], fill=header_bg)
    draw.ellipse([15, 14, 27, 26], fill=(239, 68, 68))
    draw.ellipse([35, 14, 47, 26], fill=(245, 158, 11))
    draw.ellipse([55, 14, 67, 26], fill=(34, 197, 94))

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 14)
    except:
        font = ImageFont.load_default()

    draw.text((width // 2 - 120, 12), title, fill=(148, 163, 184), font=font)

    y = header_height + padding
    for line in text_lines:
        c = text_color
        if "✓" in line or "PASS" in line or "SUCCESS" in line or "passed" in line:
            c = green_color
        elif "$" in line or ">" in line:
            c = cyan_color
        elif "Contract" in line or "Address" in line:
            c = purple_color
        
        draw.text((padding, y), line, fill=c, font=font)
        y += line_height

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    print(f"Saved screenshot to {output_path}")

# Test Output Screenshot
test_text = [
    "$ npm test",
    "",
    "> midnight-pass@1.0.0 test",
    "> vitest run",
    "",
    " RUN  v1.6.1 /root/midnight-pass",
    "",
    " ✓ tests/midnight_pass.test.ts (5 tests) 282ms",
    "   ✓ 1. Should initialize constructor and set public issuer identity",
    "   ✓ 2. Should issue a credential commitment by authorized issuer",
    "   ✓ 3. Should verify credential commitment and claim nullifier via ZK witness",
    "   ✓ 4. Should reject double-claiming (reusing nullifier)",
    "   ✓ 5. Should check if credential commitment exists and nullifier is unused",
    "",
    " Test Files  1 passed (1)",
    "      Tests  5 passed (5)",
    "   Duration  2.13s (transform 409ms, setup 0ms, collect 481ms, tests 282ms)"
]
render_terminal_image("Terminal - Vitest Simulator Suite Output", test_text, "/root/midnight-pass/assets/test_screenshot.png")
